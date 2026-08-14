#!/usr/bin/env php
<?php

require __DIR__ . '/bootstrap/app.php';

$app = require_once __DIR__ . '/bootstrap/app.php';

echo "═════════════════════════════════════════════════════════════════\n";
echo "DIAGNOSTIC: État des prospects en FidelisPlus\n";
echo "═════════════════════════════════════════════════════════════════\n\n";

$totalProspects = \App\Models\Company::where('type', 'prospect')->count();
$withEmail = \App\Models\Company::where('type', 'prospect')->whereNotNull('email')->count();
$withoutEmail = $totalProspects - $withEmail;

echo "📊 Prospects en base de données FidelisPlus:\n";
echo "  - Total: {$totalProspects}\n";
echo "  - Avec email: {$withEmail}\n";
echo "  - Sans email: {$withoutEmail}\n\n";

// Vérifier le statut de sync Odoo
$synced = \App\Models\Company::where('type', 'prospect')
    ->where('odoo_sync_status', 'synced')
    ->count();
$failed = \App\Models\Company::where('type', 'prospect')
    ->where('odoo_sync_status', 'failed')
    ->count();
$pending = $totalProspects - $synced - $failed;

echo "🔄 Statut de synchronisation Odoo:\n";
echo "  - Synchronisés: {$synced}\n";
echo "  - Échoués: {$failed}\n";
echo "  - En attente: {$pending}\n\n";

// Afficher quelques exemples
if ($totalProspects > 0) {
    echo "📝 Exemples de prospects (derniers 5):\n";
    echo str_repeat("─", 70) . "\n";
    
    $examples = \App\Models\Company::where('type', 'prospect')
        ->latest()
        ->limit(5)
        ->get();
    
    foreach ($examples as $company) {
        echo "• {$company->name}\n";
        echo "  Email: " . ($company->email ?? 'VIDE') . "\n";
        echo "  Sync Status: " . ($company->odoo_sync_status ?? 'NULL') . "\n";
        echo "  Odoo ID: " . ($company->odoo_partner_id ?? 'N/A') . "\n";
        echo "  Créé: " . $company->created_at->format('Y-m-d H:i') . "\n";
        echo "\n";
    }
} else {
    echo "⚠️  Aucun prospect trouvé en base de données.\n";
    echo "   Créez un prospect via l'interface FidelisPlus pour tester la synchronisation.\n";
}

echo "\n";
