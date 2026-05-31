<?php

namespace App\Services\Loyalty\Rules;

use App\Models\Company;

class ProfileBonusRule implements LoyaltyRuleInterface
{
    public function calculate(Company $company, array $context = []): int
    {
        // Si le bonus de profil a déjà été accordé, on ne le redonne pas.
        if ($company->bonus_profile_completed_awarded_at !== null) {
            return 0;
        }

        // Exemple de vérification (email + telephone)
        $hasContactInfo = $company->contacts()->whereNotNull('email')->whereNotNull('phone')->exists();
        
        if ($hasContactInfo) {
            return 50; // 50 points de bonus
        }

        return 0;
    }
}
