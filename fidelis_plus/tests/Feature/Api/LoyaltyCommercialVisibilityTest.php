<?php

namespace Tests\Feature\Api;

use App\Models\Company;
use App\Models\LoyaltyAccount;
use App\Models\LoyaltyPosScanEvent;
use App\Models\Station;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LoyaltyCommercialVisibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_commercial_sees_only_accounts_in_portfolio(): void
    {
        $commercial = User::factory()->create(['role' => 'commercial']);
        $mine = Company::factory()->create(['commercial_id' => $commercial->id]);
        $foreign = Company::factory()->create(['commercial_id' => null]);

        $accMine = LoyaltyAccount::factory()->create([
            'holder_key' => 'company:'.$mine->id,
            'company_id' => $mine->id,
        ]);
        LoyaltyAccount::factory()->create([
            'holder_key' => 'company:'.$foreign->id,
            'company_id' => $foreign->id,
        ]);

        Sanctum::actingAs($commercial);
        $response = $this->getJson('/api/v1/loyalty/accounts?per_page=50');

        $response->assertOk();
        $items = $response->json('data');
        $this->assertCount(1, $items);
        $this->assertSame($accMine->id, $items[0]['id']);
    }

    public function test_commercial_cannot_show_foreign_loyalty_account(): void
    {
        $commercial = User::factory()->create(['role' => 'commercial']);
        $mine = Company::factory()->create(['commercial_id' => $commercial->id]);
        $foreign = Company::factory()->create(['commercial_id' => null]);
        $accForeign = LoyaltyAccount::factory()->create([
            'holder_key' => 'company:'.$foreign->id,
            'company_id' => $foreign->id,
        ]);

        Sanctum::actingAs($commercial);
        $this->getJson('/api/v1/loyalty/accounts/'.$accForeign->id)
            ->assertNotFound();
        $accMine = LoyaltyAccount::factory()->create([
            'holder_key' => 'company:mine-'.$mine->id,
            'company_id' => $mine->id,
        ]);
        $this->getJson('/api/v1/loyalty/accounts/'.$accMine->id)
            ->assertOk();
    }

    public function test_commercial_station_report_excludes_other_portfolio_scans(): void
    {
        $commercial = User::factory()->create(['role' => 'commercial']);
        $other = User::factory()->create(['role' => 'commercial']);
        $mine = Company::factory()->create(['commercial_id' => $commercial->id]);
        $theirs = Company::factory()->create(['commercial_id' => $other->id]);

        $accMine = LoyaltyAccount::factory()->create([
            'holder_key' => 'company:'.$mine->id,
            'company_id' => $mine->id,
        ]);
        $accTheirs = LoyaltyAccount::factory()->create([
            'holder_key' => 'company:'.$theirs->id,
            'company_id' => $theirs->id,
        ]);

        $caissier = User::factory()->caissier()->create();
        $station = Station::factory()->create();

        $day = Carbon::parse('2026-05-10 12:00:00', config('app.timezone'));

        Carbon::setTestNow($day->copy()->setTime(10, 0));
        LoyaltyPosScanEvent::query()->create([
            'idempotency_key' => 'k-mine',
            'qr_jti' => 'j-mine',
            'loyalty_account_id' => $accMine->id,
            'cashier_user_id' => $caissier->id,
            'station_id' => $station->id,
            'points_credited' => 5,
            'payload_hash' => str_repeat('a', 64),
            'device_id' => 'd1',
        ]);

        Carbon::setTestNow($day->copy()->setTime(11, 0));
        LoyaltyPosScanEvent::query()->create([
            'idempotency_key' => 'k-theirs',
            'qr_jti' => 'j-theirs',
            'loyalty_account_id' => $accTheirs->id,
            'cashier_user_id' => $caissier->id,
            'station_id' => $station->id,
            'points_credited' => 100,
            'payload_hash' => str_repeat('b', 64),
            'device_id' => 'd2',
        ]);
        Carbon::setTestNow();

        Sanctum::actingAs($commercial);
        $this->getJson('/api/v1/loyalty/reports/station-scans?date='.$day->format('Y-m-d'))
            ->assertOk()
            ->assertJsonPath('data.totals.scans_count', 1)
            ->assertJsonPath('data.totals.points_credited', 5);
    }

    public function test_commercial_adjust_returns_forbidden(): void
    {
        $commercial = User::factory()->create(['role' => 'commercial']);
        $company = Company::factory()->create(['commercial_id' => $commercial->id]);
        $account = LoyaltyAccount::factory()->create([
            'holder_key' => 'company:'.$company->id,
            'company_id' => $company->id,
        ]);

        Sanctum::actingAs($commercial);
        $this->postJson('/api/v1/loyalty/accounts/'.$account->id.'/adjust', [
            'delta_points' => 10,
            'reason' => 'Test',
        ])->assertForbidden();
    }
}
