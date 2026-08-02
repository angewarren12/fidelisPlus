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
        'blank_card_type',
        'loyalty_card_batch_id',
        'company_id',
        'user_id',
        'loyalty_member_id',
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
                $account->card_number = static::nextCardNumber(static::resolveCardPrefix($account));
            }
        });
    }

    /**
     * ENT- pour les comptes entreprise (société, membre "entreprise", carte vierge imprimée
     * depuis un modèle "entreprise"), FID- pour tout le reste (particulier).
     */
    public static function resolveCardPrefix(self $account): string
    {
        if ($account->holder_type === 'company') {
            return 'ENT';
        }

        if ($account->holder_type === 'unassigned') {
            return $account->blank_card_type === 'entreprise' ? 'ENT' : 'FID';
        }

        if ($account->holder_type === 'member' && $account->loyalty_member_id) {
            $memberType = LoyaltyMember::query()->find($account->loyalty_member_id)?->type;

            return $memberType === 'entreprise' ? 'ENT' : 'FID';
        }

        return 'FID';
    }

    public static function nextCardNumber(string $prefix = 'FID'): string
    {
        // lockForUpdate() sérialise les générations concurrentes par préfixe (ex : deux lots
        // de cartes lancés en parallèle) tant que l'appelant est dans une transaction —
        // sinon deux requêtes pourraient calculer le même dernier numéro et se percuter.
        $lastNumber = (int) (static::query()
            ->where('card_number', 'like', $prefix.'-%')
            ->lockForUpdate()
            ->selectRaw('MAX(CAST(SUBSTRING(card_number, ?) AS UNSIGNED)) as max_number', [strlen($prefix) + 2])
            ->value('max_number') ?? 0);

        return $prefix.'-'.str_pad((string) ($lastNumber + 1), 4, '0', STR_PAD_LEFT);
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

    public function member(): BelongsTo
    {
        return $this->belongsTo(LoyaltyMember::class, 'loyalty_member_id');
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(LoyaltyCardBatch::class, 'loyalty_card_batch_id');
    }

    public function ledgerEntries(): HasMany
    {
        return $this->hasMany(LoyaltyLedgerEntry::class);
    }
}
