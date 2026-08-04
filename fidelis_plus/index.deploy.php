<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Point d'entrée de PRODUCTION uniquement — remplace public/index.php lors de
// l'empaquetage CI (voir .github/workflows/deploy.yml). Déployé dans laravel/public/,
// un sous-dossier du docroot Angular (htdocs/fidelisplus.cieria-app.com/) : le
// .htaccess racine (deploy/subdomain.htaccess) bloque l'accès direct à laravel/*
// (sauf laravel/public/) et route tout ce qui n'est pas un fichier statique existant
// vers ce fichier. Approche identique à un autre projet déployé avec succès sur ce
// même hébergement LWS (mayelia_mobilite_website/deploy-package-v2).
//
// En LOCAL, ce fichier n'est jamais utilisé : public/index.php (standard Laravel)
// reste inchangé pour le développement normal.

// Fix LWS : sur cet hébergement, Apache ne préserve pas correctement REQUEST_URI
// après la réécriture mod_rewrite du .htaccess racine — on le reconstruit depuis
// REDIRECT_URL (variable que mod_rewrite pose lui-même lors du rewrite interne).
if (isset($_SERVER['REDIRECT_URL'])) {
    $_SERVER['REQUEST_URI'] = $_SERVER['REDIRECT_URL'];
    if (! empty($_SERVER['REDIRECT_QUERY_STRING'])) {
        $_SERVER['REQUEST_URI'] .= '?'.$_SERVER['REDIRECT_QUERY_STRING'];
    }
}

if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

require __DIR__.'/../vendor/autoload.php';

/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

// Chemin public réel = racine du site (deux niveaux au-dessus de laravel/public/),
// puisque laravel/ est un sous-dossier du docroot Angular, pas la racine web elle-même.
$app->usePublicPath(dirname(__DIR__, 2));

$app->handleRequest(Request::capture());
