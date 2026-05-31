<?php

namespace Tests\Feature\Api;

use App\Models\Company;
use App\Models\LoyaltyAccount;
use App\Models\LoyaltySetting;
use App\Models\User;
use App\Services\Loyalty\LoyaltyRulesService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoyaltyV2RulesTest extends TestCase
{
    use RefreshDatabase;

    public function test_points_calculation_based_on_company_type(): void
    {
        $rules = new LoyaltyRulesService();

        // 1. TPE
        $tpe = Company::factory()->create(['company_type' => 'TPE']);
        $accTpe = LoyaltyAccount::factory()->create([
            'holder_type' => 'company',
            'company_id' => $tpe->id
        ]);
        
        $this->assertEquals(1, $rules->getPointsPerScan($accTpe));

        // 2. Grande Flotte
        $gf = Company::factory()->create(['company_type' => 'Grande Flotte']);
        $accGf = LoyaltyAccount::factory()->create([
            'holder_type' => 'company',
            'company_id' => $gf->id
        ]);
        $this->assertEquals(1, $rules->getPointsPerScan($accGf));

        // 3. Particulier
        $accUser = LoyaltyAccount::factory()->create([
            'holder_type' => 'user',
            'user_id' => User::factory()->create()->id
        ]);
        $this->assertEquals(1, $rules->getPointsPerScan($accUser));
    }

    public function test_admin_can_update_settings(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $setting = LoyaltySetting::where('key', 'referral_bonus')->first();
        if (!$setting) {
             $setting = LoyaltySetting::create(['key' => 'referral_bonus', 'value' => '500', 'type' => 'number']);
        }

        $response = $this->actingAs($admin)
            ->putJson("/api/v1/loyalty/settings/{$setting->id}", [
                'value' => '750'
            ]);

        $response->assertStatus(200);
        $this->assertEquals('750', $setting->fresh()->value);
    }

    public function test_activity_feed_returns_recent_scans(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        
        // Create a scan
        $acc = LoyaltyAccount::factory()->create();
        $station = \App\Models\Station::factory()->create();
        \App\Models\LoyaltyPosScanEvent::create([
            'idempotency_key' => 'test-key',
            'qr_jti' => 'test-jti',
            'loyalty_account_id' => $acc->id,
            'cashier_user_id' => $admin->id,
            'station_id' => $station->id,
            'points_credited' => 10,
            'payload_hash' => 'hash'
        ]);

        $response = $this->actingAs($admin)->getJson("/api/v1/loyalty/activity");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonCount(1, 'data');
    }

    public function test_marketing_can_get_backoffice_activity(): void
    {
        $marketing = User::factory()->create(['role' => 'marketing']);

        $this->actingAs($marketing)
            ->getJson('/api/v1/loyalty/activity')
            ->assertStatus(200)
            ->assertJsonPath('status', 'success');
    }
}
