<?php

use App\Models\User;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "--- LISTE DES UTILISATEURS ---\n";
foreach (User::all() as $u) {
    echo "ID: {$u->id} | Email: {$u->email} | Phone: '{$u->phone}' | Role: {$u->role}\n";
}

echo "\n--- CONFIG CORS ---\n";
$cors = config('cors');
print_r($cors);
