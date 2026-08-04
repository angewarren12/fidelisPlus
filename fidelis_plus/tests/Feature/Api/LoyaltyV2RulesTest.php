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

    public function test_points_calculation_based_on_segment(): void
    {
        $rules = new LoyaltyRulesService();

        LoyaltySetting::updateOrCreate(['key' => 'points_particulier'], ['value' => '5', 'type' => 'number']);
        LoyaltySetting::updateOrCreate(['key' => 'points_entreprise'], ['value' => '10', 'type' => 'number']);

        // Le programme ne gère que deux segments : particulier et entreprise.
        $entreprise = Company::factory()->create();
        $accEntreprise = LoyaltyAccount::factory()->create([
            'holder_type' => 'company',
            'company_id' => $entreprise->id,
        ]);
        $this->assertEquals(10, $rules->getPointsPerScan($accEntreprise));

        $accUser = LoyaltyAccount::factory()->create([
            'holder_type' => 'user',
            'user_id' => User::factory()->create()->id,
        ]);
        $this->assertEquals(5, $rules->getPointsPerScan($accUser));

        // Le réglage doit réellement piloter le calcul, pas juste être affiché.
        LoyaltySetting::where('key', 'points_particulier')->update(['value' => '7']);
        $this->assertEquals(7, $rules->getPointsPerScan($accUser->fresh()));
    }

    public function test_admin_can_update_settings(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
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
        $admin = User::factory()->create(['role' => 'super_admin']);
        
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
