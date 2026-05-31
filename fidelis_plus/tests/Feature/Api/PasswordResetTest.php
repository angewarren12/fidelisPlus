<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_reset_password_returns_error_for_invalid_token(): void
    {
        $user = User::factory()->create();

        $response = $this->postJson('/api/v1/auth/reset-password', [
            'email' => $user->email,
            'token' => 'invalid-token-plain',
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('status', 'error');
        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }

    public function test_reset_password_succeeds_with_valid_token(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('old-password'),
        ]);

        $plainToken = Password::broker()->createToken($user);

        $response = $this->postJson('/api/v1/auth/reset-password', [
            'email' => $user->email,
            'token' => $plainToken,
            'password' => 'new-secure-pass-8',
            'password_confirmation' => 'new-secure-pass-8',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success');
        $this->assertTrue(Hash::check('new-secure-pass-8', $user->fresh()->password));
    }
}
