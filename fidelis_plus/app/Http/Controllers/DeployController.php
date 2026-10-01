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

        $results = [];
        $errors = [];

        // 1. Migrations
        try {
            Artisan::call('migrate', ['--force' => true]);
            $results['migrate'] = trim(Artisan::output());
        } catch (\Throwable $e) {
            $errors['migrate'] = $e->getMessage();
        }

        // 2. Nettoyage des caches précédents
        try {
            Artisan::call('optimize:clear');
            $results['clear'] = trim(Artisan::output());
        } catch (\Throwable $e) {
            $errors['clear'] = $e->getMessage();
        }

        // 3. Mise en cache de la config
        try {
            Artisan::call('config:cache');
            $results['config'] = trim(Artisan::output());
        } catch (\Throwable $e) {
            $errors['config'] = $e->getMessage();
        }

        // 4. Mise en cache des vues
        try {
            Artisan::call('view:cache');
            $results['view'] = trim(Artisan::output());
        } catch (\Throwable $e) {
            $errors['view'] = $e->getMessage();
        }

        return response()->json([
            'success' => empty($errors),
            'results' => $results,
            'errors'  => $errors,
        ], 200);
    }
}
