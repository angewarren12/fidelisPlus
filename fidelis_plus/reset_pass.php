<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$users = ['admin@fidelis.com', 'commercial@fidelis.com'];
foreach ($users as $email) {
    $u = \App\Models\User::where('email', $email)->first();
    if ($u) {
        $u->password = \Illuminate\Support\Facades\Hash::make('password');
        $u->save();
        echo "Password for {$email} reset to 'password'.\n";
    } else {
        echo "User {$email} not found!\n";
    }
}
