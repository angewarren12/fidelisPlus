<?php

return [
    // Clé de chiffrement dédiée au QR fidélité (distincte d'APP_KEY). Repli temporaire sur
    // l'ancien LOYALTY_QR_SECRET pour ne pas casser un déploiement qui n'a pas encore été
    // reconfiguré ; définir explicitement LOYALTY_QR_KEY est recommandé.
    'qr_key' => env('LOYALTY_QR_KEY', env('LOYALTY_QR_SECRET', '')),
    'pos_points_per_scan' => (int) env('LOYALTY_POS_POINTS_PER_SCAN', 10),
    'qr_ttl_seconds' => (int) env('LOYALTY_QR_TTL_SECONDS', 60 * 60 * 24 * 365),
    // Délai minimum entre deux scans valides d'une même carte permanente. Les cartes physiques
    // ont un jti régénéré à chaque déchiffrement (pour rester scannables indéfiniment), donc la
    // contrainte d'unicité sur qr_jti ne protège pas contre le rejeu d'une photo/capture du QR.
    // Ce cooldown est la seule protection anti-rejeu réelle pour ces cartes.
    'scan_cooldown_seconds' => (int) env('LOYALTY_SCAN_COOLDOWN_SECONDS', 180),
];
