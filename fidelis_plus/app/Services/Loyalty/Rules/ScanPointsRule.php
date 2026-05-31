<?php

namespace App\Services\Loyalty\Rules;

use App\Models\Company;

class ScanPointsRule implements LoyaltyRuleInterface
{
    public function calculate(Company $company, array $context = []): int
    {
        return 1;
    }
}
