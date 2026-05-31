<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';

$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$u = User::where('email', 'admin@fidelis.com')->first();
if ($u) {
    $u->phone = '0102030405';
    $u->password = Hash::make('Test@2025!');
    $u->save();
    echo "Utilisateur de test mis à jour : 0102030405 / Test@2025!\n";
} else {
    echo "Admin non trouvé.\n";
}
