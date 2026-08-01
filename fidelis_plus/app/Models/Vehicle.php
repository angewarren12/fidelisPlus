<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Carbon\Carbon;

class Vehicle extends Model
{
    use HasFactory;
    protected $fillable = [
        'company_id',
        'license_plate',
        'brand',
        'model',
        'year',
        'fuel_type',
        'usage_type',
        'registration_doc_url',
        'vignette_doc_url',
        'last_visit_date',
        'next_ct_date',
        'next_pollution_date',
        'status'
    ];

    protected $casts = [
        'last_visit_date' => 'date',
        'next_ct_date' => 'date',
        'next_pollution_date' => 'date',
    ];

    protected $appends = ['has_all_docs'];

    public function getRegistrationDocUrlAttribute($value)
    {
        if ($value) return $value;
        return $this->documents()->where('type', 'carte_grise')->first()?->path;
    }

    public function getVignetteDocUrlAttribute($value)
    {
        if ($value) return $value;
        return $this->documents()->where('type', 'vignette')->first()?->path;
    }

    public function getHasAllDocsAttribute(): bool
    {
        return !empty($this->registration_doc_url) && !empty($this->vignette_doc_url);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class)->orderBy('created_at', 'desc');
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function documents(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    public function quotes(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(Quote::class, 'quote_vehicle');
    }

    public function scopeOverdue($query)
    {
        return $query->where('status', 'en_retard');
    }

    protected static function booted()
    {
        // Garantie : si next_ct_date est null, le statut ne peut jamais être
        // « en_retard » ou « bientot » — cela n'a aucun sens sans date connue.
        static::saving(function (Vehicle $vehicle) {
            if (empty($vehicle->next_ct_date) && in_array($vehicle->status, ['en_retard', 'bientot'])) {
                $vehicle->status = 'a_jour';
            }
        });

        static::deleting(function ($vehicle) {
            foreach ($vehicle->documents as $doc) {
                $doc->delete();
            }
        });
    }
}
