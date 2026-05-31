<?php

namespace Tests\Feature\Api;

use App\Models\SupportRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SupportIndexTest extends TestCase
{
    use RefreshDatabase;

    public function test_commercial_sees_all_support_requests_in_queue(): void
    {
        $clientA = User::factory()->create();
        $clientB = User::factory()->create();
        $commercial = User::factory()->create(['role' => 'commercial', 'company_id' => null]);

        SupportRequest::create([
            'user_id' => $clientA->id,
            'subject' => 'A',
            'message' => 'msg a',
            'status' => 'open',
            'priority' => 'low',
        ]);
        SupportRequest::create([
            'user_id' => $clientB->id,
            'subject' => 'B',
            'message' => 'msg b',
            'status' => 'open',
            'priority' => 'low',
        ]);

        $response = $this->actingAs($commercial, 'sanctum')->getJson('/api/v1/support');

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success');
        $this->assertCount(2, $response->json('data'));
        $response->assertJsonStructure([
            'meta' => ['current_page', 'last_page', 'per_page', 'total'],
        ]);
    }

    public function test_client_sees_only_own_support_requests(): void
    {
        $clientA = User::factory()->create();
        $clientB = User::factory()->create();

        SupportRequest::create([
            'user_id' => $clientA->id,
            'subject' => 'Mine',
            'message' => 'x',
            'status' => 'open',
            'priority' => 'low',
        ]);
        SupportRequest::create([
            'user_id' => $clientB->id,
            'subject' => 'Other',
            'message' => 'y',
            'status' => 'open',
            'priority' => 'low',
        ]);

        $response = $this->actingAs($clientA, 'sanctum')->getJson('/api/v1/support');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
        $response->assertJsonPath('data.0.subject', 'Mine');
    }
}
