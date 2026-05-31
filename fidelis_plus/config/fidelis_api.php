<?php

/**
 * Référence métier de l’API REST Fidelis Plus (complément aux routes nommées Laravel).
 * Les chemins sont relatifs au préfixe global « api » (voir bootstrap/app.php).
 */
return [

    'version' => 'v1',

    /** Préfixe d’URL réel : /api/{version} */
    'url_prefix' => 'api/v1',

    /**
     * Application mobile caisse (scan fidélité).
     * Auth : Bearer Sanctum après POST /auth/login.
     */
    'mobile_cashier' => [
        'roles_allowed' => ['caissier', 'admin'],
        'required_headers' => [
            'Authorization' => 'Bearer {token}',
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ],
        'scan_endpoint' => [
            'method' => 'POST',
            'path' => '/api/v1/loyalty/pos/scan',
            'extra_headers' => [
                'Idempotency-Key' => 'UUID ou chaîne unique par tentative de scan (obligatoire, max 80 caractères)',
            ],
            'body' => [
                'qr_payload' => 'string (payload QR signé)',
                'station_id' => 'integer (ID station — liste via GET /api/v1/stations)',
                'occurred_at' => 'datetime ISO8601',
                'device_id' => 'string optionnel',
            ],
        ],
        'supporting_endpoints' => [
            'POST /api/v1/auth/login',
            'GET /api/v1/auth/me',
            'POST /api/v1/auth/logout',
            'GET /api/v1/stations',
            'PATCH /api/v1/auth/fcm-token',
            'GET /api/v1/notifications',
            'GET /api/v1/notifications/unread-count',
            'PATCH /api/v1/notifications/mark-all-read',
            'PATCH /api/v1/notifications/{id}/read',
        ],
    ],

    /**
     * Fidélité back-office / marketing (hors scan caisse).
     */
    'loyalty_crm' => [
        'roles_accounts_rewards' => ['admin', 'marketing'],
        'roles_qr_bootstrap' => ['admin', 'marketing'],
        'env' => [
            'LOYALTY_QR_SECRET',
            'LOYALTY_POS_POINTS_PER_SCAN',
            'LOYALTY_QR_TTL_SECONDS',
        ],
        'reports' => [
            'station_scans' => 'GET /api/v1/loyalty/reports/station-scans',
            'params' => ['date', 'from+to', 'station_id'],
        ],
        'lookup' => [
            'client_users' => 'GET /api/v1/loyalty/lookup/client-users?search=',
        ],
    ],
];
