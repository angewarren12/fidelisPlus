<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TechnicalVisitReminder extends Model
{
    protected $fillable = [
        'station_id',
        'full_name',
        'contact',
        'alert_period',
        'contact_method',
        'consent_accepted',
        'status',
        'notes',
        'handled_by',
    ];

    protected function casts(): array
    {
        return [
            'consent_accepted' => 'boolean',
        ];
    }

    public function vehicles(): HasMany
    {
        return $this->hasMany(TechnicalVisitReminderVehicle::class);
    }

    public function station(): BelongsTo
    {
        return $this->belongsTo(Station::class);
    }

    public function handler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by');
    }
}
