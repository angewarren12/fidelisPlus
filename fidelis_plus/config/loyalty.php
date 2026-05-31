<?php

return [
    'qr_secret' => env('LOYALTY_QR_SECRET', ''),
    'pos_points_per_scan' => (int) env('LOYALTY_POS_POINTS_PER_SCAN', 10),
    'qr_ttl_seconds' => (int) env('LOYALTY_QR_TTL_SECONDS', 60 * 60 * 24 * 365),
];
