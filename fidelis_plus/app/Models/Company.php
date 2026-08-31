<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Company extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'commercial_id',
        'type',
        'category',
        'company_type',
        'created_via_marketing',
        'created_via_odoo',
        'odoo_partner_id',
        'odoo_client_code',
        'odoo_is_mayelia_customer',
        'name',
        'email',
        'phone',
        'rccm',
        'address',
        'city',
        'zip_code',
        'observations',
        'sector',
        'lead_source',
        'estimated_potential',
        'estimated_decision_date',
        'needs',
        'kanban_stage',
        'temperature',
        'is_active',
        'account_balance',
        'last_contact_date',
        'referrer_company_id',
        'bonus_fleet_awarded_at',
        'bonus_profile_completed_awarded_at',
        'bonus_referral_awarded_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'created_via_marketing' => 'boolean',
        'created_via_odoo' => 'boolean',
        'last_contact_date' => 'datetime',
        'converted_at' => 'datetime',
        'account_balance' => 'decimal:2',
        'bonus_fleet_awarded_at' => 'datetime',
        'bonus_profile_completed_awarded_at' => 'datetime',
        'bonus_referral_awarded_at' => 'datetime',
        'odoo_synced_at'            => 'datetime',
        'odoo_is_mayelia_customer'  => 'boolean',
    ];

    public function isIndividual(): bool
    {
        return $this->category === 'particulier';
    }

    public function commercial(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class, 'commercial_id');
    }

    public function referrer(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Company::class, 'referrer_company_id');
    }

    public function referrals(): HasMany
    {
        return $this->hasMany(Company::class, 'referrer_company_id');
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function vehicles(): HasMany
    {
        return $this->hasMany(Vehicle::class);
    }

    public function documents(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    public function notes(): HasMany
    {
        return $this->hasMany(Note::class);
    }

    public function loyaltyAccounts(): HasMany
    {
        return $this->hasMany(LoyaltyAccount::class);
    }

    public function subscriptionContract(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(SubscriptionContract::class);
    }
}
