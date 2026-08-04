<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

/**
 * Point d'entrée post-déploiement pour le CI (GitHub Actions) sur un hébergement mutualisé
 * où SSH n'autorise que le SFTP (aucune commande à distance possible). Le workflow transfère
 * les fichiers déjà construits (composer install / npm build faits côté CI), puis appelle
 * cette route pour lancer migrate/cache — uniquement via Artisan::call(), qui s'exécute dans
 * le process PHP courant et ne dépend donc pas de proc_open (souvent désactivé côté web sur
 * ce type d'hébergement).
 */
class DeployController extends Controller
{
    public function hook(Request $request)
    {
        $token = $request->header('X-Deploy-Token');
        $expected = (string) config('app.deploy_token');

        if ($expected === '' || $token === null || ! hash_equals($expected, (string) $token)) {
            abort(403);
        }

        Artisan::call('migrate', ['--force' => true]);
        Artisan::call('config:cache');
        Artisan::call('route:cache');
        Artisan::call('view:cache');

        return response()->json(['success' => true]);
    }
}
