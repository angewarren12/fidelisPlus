<?php
/**
 * Test complet direct (sans HTTP) : Prospect Fidelis Plus → Odoo
 *
 * Teste :
 * 1. Création d'un prospect + correspondant en base (via les modèles directement)
 * 2. Push synchrone vers Odoo (OdooClient::syncCompany)
 * 3. Vérification du partenaire dans Odoo (by-ref)
 * 4. Vérification des champs : email, RCCM, commercial, correspondant
 * 5. Résumé des ambiguïtés trouvées
 */

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->bootstrap();

use App\Models\Company;
use App\Models\User;
use App\Services\Odoo\OdooClient;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

$sep  = str_repeat('─', 68);
$ok   = '  ✅ ';
$fail = '  ❌ ';
$warn = '  ⚠️  ';
$info = '  ℹ️  ';

$results = [];   // Tableau final des vérifications

echo "\n{$sep}\n";
echo "  TEST SYNCHRONISATION PROSPECT/CLIENT  Fidelis Plus ↔ Odoo\n";
echo "  Date : " . now()->format('Y-m-d H:i:s') . "\n";
echo "{$sep}\n\n";

$odooBase  = config('services.odoo.outbound_base_url');
$odooToken = config('services.odoo.outbound_token');

echo "📡 Odoo Base URL : {$odooBase}\n";
echo "🔑 Token (10 car.) : " . substr($odooToken, 0, 10) . "...\n\n";

// ─────────────────────────────────────────────────────────
// 0. Nettoyage
// ─────────────────────────────────────────────────────────
$testEmail        = 'test.syncprospect@fidelis-test.ci';
$testContactEmail = 'correspondant.syncprospect@fidelis-test.ci';

Company::withTrashed()->where('email', $testEmail)->forceDelete();
User::where('email', $testContactEmail)->delete();
echo $info . "Nettoyage des enregistrements précédents OK.\n\n";

// ─────────────────────────────────────────────────────────
// 1. Récupérer un commercial existant
// ─────────────────────────────────────────────────────────
$commercial = User::whereIn('role', ['commercial', 'admin_commercial'])->first();
if (!$commercial) {
    echo $fail . "Aucun commercial trouvé en base. Abandon.\n";
    exit(1);
}
echo $info . "Commercial sélectionné : {$commercial->first_name} {$commercial->last_name} <{$commercial->email}> (role: {$commercial->role})\n\n";

// ─────────────────────────────────────────────────────────
// 2. Créer le prospect + correspondant directement en base
// ─────────────────────────────────────────────────────────
echo "{$sep}\n[1] Création du prospect + correspondant en base locale\n{$sep}\n";

$company = null;
$contact = null;

try {
    DB::transaction(function () use (&$company, &$contact, $commercial, $testEmail, $testContactEmail) {
        $company = Company::create([
            'type'                  => 'prospect',
            'name'                  => 'CIERIA TEST SYNC SA',
            'category'              => 'entreprise',
            'rccm'                  => 'CI-ABJ-2024-B-12345',
            'sector'                => 'Technologie',
            'address'               => '01 BP 1234 Abidjan Plateau',
            'city'                  => 'Abidjan',
            'phone'                 => '+225 27 20 10 20 30',
            'email'                 => $testEmail,
            'temperature'           => 'chaud',
            'lead_source'           => 'prospection',
            'estimated_potential'   => 5000000,
            'company_type'          => 'flotte',
            'commercial_id'         => $commercial->id,
            'kanban_stage'          => 'nouveau_lead',
        ]);

        $contact = User::create([
            'company_id'        => $company->id,
            'role'              => 'client',
            'first_name'        => 'Mamadou',
            'last_name'         => 'DIALLO',
            'email'             => $testContactEmail,
            'phone'             => '+225 07 00 11 22 33',
            'position'          => 'Directeur Général',
            'password'          => Hash::make(Str::random(40)),
            'is_main_contact'   => true,
            'must_change_password' => true,
        ]);
    });

    echo $ok . "Prospect créé : ID #{$company->id} — {$company->name}\n";
    echo $ok . "Correspondant créé : {$contact->first_name} {$contact->last_name} <{$contact->email}>\n";
    $results['prospect_created'] = true;
    $results['contact_created']  = true;
} catch (\Throwable $e) {
    echo $fail . "Erreur lors de la création : " . $e->getMessage() . "\n";
    exit(1);
}

// ─────────────────────────────────────────────────────────
// 3. Push vers Odoo (syncCompany)
// ─────────────────────────────────────────────────────────
echo "\n{$sep}\n[2] Push vers Odoo (OdooClient::syncCompany)\n{$sep}\n";

