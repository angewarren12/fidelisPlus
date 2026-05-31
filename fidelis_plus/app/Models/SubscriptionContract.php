<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriptionContract extends Model
{
    protected $fillable = [
        'company_id',
        'subscriber_name',
        'address_zone',
        'card_number',
        'subscription_date',
        'start_date',
        'end_date',
        'annual_evaluation_date',
        'min_vehicles_daily',
        'min_vehicles_monthly',
        'reward_frequency',
        'status',
        'signed_at',
    ];

    protected $casts = [
        'subscription_date' => 'date',
        'start_date' => 'date',
        'end_date' => 'date',
        'annual_evaluation_date' => 'date',
        'min_vehicles_daily' => 'integer',
        'min_vehicles_monthly' => 'integer',
        'signed_at' => 'datetime',
    ];

    /**
     * Get the company that owns the subscription contract.
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
