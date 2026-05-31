<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$u = User::where('email', 'admin@fidelis.com')->first();
if ($u) {
    // Si le modèle User a un cast 'password' => 'hashed', 
    // l'affectation directe suffit.
    $u->password = '12345678';
    $u->save();
    
    echo "Mot de passe réinitialisé via cast : 12345678\n";
    echo "Hash actuel en BD : " . $u->password . "\n";
    
    if (Hash::check('12345678', $u->password)) {
        echo "Vérification locale : OK\n";
    } else {
        echo "Vérification locale : ÉCHEC (Double hachage probable ?)\n";
    }
}
