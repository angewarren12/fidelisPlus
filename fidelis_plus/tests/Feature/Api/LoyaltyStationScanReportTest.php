<?php

namespace Tests\Feature\Api;

use App\Models\LoyaltyAccount;
use App\Models\LoyaltyPosScanEvent;
use App\Models\Station;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LoyaltyStationScanReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_marketing_can_get_daily_report_by_date(): void
    {
        $marketing = User::factory()->create(['role' => 'marketing', 'company_id' => null]);
        $caissier = User::factory()->caissier()->create();
        $station = Station::factory()->create(['name' => 'Station A']);
        $account = LoyaltyAccount::factory()->create();

        Carbon::setTestNow(Carbon::parse('2026-05-10 14:30:00', config('app.timezone')));
        $day = Carbon::now();
        LoyaltyPosScanEvent::query()->create([
            'idempotency_key' => 'key-1',
            'qr_jti' => 'jti-1',
            'loyalty_account_id' => $account->id,
            'cashier_user_id' => $caissier->id,
            'station_id' => $station->id,
            'points_credited' => 5,
            'payload_hash' => str_repeat('a', 64),
            'device_id' => 'd1',
        ]);
        Carbon::setTestNow();

        Sanctum::actingAs($marketing);

        $response = $this->getJson('/api/v1/loyalty/reports/station-scans?date='.$day->format('Y-m-d'));

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.totals.scans_count', 1)
            ->assertJsonPath('data.totals.points_credited', 5)
            ->assertJsonPath('data.by_station.0.station_name', 'Station A');
    }

    public function test_marketing_can_get_range_report(): void
    {
        $marketing = User::factory()->create(['role' => 'marketing', 'company_id' => null]);
        $caissier = User::factory()->caissier()->create();
        $station = Station::factory()->create();
        $account = LoyaltyAccount::factory()->create();

        foreach (
            [
                ['k1', 'j1', '2026-05-01 10:00:00'],
                ['k2', 'j2', '2026-05-03 11:00:00'],
            ] as [$ik, $jti, $time]
        ) {
            Carbon::setTestNow(Carbon::parse($time, config('app.timezone')));
            LoyaltyPosScanEvent::query()->create([
                'idempotency_key' => $ik,
                'qr_jti' => $jti,
                'loyalty_account_id' => $account->id,
                'cashier_user_id' => $caissier->id,
                'station_id' => $station->id,
                'points_credited' => 10,
                'payload_hash' => str_repeat('b', 64),
            ]);
        }
        Carbon::setTestNow();

        Sanctum::actingAs($marketing);

        $rep = $this->getJson('/api/v1/loyalty/reports/station-scans?from=2026-05-01&to=2026-05-31');
        $rep->assertOk()
            ->assertJsonPath('data.totals.scans_count', 2);
        $byDay = $rep->json('data.by_day');
        $this->assertCount(2, $byDay);
        $this->assertSame(1, (int) collect($byDay)->firstWhere('day', '2026-05-01')['scans_count']);
        $this->assertSame(1, (int) collect($byDay)->firstWhere('day', '2026-05-03')['scans_count']);
    }

    public function test_commercial_can_call_report_with_empty_portfolio(): void
    {
        $commercial = User::factory()->create(['role' => 'commercial']);
        Sanctum::actingAs($commercial);

        $this->getJson('/api/v1/loyalty/reports/station-scans?date=2026-05-01')
            ->assertOk()
            ->assertJsonPath('data.totals.scans_count', 0);
    }
}
