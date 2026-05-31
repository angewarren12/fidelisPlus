<?php

namespace Database\Factories;

use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

class CompanyFactory extends Factory
{
    protected $model = Company::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->company,
            'type' => $this->faker->randomElement(['prospect', 'client']),
            'category' => $this->faker->randomElement(['entreprise', 'particulier']),
            'siret' => $this->faker->unique()->numerify('#########000##'),
            'address' => $this->faker->address,
            'account_balance' => $this->faker->randomFloat(2, 0, 100000),
            'kanban_stage' => 'nouveau_lead',
        ];
    }
}
