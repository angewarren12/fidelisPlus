<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoyaltyReward extends Model
{
    protected $fillable = [
        'name',
        'description',
        'points_cost',
        'client_segments',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'points_cost' => 'integer',
            'client_segments' => 'array',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }
}
