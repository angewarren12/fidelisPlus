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

// Route Web simple pour déclencher la synchronisation Odoo depuis le navigateur
Route::get('/sync-odoo', function () {
    \Illuminate\Support\Facades\Artisan::call('odoo:sync', ['--full' => true]);
    $logs = \App\Models\OdooSyncLog::latest('id')->take(6)->get();
    return response()->json([
        'success' => true,
        'message' => 'Synchronisation Odoo exécutée avec succès.',
        'recent_logs' => $logs,
    ]);
});
Route::get('/odoo-sync', function () {
    return redirect('/sync-odoo');
});

// Fallback pour le routage de la Single Page Application (Angular)
Route::fallback(function () {
    if (request()->is('api/*') || request()->is('internal/*')) {
        abort(404);
    }

    // Chemin 1 : index.html à la racine du sous-domaine (dossier parent de laravel/)
    $path1 = public_path('../../index.html');
    if (file_exists($path1)) {
        return response()->file($path1);
    }

    // Chemin 2 : index.html dans le dossier public/ de Laravel
    $path2 = public_path('index.html');
    if (file_exists($path2)) {
        return response()->file($path2);
    }

    // Chemin 3 : index.html dans le dossier laravel/ (parent de public/)
    $path3 = public_path('../index.html');
    if (file_exists($path3)) {
        return response()->file($path3);
    }

    abort(404);
});
