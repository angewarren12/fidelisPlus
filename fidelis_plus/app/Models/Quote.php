<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quote extends Model
{
    protected $fillable = ['company_id', 'quote_request_id', 'quote_number', 'status', 'total_amount', 'valid_until'];

    protected $casts = [
        'valid_until' => 'date',
        'total_amount' => 'decimal:2',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function quoteRequest(): BelongsTo
    {
        return $this->belongsTo(QuoteRequest::class);
    }

    public function vehicles(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(Vehicle::class, 'quote_vehicle');
    }

    public function items(): HasMany
    {
        return $this->hasMany(QuoteItem::class);
    }
}
