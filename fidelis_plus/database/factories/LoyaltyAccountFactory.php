<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\LoyaltyAccount;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<LoyaltyAccount>
 */
class LoyaltyAccountFactory extends Factory
{
    protected $model = LoyaltyAccount::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'holder_key' => 'company:'.Str::random(12),
            'holder_type' => 'company',
            'company_id' => Company::factory(),
            'user_id' => null,
            'points_balance' => 0,
            'blocked_at' => null,
        ];
    }
}