$odooClient = app(OdooClient::class);
$company->load('contacts', 'commercial');

echo $info . "Payload qui sera envoyé à Odoo :\n";
echo "    name            : {$company->name}\n";
echo "    external_ref    : fidelis-company-{$company->id}\n";
echo "    email (contact) : {$contact->email}\n";
echo "    phone           : {$company->phone}\n";
echo "    vat/rccm        : {$company->rccm}\n";
echo "    is_company      : " . ($company->category === 'entreprise' ? 'true' : 'false') . "\n";
echo "    category        : {$company->category}\n";
echo "    contact_name    : {$contact->first_name} {$contact->last_name}\n";
echo "    commercial_email: " . ($company->commercial?->email ?? 'null') . "\n\n";

$odooResult = $odooClient->syncCompany($company, 'prospect_created');

if ($odooResult === null) {
    echo $fail . "syncCompany → null (Odoo a refusé la requête).\n";
    $results['push_odoo'] = false;
    // Lire les logs pour trouver la cause
    $logLines = file(storage_path('logs/laravel.log'));
    $lastLines = array_slice($logLines, -5);
    echo $warn . "Dernières lignes du log Laravel :\n";
    foreach ($lastLines as $line) {
        echo "    " . trim($line) . "\n";
    }
} else {
    $odooPartnerId = $result['odoo_partner_id'] ?? ($odooResult['odoo_partner_id'] ?? 0);
    if ($odooPartnerId > 0) {
        $company->odoo_partner_id  = $odooPartnerId;
        $company->odoo_sync_status = 'synced';
        $company->odoo_synced_at   = now();
        $company->save();
        echo $ok . "Push Odoo réussi ! odoo_partner_id = {$odooPartnerId}\n";
        $results['push_odoo'] = true;
    } else {
        echo $warn . "Push retourné mais odoo_partner_id = 0 (vérifier by-ref).\n";
        $results['push_odoo'] = false;
    }
}

// ─────────────────────────────────────────────────────────
// 4. Vérification dans Odoo par external_ref
// ─────────────────────────────────────────────────────────
echo "\n{$sep}\n[3] Vérification dans Odoo (GET /partners/by-ref)\n{$sep}\n";

$ref = 'fidelis-company-' . $company->id;
$odooResp = Http::withHeaders(['X-API-Key' => $odooToken, 'Accept' => 'application/json'])
    ->get("{$odooBase}/api/sale_odoo/v1/partners/by-ref/{$ref}");

echo "  GET /partners/by-ref/{$ref} → HTTP " . $odooResp->status() . "\n\n";

$partner = null;
if ($odooResp->successful() && ($odooResp->json()['success'] ?? false)) {
    $partner = $odooResp->json()['data'] ?? [];
    echo $ok . "Partenaire trouvé dans Odoo (id={$partner['id']}) !\n";
    $results['found_in_odoo'] = true;

    $checks = [
        'Nom'             => [$partner['name'] ?? '', $company->name],
        'Email'           => [$partner['email'] ?? '', $contact->email],
        'Téléphone'       => [$partner['phone'] ?? '', $company->phone],
        'VAT/RCCM'        => [$partner['vat'] ?? '', $company->rccm],
        'Is Company'      => [$partner['is_company'] ? 'true' : 'false', 'true'],
        'External Ref'    => [$partner['external_ref'] ?? '', $ref],
        'Commercial'      => [$partner['user_email'] ?? '', $commercial->email],
    ];

    echo "\n  Vérification champ par champ :\n";
    echo "  " . str_repeat('·', 60) . "\n";
    printf("  %-18s %-28s %-28s\n", "CHAMP", "ODOO", "FIDELIS");
    echo "  " . str_repeat('·', 60) . "\n";
    foreach ($checks as $label => [$odooVal, $expectedVal]) {
        $icon = ($odooVal === $expectedVal) ? '✅' : (empty($odooVal) ? '⚠️ ' : '❌');
        printf("  %s %-16s %-28s %-28s\n", $icon, $label, mb_substr((string)$odooVal, 0, 27), mb_substr((string)$expectedVal, 0, 27));
        $results["field_{$label}"] = ($odooVal === $expectedVal);
    }
    echo "\n";

    // Champs présents dans la réponse Odoo
    echo $info . "Tous les champs retournés par Odoo :\n";
    foreach ($partner as $k => $v) {
        $v = is_bool($v) ? ($v ? 'true' : 'false') : (string) $v;
        printf("    %-30s : %s\n", $k, $v);
    }
} else {
    echo $fail . "Partenaire introuvable dans Odoo.\n";
    echo "  Réponse : " . mb_substr($odooResp->body(), 0, 300) . "\n";
    $results['found_in_odoo'] = false;
}

