<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Models\Company;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_can_only_see_their_own_vehicles()
    {
        // 1. Création de deux clients
        $companyA = Company::factory()->create();
        $userA = User::factory()->create(['company_id' => $companyA->id, 'role' => 'client']);
        Vehicle::factory()->create(['company_id' => $companyA->id, 'license_plate' => 'AA-111-AA']);

        $companyB = Company::factory()->create();
        Vehicle::factory()->create(['company_id' => $companyB->id, 'license_plate' => 'BB-222-BB']);

        // 2. Le client A demande la liste des véhicules
        $response = $this->actingAs($userA, 'sanctum')->getJson('/api/v1/vehicles');

        // 3. Vérification : il ne doit voir QUE son véhicule (AA-111-AA)
        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
        $response->assertJsonPath('data.0.license_plate', 'AA-111-AA');
    }

    public function test_commercial_can_only_see_their_clients_vehicles()
    {
        $commercial = User::factory()->create(['role' => 'commercial']);
        
        $companyA = Company::factory()->create(['commercial_id' => $commercial->id]);
        Vehicle::factory()->create(['company_id' => $companyA->id]);
        
        $companyB = Company::factory()->create(); // Another commercial
        Vehicle::factory()->create(['company_id' => $companyB->id]);

        $response = $this->actingAs($commercial, 'sanctum')->getJson('/api/v1/vehicles');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }

    public function test_client_cannot_access_quotes_module()
    {
        $client = User::factory()->create(['role' => 'client']);

        $response = $this->actingAs($client, 'sanctum')->getJson('/api/v1/quotes');

        // Doit renvoyer une erreur 403 Access Denied
        $response->assertStatus(403);
    }

    public function test_marketing_cannot_access_crm_vehicles_or_team()
    {
        $marketing = User::factory()->create(['role' => 'marketing']);

        $this->actingAs($marketing, 'sanctum')->getJson('/api/v1/vehicles')->assertStatus(403);
        $this->actingAs($marketing, 'sanctum')->getJson('/api/v1/team')->assertStatus(403);
    }

    public function test_only_admin_can_reassign_commercial_clients()
    {
        $commercial = User::factory()->create(['role' => 'commercial']);
        $other = User::factory()->create(['role' => 'commercial']);

        $this->actingAs($commercial, 'sanctum')
            ->postJson("/api/v1/team/{$commercial->id}/reassign", ['new_commercial_id' => $other->id])
            ->assertStatus(403);
    }
}
