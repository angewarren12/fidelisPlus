<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$u = \App\Models\User::where('email', 'commercial@fidelis.com')->first();
if ($u) {
    $u->password = \Illuminate\Support\Facades\Hash::make('password');
    $u->save();
    echo "Commercial password reset successfully for {$u->email}\n";
} else {
    echo "No commercial user found\n";
}
