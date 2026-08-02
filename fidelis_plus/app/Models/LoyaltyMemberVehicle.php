<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoyaltyMemberVehicle extends Model
{
    protected $fillable = [
        'loyalty_member_id',
        'sira_vehicle_id',
        'registration',
        'brand',
        'model',
        'color',
    ];

    public function member(): BelongsTo
    {
        return $this->belongsTo(LoyaltyMember::class, 'loyalty_member_id');
    }
}
