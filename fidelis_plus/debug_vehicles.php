<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

// Corriger tous les véhicules sans next_ct_date qui ont un statut erroné
$fixed = App\Models\Vehicle::whereNull('next_ct_date')
    ->whereIn('status', ['en_retard', 'bientot'])
    ->update(['status' => 'a_jour']);

echo "Vehicules corrigés : " . $fixed . PHP_EOL;

// Vérification
$check = App\Models\Vehicle::whereNull('next_ct_date')->get(['id','license_plate','status']);
foreach ($check as $v) {
    echo $v->license_plate . ' => ' . $v->status . PHP_EOL;
}
