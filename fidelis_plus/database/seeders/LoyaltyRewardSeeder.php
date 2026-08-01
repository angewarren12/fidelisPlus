<?php

namespace Database\Seeders;

use App\Models\LoyaltyReward;
use Illuminate\Database\Seeder;

class LoyaltyRewardSeeder extends Seeder
{
    public function run(): void
    {
        $rewards = [
            ['name' => 'Bon d\'achat Soccocé 15 000 F', 'points_cost' => 50, 'sort_order' => 1],
            ['name' => 'Bon d\'achat Soccocé 15 000 F + bon carburant 15 000 F', 'points_cost' => 100, 'sort_order' => 2],
            ['name' => 'Phone X', 'points_cost' => 300, 'sort_order' => 3],
            ['name' => 'Télévision + 1 mois d\'abonnement Canal+', 'points_cost' => 500, 'sort_order' => 4],
            ['name' => 'Moto tricycle', 'points_cost' => 600, 'sort_order' => 5],
            ['name' => 'Bons d\'achat d\'une valeur de 300 000 F', 'points_cost' => 1000, 'sort_order' => 6],
            ['name' => 'iPhone 17 Pro Max + 150 000 F', 'points_cost' => 5000, 'sort_order' => 7],
            ['name' => 'Bons d\'achat d\'une valeur de 500 000 F', 'points_cost' => 10000, 'sort_order' => 8],
        ];

        foreach ($rewards as $reward) {
            LoyaltyReward::updateOrCreate(
                ['name' => $reward['name']],
                [
                    'points_cost' => $reward['points_cost'],
                    'sort_order' => $reward['sort_order'],
                    'is_active' => true,
                ],
            );
        }
    }
}
