<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$login = '0102030405';
$password = 'Test@2025!';

$user = User::where('email', $login)->orWhere('phone', $login)->first();

if (!$user) {
    echo "UTILISATEUR NON TROUVÉ pour $login\n";
} else {
    echo "Utilisateur trouvé : " . $user->email . " (Role: " . $user->role . ")\n";
    if (Hash::check($password, $user->password)) {
        echo "MOT DE PASSE CORRECT\n";
    } else {
        echo "MOT DE PASSE INCORRECT\n";
    }
}
