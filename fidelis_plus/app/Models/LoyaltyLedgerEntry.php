<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoyaltyLedgerEntry extends Model
{
    protected $fillable = [
        'loyalty_account_id',
        'type',
        'delta_points',
        'balance_after',
        'source',
        'idempotency_key',
        'meta',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'delta_points' => 'integer',
            'balance_after' => 'integer',
            'meta' => 'array',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(LoyaltyAccount::class, 'loyalty_account_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
