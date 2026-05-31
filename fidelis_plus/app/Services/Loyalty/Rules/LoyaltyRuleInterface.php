<?php

namespace App\Services\Loyalty\Rules;

use App\Models\Company;

interface LoyaltyRuleInterface
{
    /**
     * Calcule le nombre de points à attribuer.
     * 
     * @param Company $company
     * @param array $context Données additionnelles (ex: event type, station)
     * @return int Le nombre de points (0 si la règle ne s'applique pas)
     */
    public function calculate(Company $company, array $context = []): int;
}
