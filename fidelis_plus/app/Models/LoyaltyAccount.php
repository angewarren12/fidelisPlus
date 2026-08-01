<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class LoyaltyAccount extends Model
{
    /** @use HasFactory<\Database\Factories\LoyaltyAccountFactory> */
    use HasFactory;

    protected $fillable = [
        'holder_key',
        'card_number',
        'holder_type',
        'company_id',
        'user_id',
        'public_uuid',
        'points_balance',
        'subscriber_name',
        'trade_register',
        'subscriber_function',
        'total_vehicles_referred',
        'milestone_apporteur_50_reached_at',
        'milestone_flotte_20_reached_at',
        'milestone_flotte_50_reached_at',
        'milestone_flotte_100_reached_at',
        'blocked_at',
    ];

    protected function casts(): array
    {
        return [
            'points_balance' => 'integer',
            'total_vehicles_referred' => 'integer',
            'milestone_apporteur_50_reached_at' => 'datetime',
            'milestone_flotte_20_reached_at' => 'datetime',
            'milestone_flotte_50_reached_at' => 'datetime',
            'milestone_flotte_100_reached_at' => 'datetime',
            'blocked_at' => 'datetime',
        ];
    }

    public function isBlocked(): bool
    {
        return $this->blocked_at !== null;
    }

    public function regenerateUuid(): void
    {
        $this->update(['public_uuid' => (string) Str::uuid()]);
    }

    protected static function booted(): void
    {
        static::creating(function (LoyaltyAccount $account): void {
            if (empty($account->public_uuid)) {
                $account->public_uuid = (string) Str::uuid();
            }
            if (empty($account->card_number)) {
                $account->card_number = static::nextCardNumber();
            }
        });
    }

    public static function nextCardNumber(): string
    {
        $lastId = (int) (static::max('id') ?? 0);

        return str_pad((string) ($lastId + 1), 4, '0', STR_PAD_LEFT);
    }

    public function scanEvents(): HasMany
    {
        return $this->hasMany(LoyaltyPosScanEvent::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function ledgerEntries(): HasMany
    {
        return $this->hasMany(LoyaltyLedgerEntry::class);
    }
}
