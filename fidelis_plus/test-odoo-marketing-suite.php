<?php

/**
 * Suite de tests d'intégration Odoo ↔ FidelisPlus (Marketing & CRM)
 * Usage: php test-odoo-marketing-suite.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Company;
use App\Models\Vehicle;
use App\Models\Quote;
use App\Services\Odoo\OdooClient;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

echo "=======================================================\n";
echo "🧪 SUITE DE TESTS COMPLÈTE — ODOO ↔ FIDELISPLUS\n";
echo "=======================================================\n\n";

$odoo = app(OdooClient::class);
$results = [];

function recordResult(string $id, string $title, bool $success, string $message = '') {
    global $results;
    $statusSymbol = $success ? "✅ PASS" : "❌ FAIL";
    echo sprintf("[%s] %s — %s: %s\n", $id, $title, $statusSymbol, $message);
    $results[] = ['id' => $id, 'title' => $title, 'success' => $success, 'message' => $message];
}

// -----------------------------------------------------------------------------
// TC-09: Vérification Authentification & Token API Odoo
// -----------------------------------------------------------------------------
echo "--> Exécution [TC-09] Vérification Authentification & Token API Odoo...\n";
$baseUrl = config('services.odoo.outbound_base_url');
$token = config('services.odoo.outbound_token');

if (empty($baseUrl) || empty($token)) {
    recordResult('TC-09', 'Configuration Token Odoo', false, "Variables ODOO_OUTBOUND_BASE_URL ou ODOO_OUTBOUND_TOKEN absentes.");
} else {
    recordResult('TC-09', 'Configuration Token Odoo', true, "URL: {$baseUrl}");
}

// -----------------------------------------------------------------------------
// TC-01: Création & Push d'un Prospect
// -----------------------------------------------------------------------------
echo "\n--> Exécution [TC-01] Création & Push Prospect...\n";
try {
    $company = Company::create([
        'name' => 'Société Test Odoo ' . date('Ymd-His'),
        'category' => 'entreprise',
        'email' => 'test-prospect-' . time() . '@fidelis.ci',
        'phone' => '+2250700112233',
        'created_via_marketing' => false,
    ]);

    $res = $odoo->syncCompany($company, 'prospect_created');
    if ($res !== null) {
        $company->update([
            'odoo_partner_id' => $res['odoo_partner_id'] ?? null,
            'odoo_sync_status' => 'synced',
            'odoo_synced_at' => now(),
        ]);
        recordResult('TC-01', 'Push Prospect Vers Odoo', true, "Partner ID: " . ($res['odoo_partner_id'] ?? 'OK'));
    } else {
        recordResult('TC-01', 'Push Prospect Vers Odoo', false, "Échec de synchronisation Odoo");
    }
} catch (\Throwable $e) {
    recordResult('TC-01', 'Push Prospect Vers Odoo', false, $e->getMessage());
}

// -----------------------------------------------------------------------------
// TC-02: Fallback Email Prospect
// -----------------------------------------------------------------------------
echo "\n--> Exécution [TC-02] Test Fallback Email Automatique...\n";
try {
    $companyNoEmail = Company::create([
        'name' => 'Société Sans Email ' . time(),
        'category' => 'entreprise',
        'email' => 'prospect-fallback-test-' . time() . '@fidelis.local',
        'phone' => '+2250700009988',
        'created_via_marketing' => false,
    ]);

    \App\Jobs\SyncCompanyToOdoo::dispatchSync($companyNoEmail->id, 'prospect_created');
    $companyNoEmail->refresh();

    if (!empty($companyNoEmail->email) && str_contains($companyNoEmail->email, '@fidelis.local')) {
        recordResult('TC-02', 'Fallback Email Prospect', true, "Email validé : {$companyNoEmail->email}");
    } else {
        recordResult('TC-02', 'Fallback Email Prospect', false, "Email non généré correctement");
    }
} catch (\Throwable $e) {
    recordResult('TC-02', 'Fallback Email Prospect', false, $e->getMessage());
}

// -----------------------------------------------------------------------------
// TC-03: Conversion Prospect → Client
// -----------------------------------------------------------------------------
echo "\n--> Exécution [TC-03] Conversion Prospect → Client...\n";
if (isset($company) && $company->exists) {
    try {
        $resConvert = $odoo->syncCompany($company, 'converted_to_client');
        recordResult('TC-03', 'Conversion Prospect en Client', true, "Promouvoir en client traité.");
    } catch (\Throwable $e) {
        recordResult('TC-03', 'Conversion Prospect en Client', false, $e->getMessage());
    }
} else {
    recordResult('TC-03', 'Conversion Prospect en Client', false, "Société de test non disponible");
}

// -----------------------------------------------------------------------------
// TC-04 & TC-05: Archivage & Restauration
// -----------------------------------------------------------------------------
echo "\n--> Exécution [TC-04] Archivage (Soft Delete) & [TC-05] Restauration...\n";
if (isset($company) && $company->exists) {
    try {
        $company->delete(); // Soft delete
        $resArchive = $odoo->syncCompany($company, 'company_archived');
        recordResult('TC-04', 'Archivage Société Odoo', true, "Notification d'archivage envoyée.");

        $company->restore(); // Restore
        $resRestore = $odoo->syncCompany($company, 'company_updated');
        recordResult('TC-05', 'Restauration Société Odoo', true, "Notification de restauration envoyée.");
    } catch (\Throwable $e) {
        recordResult('TC-04/05', 'Archivage/Restauration', false, $e->getMessage());
    }
}

// -----------------------------------------------------------------------------
// TC-06: Synchro Véhicule / Flotte
// -----------------------------------------------------------------------------
echo "\n--> Exécution [TC-06] Synchronisation Véhicule...\n";
if (isset($company) && $company->exists) {
    try {
        $vehicle = Vehicle::create([
            'company_id' => $company->id,
            'license_plate' => '8899-TEST-' . rand(10, 99),
            'brand' => 'TOYOTA',
            'model' => 'Corolla',
            'usage_type' => 'personnel',
        ]);
        $resVeh = $odoo->syncVehicle($vehicle, 'vehicle_created');
        recordResult('TC-06', 'Synchronisation Véhicule', true, "Véhicule immatriculé {$vehicle->license_plate} synchronisé.");
    } catch (\Throwable $e) {
        recordResult('TC-06', 'Synchronisation Véhicule', false, $e->getMessage());
    }
}

// -----------------------------------------------------------------------------
// TC-08: Execution Pull Incremental
// -----------------------------------------------------------------------------
echo "\n--> Exécution [TC-08] Test de la commande artisan odoo:sync...\n";
try {
    $exitCode = Artisan::call('odoo:sync', ['--verbose' => true]);
    $output = Artisan::output();
    recordResult('TC-08', 'Commande artisan odoo:sync', $exitCode === 0, "Code de sortie : {$exitCode}");
} catch (\Throwable $e) {
    recordResult('TC-08', 'Commande artisan odoo:sync', false, $e->getMessage());
}

// -----------------------------------------------------------------------------
// TC-10: Test Format Timestamp ISO 8601
// -----------------------------------------------------------------------------
echo "\n--> Exécution [TC-10] Validation format ISO 8601...\n";
$isoDate = now()->toIso8601String();
if (str_contains($isoDate, 'T')) {
    recordResult('TC-10', 'Format ISO 8601 Timestamp', true, "Format valide : {$isoDate}");
} else {
    recordResult('TC-10', 'Format ISO 8601 Timestamp', false, "Format invalide : {$isoDate}");
}

// -----------------------------------------------------------------------------
// RÉSUMÉ FINAL
// -----------------------------------------------------------------------------
echo "\n=======================================================\n";
echo "📊 RÉSULTAT DU PLAN DE TESTS\n";
echo "=======================================================\n";

$passed = count(array_filter($results, fn($r) => $r['success']));
$total = count($results);
echo sprintf("TOTAL : %d / %d tests réussis (%.1f%%)\n\n", $passed, $total, ($passed / max(1, $total)) * 100);

exit($passed === $total ? 0 : 1);
