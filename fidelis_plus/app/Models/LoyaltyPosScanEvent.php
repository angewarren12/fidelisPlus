<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoyaltyPosScanEvent extends Model
{
    protected $fillable = [
        'idempotency_key',
        'qr_jti',
        'loyalty_account_id',
        'cashier_user_id',
        'station_id',
        'points_credited',
        'payload_hash',
        'device_id',
        'vehicle_registration',
        'vehicle_brand',
        'vehicle_color',
        'visit_type',
    ];

    public function loyaltyAccount(): BelongsTo
    {
        return $this->belongsTo(LoyaltyAccount::class);
    }

    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cashier_user_id');
    }

    public function station(): BelongsTo
    {
        return $this->belongsTo(Station::class);
    }
}
