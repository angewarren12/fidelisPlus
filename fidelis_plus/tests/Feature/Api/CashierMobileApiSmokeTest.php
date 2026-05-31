<?php

namespace Tests\Feature\Api;

use App\Models\LoyaltyAccount;
use App\Models\Station;
use App\Models\User;
use App\Services\Loyalty\SignedLoyaltyQrService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Couverture du périmètre API utilisé par l’app mobile caisse (Sanctum + stations + scan fidélité).
 */
class CashierMobileApiSmokeTest extends TestCase
{
    use RefreshDatabase;

    private function makeSignedQr(LoyaltyAccount $account, string $jti): string
    {
        $svc = app(SignedLoyaltyQrService::class);

        return $svc->encode([
            'account_uuid' => $account->public_uuid,
            'jti' => $jti,
            'exp' => now()->addDays(30)->getTimestamp(),
            'points_per_scan' => 5,
        ]);
    }

    public function test_caissier_mobile_flow_login_me_stations_scan(): void
    {
        $caissier = User::factory()->caissier()->create();

        $login = $this->postJson('/api/v1/auth/login', [
            'login' => $caissier->email,
            'password' => 'password',
        ]);

        $login->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonStructure(['data' => ['token', 'token_type', 'user']]);

        $token = $login->json('data.token');
        $this->assertNotEmpty($token);

        $headers = [
            'Authorization' => 'Bearer '.$token,
            'Accept' => 'application/json',
        ];

        $this->getJson('/api/v1/auth/me', $headers)
            ->assertOk()
            ->assertJsonPath('data.role', 'caissier');

        $station = Station::factory()->create(['name' => 'Magasin centre']);
        $this->getJson('/api/v1/stations', $headers)
            ->assertOk()
            ->assertJsonPath('data.0.id', $station->id);

        $account = LoyaltyAccount::factory()->create(['points_balance' => 0]);
        $jti = (string) Str::uuid();
        $qr = $this->makeSignedQr($account, $jti);
        $idem = (string) Str::uuid();

        $this->postJson(
            '/api/v1/loyalty/pos/scan',
            [
                'qr_payload' => $qr,
                'station_id' => $station->id,
                'device_id' => 'smoke-test-device',
                'occurred_at' => now()->toIso8601String(),
            ],
            $headers + ['Idempotency-Key' => $idem]
        )->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.points_credited', 1);
    }

    public function test_caissier_can_list_notifications_without_error(): void
    {
        $caissier = User::factory()->caissier()->create();
        Sanctum::actingAs($caissier);

        $this->getJson('/api/v1/notifications', ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('status', 'success');
    }
}
