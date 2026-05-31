<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$u = User::where('email', 'admin@fidelis.com')->first();
if ($u) {
    $u->password = Hash::make('12345678');
    $u->save();
    echo "Mot de passe de l'admin mis à jour : 12345678\n";
} else {
    echo "Admin non trouvé.\n";
}
