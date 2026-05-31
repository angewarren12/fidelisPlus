<?php

namespace Database\Factories;

use App\Models\Vehicle;
use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

class VehicleFactory extends Factory
{
    protected $model = Vehicle::class;

    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'license_plate' => $this->faker->unique()->numerify('AA-###-BB'),
            'brand' => $this->faker->company,
            'model' => $this->faker->word,
            'year' => 2020,
            'status' => 'a_jour',
        ];
    }
}
