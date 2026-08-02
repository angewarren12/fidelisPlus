<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Client fidélité propre au marketing — indépendant du CRM commercial
 * (pas de ligne `companies`/`users` associée).
 */
class LoyaltyMember extends Model
{
    protected $fillable = [
        'type',
        'nom',
        'prenom',
        'nom_entreprise',
        'registre_commerce',
        'nom_abonne',
        'fonction',
        'contact',
        'email',
        'sira_client_id',
        'source',
        'status',
        'requested_at',
        'rejection_reason',
        'sira_provisioning_status',
    ];

    protected $casts = [
        'requested_at' => 'datetime',
    ];

    public function loyaltyAccount(): HasOne
    {
        return $this->hasOne(LoyaltyAccount::class);
    }

    /** Véhicules déclarés par le client dans l'app SIRA, synchronisés vers Fidelis. */
    public function vehicles(): HasMany
    {
        return $this->hasMany(LoyaltyMemberVehicle::class);
    }

    public function displayName(): string
    {
        if ($this->type === 'entreprise') {
            return (string) ($this->nom_entreprise ?: 'Entreprise');
        }

        return trim(($this->prenom ?? '').' '.($this->nom ?? '')) ?: 'Particulier';
    }
}
