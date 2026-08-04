<?php

use App\Http\Controllers\DeployController;
use App\Http\Controllers\DocsController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/api-docs', [DocsController::class, 'index'])->name('docs.api');

// Webhook post-déploiement CI (voir CI-CD-SETUP-GUIDE.md section 4) — protégé par jeton,
// exclu du CSRF dans bootstrap/app.php.
Route::post('/internal/deploy-hook', [DeployController::class, 'hook'])
    ->middleware('throttle:5,1')
    ->name('internal.deploy-hook');
