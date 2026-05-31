<?php

namespace App\Services\Loyalty\Rules;

use App\Models\Company;

class LoyaltyRulesEngine
{
    /**
     * @param LoyaltyRuleInterface[] $rules
     */
    public function __construct(
        protected array $rules = []
    ) {}

    public static function defaultEngine(): self
    {
        return new self([
            new ScanPointsRule(),
        ]);
    }

    public function calculatePoints(Company $company, array $context = []): int
    {
        $total = 0;
        foreach ($this->rules as $rule) {
            $total += $rule->calculate($company, $context);
        }
        return max(0, $total);
    }
}
