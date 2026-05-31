<?php

namespace App\Services\Loyalty;

use App\Models\LoyaltyAccount;
use App\Models\LoyaltySetting;

class LoyaltyRulesService
{
    /**
     * Calcule le nombre de points par scan pour un compte donné.
     */
    public function getPointsPerScan(LoyaltyAccount $account): int
    {
        return 1;
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
