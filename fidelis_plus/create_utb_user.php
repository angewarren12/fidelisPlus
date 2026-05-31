<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Company;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

$company = Company::where('name', 'LIKE', '%UTB%')->first();

if (!$company) {
    echo "L'entreprise UTB n'a pas été trouvée.\n";
    exit;
}

$email = 'contact@utb.ci';
$phone = '+2250505050505';
$password = 'password123';

try {
    $user = User::updateOrCreate(
        ['email' => $email],
        [
            'first_name' => 'Responsable',
            'last_name' => 'UTB',
            'phone' => $phone,
            'password' => Hash::make($password),
            'role' => 'client',
            'company_id' => $company->id,
            'email_verified_at' => now(),
            'remember_token' => Str::random(10),
        ]
    );

    echo "Nouveau correspondant créé/mis à jour avec succès pour UTB :\n";
    echo "Email : " . $email . "\n";
    echo "Téléphone : " . $phone . "\n";
    echo "Mot de passe : " . $password . "\n";
} catch (\Exception $e) {
    echo "Erreur lors de la création : " . $e->getMessage() . "\n";
}
