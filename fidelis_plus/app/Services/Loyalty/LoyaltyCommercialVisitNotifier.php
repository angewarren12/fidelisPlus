<?php

namespace App\Services\Loyalty;

use App\Models\LoyaltyAccount;
use App\Models\Station;
use App\Models\User;
use App\Services\NotificationService;

/**
 * Alerte le commercial référent lorsqu’un scan caisse valide une visite magasin (carte fidélité).
 */
class LoyaltyCommercialVisitNotifier
{
    public function __construct(
        private readonly NotificationService $notifications,
    ) {}

    public function notifyVisitValidated(LoyaltyAccount $account, ?Station $station, int $pointsCredited): void
    {
        $commercial = $this->resolveCommercial($account);
        if ($commercial === null) {
            return;
        }

        $clientLabel = $this->clientLabel($account);
        $where = $station !== null ? $station->name : 'magasin';

        $this->notifications->notifyUser(
            $commercial,
            'Visite magasin (fidélité)',
            "{$clientLabel} a validé une visite — {$pointsCredited} pt(s) — {$where}.",
            'loyalty_visit',
            [
                'loyalty_account_id' => $account->id,
                'station_id' => $station?->id,
                'points_credited' => $pointsCredited,
            ],
            null,
            'normal',
            'both',
        );
    }

    private function resolveCommercial(LoyaltyAccount $account): ?User
    {
        $account->loadMissing([
            'company.commercial',
            'user.company.commercial',
        ]);

        if ($account->company_id !== null && $account->company !== null) {
            return $account->company->commercial;
        }

        if ($account->user_id !== null && $account->user !== null) {
            $company = $account->user->company;
            if ($company !== null) {
                return $company->commercial;
            }
        }

        return null;
    }

    private function clientLabel(LoyaltyAccount $account): string
    {
        if ($account->company !== null) {
            return $account->company->name;
        }
        if ($account->user !== null) {
            return trim($account->user->first_name.' '.$account->user->last_name) ?: 'Client';
        }

        return 'Client';
    }
}
