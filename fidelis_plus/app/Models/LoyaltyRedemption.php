<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoyaltyRedemption extends Model
{
    protected $fillable = [
        'loyalty_account_id',
        'loyalty_reward_id',
        'points_cost',
        'status',
        'notes',
        'handled_by'
    ];

    public function account()
    {
        return $this->belongsTo(LoyaltyAccount::class, 'loyalty_account_id');
    }

    public function reward()
    {
        return $this->belongsTo(LoyaltyReward::class, 'loyalty_reward_id');
    }

    public function handler()
    {
        return $this->belongsTo(User::class, 'handled_by');
    }
}
