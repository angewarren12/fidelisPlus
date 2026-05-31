<?php

namespace App\Services\Loyalty\Rules;

use App\Models\Company;

class FleetBonusRule implements LoyaltyRuleInterface
{
    public function calculate(Company $company, array $context = []): int
    {
        // Déjà accordé
        if ($company->bonus_fleet_awarded_at !== null) {
            return 0;
        }

        $vehicleCount = $company->vehicles()->count();

        // Par exemple, on accorde le bonus de complétion de flotte à partir de 10 véhicules
        if ($vehicleCount >= 10) {
            return 200; // Bonus de 200 points
        }

        return 0;
    }
}
