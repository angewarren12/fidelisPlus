<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;

$user = User::whereHas('company', function($q) {
    $q->where('name', 'LIKE', '%UTB%');
})->first();

if ($user) {
    echo "Mots de passe par défaut pour tous les users de test est souvent 'password'\n";
    echo "Identifiants UTB :\n";
    echo "Email: " . $user->email . "\n";
    echo "Phone: " . $user->phone . "\n";
    echo "Role: " . $user->role . "\n";
} else {
    echo "Aucun utilisateur lié à 'UTB' trouvé dans la base de données.\n";
}
