<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommercialKpiTarget extends Model
{
    protected $fillable = [
        'commercial_id',
        'period_type',
        'period_year',
        'period_month',
        'period_quarter',
        'target_clients',
        'target_revenue_signed',
        'created_by',
    ];

    protected $casts = [
        'target_revenue_signed' => 'decimal:2',
        'period_year' => 'integer',
        'period_month' => 'integer',
        'period_quarter' => 'integer',
        'target_clients' => 'integer',
    ];

    public function commercial(): BelongsTo
    {
        return $this->belongsTo(User::class, 'commercial_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

