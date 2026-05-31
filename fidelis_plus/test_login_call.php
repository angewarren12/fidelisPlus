<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Http\Request;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$request = Request::create('/api/v1/auth/login', 'POST', [
    'login' => '0102030405',
    'password' => 'Test@2025!'
]);

$controller = new AuthController();
$response = $controller->login($request);

echo "Status Code: " . $response->getStatusCode() . "\n";
echo "Body: " . $response->getContent() . "\n";
