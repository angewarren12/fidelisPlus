#!/usr/bin/env php
<?php
/**
 * Script de diagnostic de la synchronisation FidelisPlus ↔ Odoo
 * Usage: php diagnose-sync.php [command]
 */

$commands = [
    'status' => 'Vérifier le statut de la synchronisation',
    'check-auth' => 'Tester l\'authentification avec Odoo',
    'test-push' => 'Tester un envoi FidelisPlus → Odoo',
    'test-pull' => 'Tester un pull Odoo → FidelisPlus',
    'logs' => 'Afficher les logs récents de synchronisation',
];

$command = $argv[1] ?? 'status';

if (!isset($commands[$command])) {
    echo "❌ Commande inconnue: $command\n\n";
    echo "Commandes disponibles:\n";
    foreach ($commands as $cmd => $desc) {
        echo "  - $cmd: $desc\n";
    }
    exit(1);
}

require __DIR__ . '/bootstrap/app.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);

match ($command) {
    'status' => status(),
    'check-auth' => checkAuth($app),
    'test-push' => testPush($app),
    'test-pull' => testPull($app),
    'logs' => showLogs(),
};

function status()
{
    global $app;
    
    echo "═══════════════════════════════════════════════════════════\n";
    echo "STATUS DE LA SYNCHRONISATION FIDELIS ↔ ODOO\n";
    echo "═══════════════════════════════════════════════════════════\n\n";

    // Vérifier la configuration
    echo "📋 Configuration:\n";
    echo "  - Base URL Odoo: " . config('services.odoo.outbound_base_url') . "\n";
    echo "  - Token API: " . (substr(config('services.odoo.outbound_token'), 0, 20) . "...") . "\n";
    echo "  - DB Driver: " . config('database.default') . "\n\n";

    // Vérifier les derniers syncs
    echo "📊 Derniers syncs:\n";
    
    $cursors = \App\Models\OdooSyncCursor::all();
    if ($cursors->isEmpty()) {
        echo "  ⚠️  Aucun curseur trouvé (première synchronisation?)\n";
    } else {
        foreach ($cursors as $cursor) {
            $ago = $cursor->last_synced_at ? now()->diff($cursor->last_synced_at)->format('%h h %i min') : 'Jamais';
            echo "  - {$cursor->resource}: {$ago}\n";
        }
    }

    echo "\n";

    // Vérifier les jobs en queue
    echo "⏳ Jobs en queue:\n";
    $pendingJobs = \DB::table('jobs')->count();
    $failedJobs = \DB::table('failed_jobs')->count();
    
    echo "  - En attente: {$pendingJobs}\n";
    echo "  - Échoués: {$failedJobs}\n";

    echo "\n";
}

function checkAuth($app)
{
    echo "🔐 TEST D'AUTHENTIFICATION ODOO\n";
    echo "═════════════════════════════════\n\n";

    $odooClient = $app->make(\App\Services\Odoo\OdooClient::class);

    // Test simple: fetch partners
    echo "Tentative de récupération des partners...\n";
    
    $companies = $odooClient->fetchUpdatedCompanies(null);
    
    if ($companies === null) {
        echo "❌ ÉCHEC: Odoo est indisponible ou authentification échouée.\n";
        echo "\nVérifiez:\n";
        echo "  1. Le token API est valide dans .env\n";
        echo "  2. L'utilisateur API a les bonnes permissions\n";
        echo "  3. La URL Odoo est accessible\n";
    } else {
        echo "✅ SUCCÈS: Authentification OK\n";
        echo "   Nombre de partners récupérés: " . count($companies) . "\n";
    }

    echo "\n";
}

function testPush($app)
{
    echo "📤 TEST PUSH (FidelisPlus → Odoo)\n";
    echo "═════════════════════════════════\n\n";

    // Chercher un prospect sans email pour tester la validation
    $company = \App\Models\Company::where('email', null)->first();
    
    if ($company) {
        echo "⚠️  Prospect trouvé SANS email (ID: {$company->id})\n";
        echo "   Correction: Ajouter un email avant de synchroniser.\n";
    } else {
        $company = \App\Models\Company::whereNotNull('email')->first();
        
        if ($company) {
            echo "📝 Prospect trouvé: {$company->name} (ID: {$company->id})\n";
            echo "   Email: {$company->email}\n";
            echo "   Statut: {$company->odoo_sync_status}\n";
            
            // Trigger manual sync
            echo "\n   Déclenchement du sync...\n";
            \App\Jobs\SyncCompanyToOdoo::dispatch($company->id, 'prospect_created');
            echo "   ✅ Job dispatché. Consultez les logs dans quelques secondes.\n";
        } else {
            echo "❌ Aucun prospect trouvé avec email.\n";
        }
    }

    echo "\n";
}

function testPull($app)
{
    echo "📥 TEST PULL (Odoo → FidelisPlus)\n";
    echo "════════════════════════════════\n\n";

    echo "Exécution du cron `odoo:sync`...\n\n";
    
    $kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
    $output = new \Symfony\Component\Console\Output\BufferedOutput();
    
    $exitCode = $kernel->handle(
        new \Symfony\Component\Console\Input\ArrayInput(['command' => 'odoo:sync']),
        $output
    );

    echo $output->fetch();
    echo "\n" . ($exitCode === 0 ? "✅ Sync complétée" : "❌ Erreur lors du sync") . "\n";
}

function showLogs()
{
    echo "📋 LOGS RÉCENTS (dernière heure)\n";
    echo "═════════════════════════════════\n\n";

    $logFile = storage_path('logs/laravel.log');
    
    if (!file_exists($logFile)) {
        echo "❌ Fichier log non trouvé: {$logFile}\n";
        return;
    }

    $lines = file($logFile);
    $filtered = array_filter($lines, function($line) {
        return strpos($line, 'OdooClient') !== false || strpos($line, 'SyncFromOdoo') !== false;
    });

    $recent = array_slice($filtered, -50);
    
    foreach ($recent as $line) {
        echo $line;
    }

    echo "\n";
}
