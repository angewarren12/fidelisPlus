<?php

namespace App\Services\Loyalty\Rules;

use App\Models\Company;

class ReferralBonusRule implements LoyaltyRuleInterface
{
    /**
     * Calcule le bonus de parrainage.
     * Dans ce contexte, on veut attribuer des points au PARRAIN.
     * Note: Cette règle sera appelée dans un contexte spécial (création de compte).
     */
    public function calculate(Company $company, array $context = []): int
    {
        // Si l'entreprise passée est celle qui vient d'être créée,
        // on vérifie si elle a un parrain.
        if ($company->referrer_company_id) {
            return (int) config('loyalty.referral_bonus_points', 500);
        }

        return 0;
    }
}
