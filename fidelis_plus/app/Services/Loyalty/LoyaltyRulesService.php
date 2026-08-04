<?php

namespace App\Services\Loyalty;

use App\Models\LoyaltyAccount;
use App\Models\LoyaltySetting;

class LoyaltyRulesService
{
    /**
     * Calcule le nombre de points par scan pour un compte donné, selon son segment
     * (particulier ou entreprise — les deux seuls segments gérés par le programme)
     * et les réglages configurés dans "Réglages Fidélité".
     */
    public function getPointsPerScan(LoyaltyAccount $account): int
    {
        if ($this->resolveSegment($account) === 'entreprise') {
            return (int) $this->getSetting('points_entreprise', 10);
        }

        return (int) $this->getSetting('points_particulier', 5);
    }

    /**
     * @return 'particulier'|'entreprise'
     */
    private function resolveSegment(LoyaltyAccount $account): string
    {
        if ($account->holder_type === 'company') {
            return 'entreprise';
        }

        if ($account->holder_type === 'member') {
            return $account->member?->type === 'entreprise' ? 'entreprise' : 'particulier';
        }

        return 'particulier';
    }

    /**
     * Bonus de parrainage.
     */
    public function getReferralBonus(): int
    {
        return (int) $this->getSetting('referral_bonus', 500);
    }

    /**
     * Récupère un paramètre depuis la base de données.
     */
    private function getSetting(string $key, $default)
    {
        $setting = LoyaltySetting::where('key', $key)->first();
        return $setting ? $setting->value : $default;
    }
}