// ─────────────────────────────────────────────────────────
// 5. Vérifier le correspondant en base Fidelis
// ─────────────────────────────────────────────────────────
echo "\n{$sep}\n[4] Vérification correspondant (base Fidelis Plus)\n{$sep}\n";

$company->refresh();
$mainContact = $company->contacts()->where('is_main_contact', true)->first();

if ($mainContact) {
    echo $ok . "Correspondant principal présent en base :\n";
    echo "    first_name     : {$mainContact->first_name}\n";
    echo "    last_name      : {$mainContact->last_name}\n";
    echo "    email          : {$mainContact->email}\n";
    echo "    phone          : {$mainContact->phone}\n";
    echo "    is_main_contact: " . ($mainContact->is_main_contact ? 'true' : 'false') . "\n";
    echo "    role           : {$mainContact->role}\n";
    $results['contact_in_db'] = true;
} else {
    echo $fail . "Aucun correspondant principal en base.\n";
    $results['contact_in_db'] = false;
}

// ─────────────────────────────────────────────────────────
// 6. Test conversion Prospect → Client
// ─────────────────────────────────────────────────────────
echo "\n{$sep}\n[5] Test push événement 'converted_to_client'\n{$sep}\n";

$company->update(['type' => 'client', 'converted_at' => now()]);
$convResult = $odooClient->syncCompany($company->fresh(), 'converted_to_client');

if ($convResult !== null) {
    echo $ok . "Événement 'converted_to_client' envoyé avec succès.\n";
    $results['converted_to_client'] = true;
} else {
    echo $fail . "Événement 'converted_to_client' a échoué (null retourné).\n";
    $results['converted_to_client'] = false;
}

// ─────────────────────────────────────────────────────────
// 7. RÉSUMÉ FINAL
// ─────────────────────────────────────────────────────────
echo "\n{$sep}\n  RÉSUMÉ FINAL\n{$sep}\n";

$passed = 0;
$failed = 0;
$warned = 0;

$summary = [
    'prospect_created'      => ['label' => 'Création prospect en base Fidelis'],
    'contact_created'       => ['label' => 'Création correspondant en base Fidelis'],
    'push_odoo'             => ['label' => 'Push vers Odoo (POST /partners)'],
    'found_in_odoo'         => ['label' => 'Partenaire retrouvé dans Odoo (by-ref)'],
    'contact_in_db'         => ['label' => 'Correspondant persisté en base'],
    'converted_to_client'   => ['label' => 'Événement conversion vers client'],
    'field_Nom'             => ['label' => 'Champ : nom synchronisé'],
    'field_Email'           => ['label' => 'Champ : email contact synchronisé'],
    'field_VAT/RCCM'        => ['label' => 'Champ : RCCM synchronisé'],
    'field_Is Company'      => ['label' => 'Champ : is_company (entreprise)'],
    'field_External Ref'    => ['label' => 'Champ : external_ref (anti-doublon)'],
    'field_Commercial'      => ['label' => 'Champ : commercial_email résolu dans Odoo'],
];

foreach ($summary as $key => $info2) {
    $val = $results[$key] ?? null;
    if ($val === true) {
        echo $ok . $info2['label'] . "\n";
        $passed++;
    } elseif ($val === false) {
        echo $fail . $info2['label'] . "\n";
        $failed++;
    } else {
        echo $warn . $info2['label'] . " (non testé)\n";
        $warned++;
    }
}

echo "\n";
echo "  Résultat : {$passed} ✅  |  {$failed} ❌  |  {$warned} ⚠️ \n\n";

if ($failed > 0) {
    echo "  🔴 Des problèmes ont été détectés — voir les détails ci-dessus.\n";
    echo "  Points d'action prioritaires :\n";
    if (!($results['push_odoo'] ?? false)) {
        echo "    → Vérifier les droits du compte API Odoo (groupe Ventes/Administrateur)\n";
    }
    if (!($results['field_Commercial'] ?? false)) {
        echo "    → L'email du commercial Fidelis n'existe pas comme user Odoo\n";
    }
    if (!($results['found_in_odoo'] ?? false)) {
        echo "    → Le push a échoué, le partenaire n'existe pas dans Odoo\n";
    }
} else {
    echo "  🟢 Synchronisation Prospect/Client opérationnelle.\n";
}

echo "\n{$sep}\n✅ Test terminé.\n{$sep}\n\n";
