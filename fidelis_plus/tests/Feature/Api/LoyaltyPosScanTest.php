<?php

namespace Tests\Feature\Api;

use App\Models\Company;
use App\Models\LoyaltyAccount;
use App\Models\LoyaltyPosScanEvent;
use App\Models\Notification;
use App\Models\Station;
use App\Models\User;
use App\Services\Loyalty\SignedLoyaltyQrService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LoyaltyPosScanTest extends TestCase
{
    use RefreshDatabase;

    private function makeQr(LoyaltyAccount $account, string $jti, int $expOffsetDays = 30, int $points = 5): string
    {
        $svc = app(SignedLoyaltyQrService::class);

        return $svc->encode([
            'account_uuid' => $account->public_uuid,
            'jti' => $jti,
            'exp' => now()->addDays($expOffsetDays)->getTimestamp(),
            'points_per_scan' => $points,
        ]);
    }

    private function scanPayload(string $qr, Station $station, string $idempotencyKey): array
    {
        return [
            'qr_payload' => $qr,
            'station_id' => $station->id,
            'device_id' => 'test-device',
            'occurred_at' => now()->toIso8601String(),
        ];
    }

    public function test_scan_notifies_assigned_commercial(): void
    {
        $commercial = User::factory()->create(['role' => 'commercial', 'company_id' => null]);
        $company = Company::factory()->create(['commercial_id' => $commercial->id]);
        $station = Station::factory()->create(['name' => 'Station Test']);
        $caissier = User::factory()->caissier()->create();
        $account = LoyaltyAccount::factory()->create([
            'company_id' => $company->id,
            'user_id' => null,
            'points_balance' => 0,
        ]);

        Sanctum::actingAs($caissier);

        $jti = (string) Str::uuid();
        $qr = $this->makeQr($account, $jti);
        $key = (string) Str::uuid();

        $this->postJson('/api/v1/loyalty/pos/scan', $this->scanPayload($qr, $station, $key), [
            'Idempotency-Key' => $key,
        ])->assertOk();

        $this->assertTrue(
            Notification::query()
                ->where('user_id', $commercial->id)
                ->where('type', 'loyalty_visit')
                ->exists()
        );
    }

    public function test_caissier_scan_credits_points(): void
    {
        $station = Station::factory()->create();
        $caissier = User::factory()->caissier()->create();
        $account = LoyaltyAccount::factory()->create(['points_balance' => 10]);

        Sanctum::actingAs($caissier);

        $jti = (string) Str::uuid();
        $qr = $this->makeQr($account, $jti);
        $key = (string) Str::uuid();

        $response = $this->postJson('/api/v1/loyalty/pos/scan', $this->scanPayload($qr, $station, $key), [
            'Idempotency-Key' => $key,
        ]);

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.points_credited', 1)
            ->assertJsonPath('data.new_balance', 11);

        $this->assertDatabaseHas('loyalty_accounts', [
            'id' => $account->id,
            'points_balance' => 11,
        ]);
    }

    public function test_same_idempotency_key_returns_409_with_duplicate_flag(): void
    {
        $station = Station::factory()->create();
        $caissier = User::factory()->caissier()->create();
        $account = LoyaltyAccount::factory()->create(['points_balance' => 0]);

        Sanctum::actingAs($caissier);

        $jti = (string) Str::uuid();
        $qr = $this->makeQr($account, $jti);
        $key = (string) Str::uuid();

        $this->postJson('/api/v1/loyalty/pos/scan', $this->scanPayload($qr, $station, $key), [
            'Idempotency-Key' => $key,
        ])->assertOk();

        $response = $this->postJson('/api/v1/loyalty/pos/scan', $this->scanPayload($qr, $station, $key), [
            'Idempotency-Key' => $key,
        ]);

        $response->assertStatus(409)
            ->assertJsonPath('data.duplicate', true)
            ->assertJsonPath('data.points_credited', 1);

        $this->assertSame(1, LoyaltyPosScanEvent::query()->count());
        $this->assertSame(1, $account->fresh()->points_balance);
    }

    public function test_same_qr_jti_twice_second_request_rejected(): void
    {
        $station = Station::factory()->create();
        $caissier = User::factory()->caissier()->create();
        $account = LoyaltyAccount::factory()->create(['points_balance' => 0]);

        Sanctum::actingAs($caissier);

        $jti = 'shared-jti-' . Str::random(8);
        $qr = $this->makeQr($account, $jti);

        $this->postJson('/api/v1/loyalty/pos/scan', $this->scanPayload($qr, $station, (string) Str::uuid()), [
            'Idempotency-Key' => (string) Str::uuid(),
        ])->assertOk();

        $response = $this->postJson('/api/v1/loyalty/pos/scan', $this->scanPayload($qr, $station, (string) Str::uuid()), [
            'Idempotency-Key' => (string) Str::uuid(),
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('status', 'error');

        $this->assertSame(1, $account->fresh()->points_balance);
    }

    public function test_expired_qr_returns_422(): void
    {
        $station = Station::factory()->create();
        $caissier = User::factory()->caissier()->create();
        $account = LoyaltyAccount::factory()->create();

        Sanctum::actingAs($caissier);

        $qr = $this->makeQr($account, (string) Str::uuid(), expOffsetDays: -1);

        $response = $this->postJson('/api/v1/loyalty/pos/scan', $this->scanPayload($qr, $station, (string) Str::uuid()), [
            'Idempotency-Key' => (string) Str::uuid(),
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Carte ou QR expiré.');
    }

    public function test_commercial_forbidden(): void
    {
        $station = Station::factory()->create();
        $commercial = User::factory()->create(['role' => 'commercial']);
        $account = LoyaltyAccount::factory()->create();

        Sanctum::actingAs($commercial);

        $qr = $this->makeQr($account, (string) Str::uuid());

        $response = $this->postJson('/api/v1/loyalty/pos/scan', $this->scanPayload($qr, $station, (string) Str::uuid()), [
            'Idempotency-Key' => (string) Str::uuid(),
        ]);

        $response->assertForbidden();
    }

    public function test_missing_idempotency_header_returns_422(): void
    {
        $station = Station::factory()->create();
        $caissier = User::factory()->caissier()->create();
        $account = LoyaltyAccount::factory()->create();

        Sanctum::actingAs($caissier);

        $qr = $this->makeQr($account, (string) Str::uuid());

        $response = $this->postJson('/api/v1/loyalty/pos/scan', $this->scanPayload($qr, $station, ''));

        $response->assertStatus(422);
    }

    public function test_blocked_account_returns_422(): void
    {
        $station = Station::factory()->create();
        $caissier = User::factory()->caissier()->create();
        $account = LoyaltyAccount::factory()->create([
            'blocked_at' => now(),
            'points_balance' => 0,
        ]);

        Sanctum::actingAs($caissier);

        $qr = $this->makeQr($account, (string) Str::uuid());

        $response = $this->postJson('/api/v1/loyalty/pos/scan', $this->scanPayload($qr, $station, (string) Str::uuid()), [
            'Idempotency-Key' => (string) Str::uuid(),
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Compte fidélité bloqué.');
    }
}
