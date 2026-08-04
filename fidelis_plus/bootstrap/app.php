<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        channels: __DIR__.'/../routes/channels.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => \App\Http\Middleware\CheckRole::class,
            'sira.token' => \App\Http\Middleware\VerifySiraToken::class,
        ]);
        // Le webhook de déploiement CI est appelé par GitHub Actions (pas de session
        // navigateur), protégé par jeton (X-Deploy-Token) au lieu du CSRF classique.
        $middleware->validateCsrfTokens(except: [
            'internal/deploy-hook',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
