<?php

namespace Database\Factories;

use App\Models\Station;
use Illuminate\Database\Eloquent\Factories\Factory;

class StationFactory extends Factory
{
    protected $model = Station::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->city,
            'location' => $this->faker->address,
            'express_capacity_per_slot' => 2,
        ];
    }
}
