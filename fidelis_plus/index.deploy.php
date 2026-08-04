<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Point d'entrée de PRODUCTION uniquement — remplace public/index.php lors de
// l'empaquetage CI (voir .github/workflows/deploy.yml). Ce fichier est déployé dans
// htdocs/fidelisplus.cieria-app.com/api/ (sous-dossier web public), alors que le
// reste du code Laravel (app/, vendor/, .env, storage/...) est déployé dans
// htdocs/fidelis_plus_app/ — un dossier "orphelin" sans sous-domaine pointé dessus,
// donc jamais accessible par une URL directe (seul htdocs/ est inscriptible sur cet
// hébergement, on ne peut pas sortir complètement du dossier web).
//
// En LOCAL, ce fichier n'est jamais utilisé : public/index.php (standard Laravel)
// reste inchangé pour le développement normal.
$appRoot = '/var/www/cieria-app.com/htdocs/fidelis_plus_app';

if (file_exists($maintenance = $appRoot.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

require $appRoot.'/vendor/autoload.php';

/** @var Application $app */
$app = require_once $appRoot.'/bootstrap/app.php';

$app->handleRequest(Request::capture());
