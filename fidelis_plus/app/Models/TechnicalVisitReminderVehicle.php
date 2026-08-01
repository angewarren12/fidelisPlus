<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TechnicalVisitReminderVehicle extends Model
{
    protected $fillable = [
        'technical_visit_reminder_id',
        'registration',
        'visit_expiration_date',
    ];

    protected function casts(): array
    {
        return [
            'visit_expiration_date' => 'date',
        ];
    }

    public function reminder(): BelongsTo
    {
        return $this->belongsTo(TechnicalVisitReminder::class, 'technical_visit_reminder_id');
    }
}
