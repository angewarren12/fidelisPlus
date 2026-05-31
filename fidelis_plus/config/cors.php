<?php

$defaults = [
    'http://localhost:4200',
    'http://127.0.0.1:4200',
];

$fromEnv = env('CORS_ALLOWED_ORIGINS');
if (is_string($fromEnv) && $fromEnv !== '') {
    $allowedOrigins = array_values(array_filter(array_map('trim', explode(',', $fromEnv))));
} else {
    $allowedOrigins = $defaults;
}

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Les applications natives (Flutter iOS/Android) n’effectuent pas de requêtes
    | « navigateur » soumises au CORS. Ce réglage sert surtout au backoffice Angular,
    | aux tests web et à d’éventuelles WebViews.
    |
    | Variable .env : CORS_ALLOWED_ORIGINS (liste séparée par des virgules).
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => $allowedOrigins,

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
