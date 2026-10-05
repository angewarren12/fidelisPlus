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

// Route Web Cron automatique (utilisée par la tâche Cron LWS) — exécute le scheduler Laravel
Route::get('/internal/cron-runner', function () {
    if (request()->has('clear_cache') || request()->has('reset')) {
        \Illuminate\Support\Facades\Cache::flush();
    }

    $exitCode = \Illuminate\Support\Facades\Artisan::call('schedule:run');
    $output   = \Illuminate\Support\Facades\Artisan::output();

    // Si le scheduler indique qu'aucune commande n'est prête (ex: verrou mutex bloqué) ou si force=1 est spécifié
    if (request()->has('force') || (request()->has('run') && str_contains($output, 'No scheduled commands'))) {
        \Illuminate\Support\Facades\Artisan::call('odoo:sync');
        $output .= "\n[Direct Run] " . \Illuminate\Support\Facades\Artisan::output();
    }

    $logs = \App\Models\OdooSyncLog::latest('id')->take(5)->get();

    return response()->json([
        'status'    => 'completed',
        'exit_code' => $exitCode,
        'output'    => trim($output),
        'recent_logs' => $logs,
    ]);
});

// Route Web dédiée spécifiquement à l'exécution des jobs SIRA en file d'attente (ProvisionSiraAccountForMember)
Route::get('/internal/sira-runner', function () {
    $exitCode = \Illuminate\Support\Facades\Artisan::call('queue:work', [
        '--stop-when-empty' => true,
        '--max-time' => 50,
        '--tries' => 1,
    ]);
    $output = \Illuminate\Support\Facades\Artisan::output();

    return response()->json([
        'status'    => 'completed',
        'service'   => 'sira-queue',
        'exit_code' => $exitCode,
        'output'    => trim($output) ?: 'Queue SIRA traitée avec succès (aucun job en attente).',
    ]);
});

// Route Cron HTTP — Synchronisation des statuts SIRA pending (active/rejected).
// Appelée par cron-job.org toutes les minutes avec le header Authorization ou le paramètre ?token=...
// Protégée par SIRA_CRON_TOKEN (ajouter dans .env et dans le dashboard cron-job.org).
// URL à configurer : https://fidelisplus.cieria-app.com/internal/sira-sync-runner?token=VOTRE_TOKEN
Route::get('/internal/sira-sync-runner', function () {
    $expectedToken = (string) config('services.sira.cron_token', '');

    // Accepter le token via query-string OU via header Authorization: Bearer ...
    $provided = request()->query('token')
        ?? str_replace('Bearer ', '', (string) request()->header('Authorization', ''));

    if (empty($expectedToken) || ! hash_equals($expectedToken, trim($provided))) {
        return response()->json(['error' => 'Unauthorized'], 401);
    }

    $exitCode = \Illuminate\Support\Facades\Artisan::call('sira:sync-pending-statuses');
    $output   = \Illuminate\Support\Facades\Artisan::output();

    // Compter les membres encore en attente pour le monitoring
    $stillPending = \App\Models\LoyaltyMember::query()
        ->whereNotNull('sira_client_id')
        ->where('sira_provisioning_status', 'pending')
        ->count();

    return response()->json([
        'status'        => 'completed',
        'service'       => 'sira-sync-pending-statuses',
        'exit_code'     => $exitCode,
        'output'        => trim($output) ?: 'Aucun membre en attente de provisioning SIRA.',
        'still_pending' => $stillPending,
        'ran_at'        => now()->toIso8601String(),
    ]);
});

// Route Web simple pour déclencher la synchronisation Odoo manuelle depuis le navigateur
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

    $noCacheHeaders = [
        'Cache-Control' => 'no-cache, no-store, must-revalidate',
        'Pragma'        => 'no-cache',
        'Expires'       => '0',
    ];

    // Chemin 1 : index.html à la racine du sous-domaine (dossier parent de laravel/)
    $path1 = public_path('../../index.html');
    if (file_exists($path1)) {
        return response()->file($path1, $noCacheHeaders);
    }

    // Chemin 2 : index.html dans le dossier public/ de Laravel
    $path2 = public_path('index.html');
    if (file_exists($path2)) {
        return response()->file($path2, $noCacheHeaders);
    }

    // Chemin 3 : index.html dans le dossier laravel/ (parent de public/)
    $path3 = public_path('../index.html');
    if (file_exists($path3)) {
        return response()->file($path3, $noCacheHeaders);
    }

    abort(404);
});
