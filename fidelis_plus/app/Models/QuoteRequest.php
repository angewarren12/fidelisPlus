<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class QuoteRequest extends Model
{
    protected $fillable = [
        'user_id',
        'company_id',
        'vehicle_id',
        'registration_image',
        'vignette_image',
        'status',
        'notes'
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function vehicles()
    {
        return $this->belongsToMany(Vehicle::class, 'quote_request_vehicle');
    }

    protected static function booted()
    {
        static::deleting(function ($quoteRequest) {
            if ($quoteRequest->registration_image) {
                $fileName = str_replace('/storage/', '', $quoteRequest->registration_image);
                Storage::disk('public')->delete($fileName);
            }
            if ($quoteRequest->vignette_image) {
                $fileName = str_replace('/storage/', '', $quoteRequest->vignette_image);
                Storage::disk('public')->delete($fileName);
            }
        });
    }
}
