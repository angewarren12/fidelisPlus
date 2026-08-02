<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Visit extends Model
{
    protected $fillable = [
        'vehicle_id',
        'visit_date',
        'kind',
        'result',
        'report_pdf_url',
        'diagnostics_summary',
        'notes',
        'status'
    ];

    protected $casts = [
        'diagnostics_summary' => 'array',
    ];

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }
}
