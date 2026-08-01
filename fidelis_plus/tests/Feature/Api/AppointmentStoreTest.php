<?php

namespace Tests\Feature\Api;

use App\Models\Company;
use App\Models\Station;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppointmentStoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_fails_when_user_has_no_company_id(): void
    {
        $station = Station::factory()->create();
        $company = Company::factory()->create();
        $vehicle = Vehicle::factory()->create(['company_id' => $company->id]);

        $user = User::factory()->create([
            'role' => 'admin',
            'company_id' => null,
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/appointments', [
            'vehicle_ids' => [$vehicle->id],
            'station_id' => $station->id,
            'appointment_date' => now()->addDay()->format('Y-m-d') . ' 10:30:00',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('status', 'error');
    }

    public function test_store_forbidden_when_vehicle_belongs_to_another_company(): void
    {
        $companyA = Company::factory()->create();
        $companyB = Company::factory()->create();
        $station = Station::factory()->create();
        $vehicleB = Vehicle::factory()->create(['company_id' => $companyB->id]);

        $userA = User::factory()->create([
            'role' => 'client',
            'company_id' => $companyA->id,
        ]);

        $response = $this->actingAs($userA, 'sanctum')->postJson('/api/v1/appointments', [
            'vehicle_ids' => [$vehicleB->id],
            'station_id' => $station->id,
            'appointment_date' => now()->addDay()->format('Y-m-d') . ' 10:30:00',
        ]);

        $response->assertStatus(403)
            ->assertJsonPath('status', 'error');
    }

    public function test_store_succeeds_when_vehicle_matches_user_company(): void
    {
        $company = Company::factory()->create();
        $station = Station::factory()->create(['express_capacity_per_slot' => 5]);
        $vehicle = Vehicle::factory()->create(['company_id' => $company->id]);

        $user = User::factory()->create([
            'role' => 'client',
            'company_id' => $company->id,
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/v1/appointments', [
            'vehicle_ids' => [$vehicle->id],
            'station_id' => $station->id,
            'appointment_date' => now()->addDays(2)->format('Y-m-d') . ' 08:30:00',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success');
    }
}
