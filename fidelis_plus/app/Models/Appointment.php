<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Appointment extends Model
{
    protected $fillable = [
        'company_id',
        'vehicle_id',
        'station_id',
        'appointment_date',
        'is_pass_express',
        'status'
    ];

    protected $casts = [
        'appointment_date' => 'datetime',
        'is_pass_express' => 'boolean',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function station(): BelongsTo
    {
        return $this->belongsTo(Station::class);
    }

    public function visit(): HasOne
    {
        return $this->hasOne(Visit::class);
    }
}
