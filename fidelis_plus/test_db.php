<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$utb = \App\Models\Company::where('name', 'like', '%UTB%')->first();
if (!$utb) {
    echo "UTB not found\n";
    exit;
}

$faker = \Faker\Factory::create('fr_FR');

for ($i = 0; $i < 5; $i++) {
    $status = $faker->randomElement(['a_jour', 'a_jour', 'bientot', 'en_retard']);
    \App\Models\Vehicle::create([
        'company_id' => $utb->id,
        'license_plate' => strtoupper($faker->bothify('?? ### ??')),
        'brand' => $faker->randomElement(['Mercedes', 'Toyota', 'Renault', 'Volvo']),
        'model' => 'Modèle ' . $faker->word,
        'year' => rand(2010, 2024),
        'fuel_type' => $faker->randomElement(['Diesel', 'Essence']),
        'status' => $status,
    ]);
}

$vehicles = \App\Models\Vehicle::where('company_id', $utb->id)->get();
echo "Client ID: {$utb->id}\n";
echo "Vehicles Count: " . $vehicles->count() . "\n";

