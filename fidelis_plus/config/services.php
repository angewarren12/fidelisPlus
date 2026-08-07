<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // Jeton de service partagé avec l'app mobile client SIRA pour l'intégration fidélité
    // (inscription à la carte + consultation QR/solde/historique). Voir routes/api.php.
    // outbound_base_url/outbound_token : sens inverse, utilisés par Fidelis pour appeler
    // l'API de SIRA (vérification/provisioning de compte). Voir app/Services/Sira/SiraClient.php.
    'sira' => [
        'token' => env('SIRA_API_TOKEN', ''),
        'outbound_base_url' => env('SIRA_OUTBOUND_BASE_URL', ''),
        'outbound_token' => env('SIRA_OUTBOUND_TOKEN', ''),
    ],

    // Intégration Odoo (service commercial uniquement). Bidirectionnelle mais toujours
    // à l'initiative de Fidelis : outbound_base_url/outbound_token servent aux appels
    // sortants (prospects/clients/flottes/devis créés ou modifiés, voir
    // app/Services/Odoo/OdooClient.php, app/Jobs/Sync*ToOdoo.php) ET aux appels de pull
    // (GET .../updated, voir app/Console/Commands/SyncFromOdoo.php et
    // app/Services/Odoo/OdooIngestService.php) — Odoo n'appelle jamais Fidelis, donc pas
    // de jeton entrant à fournir. Valeurs à renseigner dès que l'équipe Odoo fournit
    // l'URL/le jeton de son API.
    'odoo' => [
        'outbound_base_url' => env('ODOO_OUTBOUND_BASE_URL', ''),
        'outbound_token' => env('ODOO_OUTBOUND_TOKEN', ''),
    ],

];
