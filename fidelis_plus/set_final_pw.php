<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$u = User::where('email', 'admin@fidelis.com')->first();
if ($u) {
    // Le modèle User a un cast 'hashed', donc pas besoin de Hash::make ici si on veut éviter le double hash.
    // Mais attendez, dans Laravel 11, le cast 'hashed' S'ATTEND à ce que la valeur soit en clair avant l'affectation.
    $u->password = 'Test@2025!';
    $u->save();
}
echo "Mot de passe final rétabli : Test@2025!\n";
