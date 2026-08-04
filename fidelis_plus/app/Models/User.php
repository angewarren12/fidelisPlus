<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * @var list<string>
     */

    protected $hidden = [
        'password',
        'remember_token',
        'fcm_token',
    ];

    protected $fillable = [
        'company_id',
        'role',
        'login',
        'first_name',
        'last_name',
        'email',
        'phone',
        'avatar_path',
        'fcm_token',
        'notification_preferences',
        'password',
        'is_main_contact',
        'must_change_password',
    ];

    protected $appends = ['avatar_url'];

    public function getAvatarUrlAttribute(): ?string
    {
        return $this->avatar_path ? \Illuminate\Support\Facades\Storage::disk('public')->url($this->avatar_path) : null;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'notification_preferences' => 'array',
            'must_change_password' => 'boolean',
        ];
    }

    public function company(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function managedCompanies(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Company::class, 'commercial_id');
    }

    public function loyaltyAccounts(): HasMany
    {
        return $this->hasMany(LoyaltyAccount::class);
    }

    /** Scans effectués par ce caissier (loyalty_pos_scan_events.cashier_user_id). */
    public function cashierScans(): HasMany
    {
        return $this->hasMany(LoyaltyPosScanEvent::class, 'cashier_user_id');
    }

    /** Demandes de lots traitées (livrées/annulées) par ce membre marketing. */
    public function handledRedemptions(): HasMany
    {
        return $this->hasMany(LoyaltyRedemption::class, 'handled_by');
    }
}
