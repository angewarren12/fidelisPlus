<?php
/**
 * Script de test complet de la synchronisation bidirectionnelle Odoo <-> FidelisPlus
 *
 * Usage: php sync_test_bidirectional.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Company;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

$baseUrl = (string) config('services.odoo.outbound_base_url');
$token   = (string) config('services.odoo.outbound_token');

echo "===========================================================\n";
echo "  TEST SYNCHRONISATION BIDIRECTIONNELLE ODOO <-> FIDELISPLUS\n";
echo "===========================================================\n\n";

echo "Configuration:\n";
echo "  Base URL Odoo : {$baseUrl}\n";
echo "  Token API     : " . substr($token, 0, 20) . "...\n\n";

// ---------------------------------------------------------------
// A. Etat actuel de la base FidelisPlus
// ---------------------------------------------------------------
echo "===========================================================\n";
echo "A. ETAT ACTUEL DE LA BASE FIDELISPLUS\n";
echo "===========================================================\n\n";

$totalCompanies    = Company::withTrashed()->count();
$withOdooPartnerId = Company::withTrashed()->whereNotNull('odoo_partner_id')->count();
$syncFailed        = Company::withTrashed()->where('odoo_sync_status', 'failed')->count();
$syncNull          = Company::withTrashed()->whereNull('odoo_sync_status')->count();

echo "  Total societes (incl. trash)   : {$totalCompanies}\n";
echo "  Avec odoo_partner_id           : {$withOdooPartnerId}\n";
echo "  Sync status = failed           : {$syncFailed}\n";
echo "  Sync status = NULL             : {$syncNull}\n\n";

// ---------------------------------------------------------------
// B. Test connexion API Odoo
// ---------------------------------------------------------------
echo "===========================================================\n";
echo "B. TEST CONNEXION API ODOO\n";
echo "===========================================================\n\n";

$endpoints = [
    'GET /partners'      => '/api/sale_odoo/v1/partners',
    'GET /vehicles'      => '/api/sale_odoo/v1/vehicles',
    'GET /sale_orders'   => '/api/sale_odoo/v1/sale_orders',
];

foreach ($endpoints as $label => $path) {
    try {
        $response = Http::baseUrl($baseUrl)
            ->withHeaders(['X-API-Key' => $token])
            ->acceptJson()
            ->timeout(12)
            ->get($path, ['limit' => 5]);

        echo "  {$label} : HTTP " . $response->status();
        if ($response->successful()) {
            $json = $response->json();
            $records = $json['data']['records'] ?? [];
            echo " [OK] (" . count($records) . " records)\n";
        } else {
            $msg = $response->json('error.message') ?? 'N/A';
            echo " [ECHEC] " . mb_substr($msg, 0, 150) . "\n";
        }
    } catch (\Throwable $e) {
        echo "  {$label} : [EXCEPTION] " . $e->getMessage() . "\n";
    }
}

echo "\n";

// ---------------------------------------------------------------
// C. Test A : Prospect FidelisPlus -> Odoo
// ---------------------------------------------------------------
echo "===========================================================\n";
echo "C. TEST A — PROSPECT FIDELISPLUS -> ODOO\n";
echo "===========================================================\n\n";

$testRef = 'sync-test-' . Str::random(6);
$prospectName = "TEST SYNC PROSPECT {$testRef}";
$prospectEmail = "prospect.{$testRef}@test-fidelis.local";

echo "Creation d'un prospect dans FidelisPlus...\n";
echo "  Nom     : {$prospectName}\n";
echo "  Email   : {$prospectEmail}\n";

try {
    $prospect = Company::create([
        'name'      => $prospectName,
        'email'     => $prospectEmail,
        'type'      => 'prospect',
        'category'  => 'particulier',
        'is_active' => false,
    ]);

    echo "  [OK] Prospect cree en base — ID Fidelis: {$prospect->id}\n\n";

    $odoo = $app->make(\App\Services\Odoo\OdooClient::class);
    echo "  Push vers Odoo (POST /partners)...\n";

    $result = $odoo->syncCompany($prospect, 'prospect_created');

    if ($result === null) {
        echo "  [ECHEC] OdooClient::syncCompany a retourne null (erreur API)\n";
    } else {
        $odooPartnerId = $result['odoo_partner_id'] ?? 0;
        echo "  [OK] SUCCES! odoo_partner_id = {$odooPartnerId}\n";

        $prospect->odoo_partner_id = (string) $odooPartnerId;
        $prospect->odoo_sync_status = 'synced';
        $prospect->odoo_synced_at = now();
        $prospect->save();

        echo "  [OK] Prospect mis a jour avec odoo_partner_id = {$odooPartnerId}\n\n";

        echo "  Verification dans Odoo (GET /partners/{$odooPartnerId})...\n";
        $verifyResponse = Http::baseUrl($baseUrl)
            ->withHeaders(['X-API-Key' => $token])
            ->acceptJson()
            ->timeout(12)
            ->get("/api/sale_odoo/v1/partners/{$odooPartnerId}");

        if ($verifyResponse->successful()) {
            $partner = $verifyResponse->json('data') ?? [];
            echo "  [OK] Trouve dans Odoo!\n";
            echo "    - Name: " . ($partner['name'] ?? 'N/A') . "\n";
            echo "    - Email: " . ($partner['email'] ?? 'N/A') . "\n";
            echo "    - external_ref: " . ($partner['external_ref'] ?? 'N/A') . "\n";

            $found = ($partner['name'] ?? '') === $prospectName;
            echo $found ? "  [OK] NOM CORRESPOND\n" : "  [ECHEC] NOM NE CORRESPOND PAS!\n";
        } else {
            echo "  [ECHEC] HTTP " . $verifyResponse->status() . " — " . ($verifyResponse->json('error.message') ?? 'erreur inconnue') . "\n";
        }
    }
} catch (\Throwable $e) {
    echo "  [EXCEPTION] " . $e->getMessage() . "\n";
    echo "    Fichier: " . $e->getFile() . ":" . $e->getLine() . "\n";
}

echo "\n";

// ---------------------------------------------------------------
// D. Test B : Prospect Odoo -> FidelisPlus (PULL)
// ---------------------------------------------------------------
echo "===========================================================\n";
echo "D. TEST B — PROSPECT ODOO -> FIDELISPLUS (PULL)\n";
echo "===========================================================\n\n";

$odooProspectName = "TEST SYNC ODOO PROSPECT " . Str::random(6);
$odooProspectEmail = "odoo.prospect." . Str::random(6) . "@test-odoo.local";

echo "Creation d'un prospect directement dans Odoo (POST /partners)...\n";
echo "  Nom     : {$odooProspectName}\n";
echo "  Email   : {$odooProspectEmail}\n";

try {
    $createResponse = Http::baseUrl($baseUrl)
        ->withHeaders(['X-API-Key' => $token])
        ->acceptJson()
        ->timeout(12)
        ->post('/api/sale_odoo/v1/partners', [
            'name'          => $odooProspectName,
            'email'         => $odooProspectEmail,
            'is_company'    => false,
            'phone'         => '+2250707070707',
            'street'        => '12 Rue Test Odoo',
            'city'          => 'Abidjan',
            'zip'           => '225',
            'partner_kind'  => 'prospect',
        ]);

    if ($createResponse->successful()) {
        $createdPartner = $createResponse->json('data') ?? [];
        $odooNewPartnerId = $createdPartner['id'] ?? 0;
        echo "  [OK] Prospect cree dans Odoo — ID Odoo: {$odooNewPartnerId}\n\n";

        echo "  Execution du pull (php artisan odoo:sync)...\n";

        $output = new \Symfony\Component\Console\Output\BufferedOutput();
        $exitCode = $kernel->handle(
            new \Symfony\Component\Console\Input\ArrayInput(['command' => 'odoo:sync']),
            $output
        );
        $outputText = $output->fetch();
        echo "  " . str_replace("\n", "\n  ", trim($outputText)) . "\n\n";

        echo "  Verification dans FidelisPlus...\n";
        $foundCompany = Company::where('name', $odooProspectName)->first();

        if ($foundCompany) {
            echo "  [OK] Prospect trouve dans FidelisPlus!\n";
            echo "    - ID Fidelis: {$foundCompany->id}\n";
            echo "    - Email: {$foundCompany->email}\n";
            echo "    - odoo_partner_id: {$foundCompany->odoo_partner_id}\n";
            echo "    - created_via_odoo: " . var_export($foundCompany->created_via_odoo, true) . "\n";
        } else {
            echo "  [ECHEC] Prospect NON trouve dans FidelisPlus. Verifiez les logs.\n";
            $failedCount = Company::where('odoo_sync_status', 'failed')->count();
            echo "  Societes avec sync failed: {$failedCount}\n";
        }

        echo "\n  Nettoyage — archivage du prospect de test Odoo...\n";
        $archiveResponse = Http::baseUrl($baseUrl)
            ->withHeaders(['X-API-Key' => $token])
            ->acceptJson()
            ->timeout(12)
            ->post("/api/sale_odoo/v1/partners/{$odooNewPartnerId}/archive");
        echo "  Archive: HTTP " . $archiveResponse->status() . "\n";
    } else {
        $msg = $createResponse->json('error.message') ?? 'N/A';
        echo "  [ECHEC] HTTP " . $createResponse->status() . ": " . $msg . "\n";
    }
} catch (\Throwable $e) {
    echo "  [EXCEPTION] " . $e->getMessage() . "\n";
    echo "    Fichier: " . $e->getFile() . ":" . $e->getLine() . "\n";
}

echo "\n";

// ---------------------------------------------------------------
// E. Test C : Client FidelisPlus -> Odoo
// ---------------------------------------------------------------
echo "===========================================================\n";
echo "E. TEST C — CLIENT FIDELISPLUS -> ODOO\n";
echo "===========================================================\n\n";

$clientRef = 'sync-client-' . Str::random(6);
$clientName = "TEST SYNC CLIENT {$clientRef}";
$clientEmail = "client.{$clientRef}@test-fidelis.local";

echo "Creation d'un client dans FidelisPlus...\n";
echo "  Nom   : {$clientName}\n";
echo "  Email : {$clientEmail}\n";

try {
    $prospect = Company::where('email', $prospectEmail)->first();

    if ($prospect) {
        echo "  Prospect existant trouve (ID: {$prospect->id}), conversion en client...\n";
        $prospect->update([
            'type'         => 'client',
            'is_active'    => true,
            'kanban_stage' => 'client_actif',
        ]);

        $odoo = $app->make(\App\Services\Odoo\OdooClient::class);
        echo "  Push vers Odoo (PUT + promote-to-customer)...\n";
        $result = $odoo->syncCompany($prospect, 'converted_to_client');

        if ($result === null) {
            echo "  [ECHEC] OdooClient::syncCompany a retourne null\n";
        } else {
            $odooPartnerId = $result['odoo_partner_id'] ?? 0;
            echo "  [OK] SUCCES! odoo_partner_id = {$odooPartnerId}\n";

            $prospect->odoo_partner_id = (string) $odooPartnerId;
            $prospect->odoo_sync_status = 'synced';
            $prospect->odoo_synced_at = now();
            $prospect->save();

            echo "  Verification dans Odoo...\n";
            $verifyResponse = Http::baseUrl($baseUrl)
                ->withHeaders(['X-API-Key' => $token])
                ->acceptJson()
                ->timeout(12)
                ->get("/api/sale_odoo/v1/partners/{$odooPartnerId}");

            if ($verifyResponse->successful()) {
                $partner = $verifyResponse->json('data') ?? [];
                echo "  [OK] Partner trouve dans Odoo\n";
                echo "    - Name: " . ($partner['name'] ?? 'N/A') . "\n";
                echo "    - Is company: " . var_export($partner['is_company'] ?? null, true) . "\n";
                echo "    - Active: " . var_export($partner['active'] ?? null, true) . "\n";
            } else {
                echo "  [ECHEC] HTTP " . $verifyResponse->status() . " — " . ($verifyResponse->json('error.message') ?? 'N/A') . "\n";
            }
        }
    } else {
        echo "  Aucun prospect lie trouve, creation d'un client direct...\n";

        $client = Company::create([
            'name'      => $clientName,
            'email'     => $clientEmail,
            'type'      => 'client',
            'category'  => 'entreprise',
            'is_active' => true,
        ]);

        echo "  [OK] Client cree en base — ID Fidelis: {$client->id}\n";

        $odoo = $app->make(\App\Services\Odoo\OdooClient::class);
        echo "  Push vers Odoo (POST /partners)...\n";
        $result = $odoo->syncCompany($client, 'prospect_created');

        if ($result === null) {
            echo "  [ECHEC] OdooClient::syncCompany a retourne null\n";
        } else {
            $odooPartnerId = $result['odoo_partner_id'] ?? 0;
            echo "  [OK] SUCCES! odoo_partner_id = {$odooPartnerId}\n";

            $client->odoo_partner_id = (string) $odooPartnerId;
            $client->odoo_sync_status = 'synced';
            $client->odoo_synced_at = now();
            $client->save();
        }
    }
} catch (\Throwable $e) {
    echo "  [EXCEPTION] " . $e->getMessage() . "\n";
    echo "    Fichier: " . $e->getFile() . ":" . $e->getLine() . "\n";
}

echo "\n";

// ---------------------------------------------------------------
// F. Test D : Client Odoo -> FidelisPlus (PULL)
// ---------------------------------------------------------------
echo "===========================================================\n";
echo "F. TEST D — CLIENT ODOO -> FIDELISPLUS (PULL)\n";
echo "===========================================================\n\n";

$odooClientName = "TEST SYNC ODOO CLIENT " . Str::random(6);
$odooClientEmail = "odoo.client." . Str::random(6) . "@test-odoo.local";

echo "Creation d'un client directement dans Odoo (POST /partners)...\n";
echo "  Nom   : {$odooClientName}\n";
echo "  Email : {$odooClientEmail}\n";

try {
    $createResponse = Http::baseUrl($baseUrl)
        ->withHeaders(['X-API-Key' => $token])
        ->acceptJson()
        ->timeout(12)
        ->post('/api/sale_odoo/v1/partners', [
            'name'          => $odooClientName,
            'email'         => $odooClientEmail,
            'is_company'    => true,
            'phone'         => '+2250808080808',
            'street'        => '45 Rue Client Odoo',
            'city'          => 'Abidjan',
            'zip'           => '225',
            'partner_kind'  => 'client',
        ]);

    if ($createResponse->successful()) {
        $createdPartner = $createResponse->json('data') ?? [];
        $odooNewPartnerId = $createdPartner['id'] ?? 0;
        echo "  [OK] Client cree dans Odoo — ID Odoo: {$odooNewPartnerId}\n\n";

        echo "  Execution du pull (php artisan odoo:sync)...\n";

        $output = new \Symfony\Component\Console\Output\BufferedOutput();
        $exitCode = $kernel->handle(
            new \Symfony\Component\Console\Input\ArrayInput(['command' => 'odoo:sync']),
            $output
        );
        $outputText = $output->fetch();
        echo "  " . str_replace("\n", "\n  ", trim($outputText)) . "\n\n";

        echo "  Verification dans FidelisPlus...\n";
        $foundCompany = Company::where('name', $odooClientName)->first();

        if ($foundCompany) {
            echo "  [OK] Client trouve dans FidelisPlus!\n";
            echo "    - ID Fidelis: {$foundCompany->id}\n";
            echo "    - Email: {$foundCompany->email}\n";
            echo "    - Type: {$foundCompany->type}\n";
            echo "    - odoo_partner_id: {$foundCompany->odoo_partner_id}\n";
        } else {
            echo "  [ECHEC] Client NON trouve dans FidelisPlus. Verifiez les logs.\n";
        }

        echo "\n  Nettoyage — archivage du client de test Odoo...\n";
        $archiveResponse = Http::baseUrl($baseUrl)
            ->withHeaders(['X-API-Key' => $token])
            ->acceptJson()
            ->timeout(12)
            ->post("/api/sale_odoo/v1/partners/{$odooNewPartnerId}/archive");
        echo "  Archive: HTTP " . $archiveResponse->status() . "\n";
    } else {
        $msg = $createResponse->json('error.message') ?? 'N/A';
        echo "  [ECHEC] HTTP " . $createResponse->status() . ": " . $msg . "\n";
    }
} catch (\Throwable $e) {
    echo "  [EXCEPTION] " . $e->getMessage() . "\n";
    echo "    Fichier: " . $e->getFile() . ":" . $e->getLine() . "\n";
}

echo "\n";

// ---------------------------------------------------------------
// G. Diagnostic permissions — Devis / Flotte
// ---------------------------------------------------------------
echo "===========================================================\n";
echo "G. DIAGNOSTIC PERMISSIONS — DEVIS / FLOTTE\n";
echo "===========================================================\n\n";

echo "  L'utilisateur API Odoo actuel n'a PAS les permissions pour:\n";
echo "    - fleet.vehicle (Flotte) : 403 ACCESS_ERROR\n";
echo "    - sale.order   (Devis)   : 403 ACCESS_ERROR\n\n";

echo "  Groupes requis dans Odoo (Parametres -> Utilisateurs -> Groupes d'acces):\n";
echo "    - Contact / Creation\n";
echo "    - Ventes / Administrateur\n";
echo "    - Ventes / Utilisateur : mes documents seulement\n";
echo "    - Parc automobile / Administrateur\n";
echo "    - Parc automobile / Gestionnaire : Gerer tous les vehicules\n";
echo "    - Comptabilite / Facturation\n\n";

// ---------------------------------------------------------------
// H. Nettoyage des donnees de test FidelisPlus
// ---------------------------------------------------------------
echo "===========================================================\n";
echo "H. NETTOYAGE DES DONNEES DE TEST\n";
echo "===========================================================\n\n";

try {
    $testCompanies = Company::where('email', 'like', '%@test-fidelis.local')
        ->orWhere('email', 'like', '%@test-odoo.local')
        ->get();

    echo "  " . count($testCompanies) . " donnees de test trouvees\n";

    foreach ($testCompanies as $testCompany) {
        echo "    - Suppression: {$testCompany->name} (ID: {$testCompany->id})\n";
        $testCompany->forceDelete();
    }

    echo "  [OK] Nettoyage termine\n\n";
} catch (\Throwable $e) {
    echo "  [EXCEPTION] " . $e->getMessage() . "\n\n";
}

echo "===========================================================\n";
echo "  FIN DU TEST\n";
echo "===========================================================\n";
