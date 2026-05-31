<?php

namespace App\Services\Loyalty;

use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * Restreint la visibilité fidélité aux sociétés rattachées au commercial (commercial_id).
 */
final class LoyaltyCommercialVisibility
{
    /**
     * @param  Builder<\App\Models\LoyaltyAccount>  $query
     */
    public static function scopeLoyaltyAccounts(Builder $query, User $user): void
    {
        if ($user->role !== 'commercial') {
            return;
        }

        $companyIds = Company::query()->where('commercial_id', $user->id)->pluck('id');
        if ($companyIds->isEmpty()) {
            $query->whereRaw('0 = 1');

            return;
        }

        $query->where(function (Builder $w) use ($companyIds) {
            $w->whereIn('company_id', $companyIds)
                ->orWhereHas('user', static function (Builder $uq) use ($companyIds) {
                    $uq->whereIn('company_id', $companyIds);
                });
        });
    }

    /**
     * @param  Builder<\App\Models\LoyaltyPosScanEvent>  $query
     */
    public static function scopePosScanEvents(Builder $query, User $user, string $eventTableAlias = 'loyalty_pos_scan_events'): void
    {
        if ($user->role !== 'commercial') {
            return;
        }

        $companyIds = Company::query()->where('commercial_id', $user->id)->pluck('id');
        if ($companyIds->isEmpty()) {
            $query->whereRaw('0 = 1');

            return;
        }

        $query->whereExists(function ($sub) use ($eventTableAlias, $companyIds) {
            $sub->selectRaw('1')
                ->from('loyalty_accounts as la')
                ->whereColumn('la.id', "{$eventTableAlias}.loyalty_account_id")
                ->where(function ($inner) use ($companyIds) {
                    $inner->whereIn('la.company_id', $companyIds)
                        ->orWhereIn(
                            'la.user_id',
                            User::query()->whereIn('company_id', $companyIds)->select('id')
                        );
                });
        });
    }
}
