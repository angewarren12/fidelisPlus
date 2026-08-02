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
        'vehicle_type',
        'ptac_kg',
        'seats',
        'registration_date',
        'fiscal_power_cv',
        'ct_amount_ht',
        'ct_vat_amount',
        'ct_amount_ttc',
        'vignette_amount',
        'penalty_amount',
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
        'registration_date' => 'date',
        'ct_amount_ht' => 'decimal:2',
        'ct_vat_amount' => 'decimal:2',
        'ct_amount_ttc' => 'decimal:2',
        'vignette_amount' => 'decimal:2',
        'penalty_amount' => 'decimal:2',
        'last_visit_date' => 'date',
        'next_ct_date' => 'date',
        'next_pollution_date' => 'date',
    ];

    protected $appends = ['has_required_doc'];

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

    /**
     * Un devis peut être fait dès qu'un des deux documents (carte grise OU vignette)
     * est présent — un seul suffit, contrairement à la conformité contrôle technique
     * qui exige les deux.
     */
    public function getHasRequiredDocAttribute(): bool
    {
        return !empty($this->registration_doc_url) || !empty($this->vignette_doc_url);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class)->orderBy('created_at', 'desc');
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

    /**
     * Calcule la prochaine date de contrôle technique et le statut de conformité
     * à partir d'une date de visite. Seule source de vérité pour ce calcul —
     * utilisée à la fois à la création du véhicule et lors de l'enregistrement
     * d'une visite, pour garantir un résultat identique dans les deux cas.
     *
     * @return array{next_ct_date: \Carbon\Carbon, status: string}
     */
    public static function computeCtStatus(Carbon $visitDate, ?string $usageType): array
    {
        $usage = (string) ($usageType ?? 'personnel');
        $nextCt = $usage === 'transport'
            ? $visitDate->copy()->addMonthsNoOverflow(6)
            : $visitDate->copy()->addMonthsNoOverflow(12);

        $today = Carbon::today();
        // Nombre de jours restants avant l'échéance (positif = dans le futur, négatif = dépassée).
        // Attention : diffInDays() sans argument explicite « absolute » retourne selon les
        // versions de Carbon un résultat signé ou non — on force ici le signe explicitement
        // pour éviter qu'une échéance lointaine soit prise pour une échéance dépassée.
        $daysUntilDue = $today->diffInDays($nextCt, false);
        $status = 'a_jour';
        if ($daysUntilDue < 0) {
            $status = 'en_retard';
        } elseif ($daysUntilDue <= 14) {
            $status = 'bientot';
        }

        return ['next_ct_date' => $nextCt, 'status' => $status];
    }

    /**
     * Calcule le statut de conformité à partir d'une date d'expiration de visite technique
     * déjà connue (ex: import Excel qui fournit directement l'échéance plutôt qu'une date
     * de dernière visite). Même logique de seuils que computeCtStatus().
     */
    public static function statusFromNextCtDate(Carbon $nextCtDate): string
    {
        $daysUntilDue = Carbon::today()->diffInDays($nextCtDate, false);
        if ($daysUntilDue < 0) {
            return 'en_retard';
        }
        if ($daysUntilDue <= 14) {
            return 'bientot';
        }
        return 'a_jour';
    }

    protected static function booted()
    {
        // Garantie : si next_ct_date est null (aucun contrôle technique connu),
        // le statut doit refléter cette absence de donnée, jamais un état de
        // conformité qu'on ne peut pas réellement affirmer.
        static::saving(function (Vehicle $vehicle) {
            if (empty($vehicle->next_ct_date) && in_array($vehicle->status, ['en_retard', 'bientot', 'a_jour'], true)) {
                $vehicle->status = 'jamais_controle';
            }
        });

        static::deleting(function ($vehicle) {
            foreach ($vehicle->documents as $doc) {
                $doc->delete();
            }
        });
    }
}
