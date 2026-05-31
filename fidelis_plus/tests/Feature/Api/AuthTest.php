<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Models\Company;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_login_with_correct_credentials()
    {
        $company = Company::factory()->create();
        $user = User::factory()->create([
            'email' => 'test@mayelia.com',
            'password' => \Hash::make('password'),
            'company_id' => $company->id
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'login' => 'test@mayelia.com',
            'password' => 'password',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'user',
                    'token'
                ]
            ]);
    }

    public function test_user_cannot_login_with_wrong_password()
    {
        $user = User::factory()->create([
            'email' => 'test@mayelia.com',
            'password' => \Hash::make('password'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'login' => 'test@mayelia.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(401);
    }

    public function test_authenticated_user_can_access_me_profile()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/auth/me');

        $response->assertStatus(200)
            ->assertJsonPath('data.email', $user->email);
    }

    public function test_user_can_update_fcm_token()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->patchJson('/api/v1/auth/fcm-token', [
            'fcm_token' => 'sample-token-123'
        ]);

        $response->assertStatus(200);
        $this->assertEquals('sample-token-123', $user->fresh()->fcm_token);
    }
}
