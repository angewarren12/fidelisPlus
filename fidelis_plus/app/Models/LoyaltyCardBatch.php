<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LoyaltyCardBatch extends Model
{
    protected $fillable = [
        'loyalty_card_template_id',
        'quantity',
        'card_number_from',
        'card_number_to',
        'status',
        'printed_at',
        'created_by',
    ];

    protected $casts = [
        'printed_at' => 'datetime',
    ];

    public function template(): BelongsTo
    {
        return $this->belongsTo(LoyaltyCardTemplate::class, 'loyalty_card_template_id');
    }

    public function accounts(): HasMany
    {
        return $this->hasMany(LoyaltyAccount::class, 'loyalty_card_batch_id');
    }
}
