<?php

namespace App\Jobs;

use App\Models\Company;
use App\Models\LoyaltyLedgerEntry;
use App\Models\User;
use App\Services\Loyalty\Rules\FleetBonusRule;
use App\Services\Loyalty\Rules\ProfileBonusRule;
use App\Services\Loyalty\Rules\ReferralBonusRule;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

class EvaluateCompanyBonusesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $companyId
    ) {}

    public function handle(): void
    {
        $company = Company::find($this->companyId);
        if (!$company) {
            return;
        }

        $loyaltyAccount = $company->loyaltyAccounts()->first();
        if (!$loyaltyAccount) {
            return;
        }

        $systemUser = User::where('email', 'admin@mayelia.sn')->first() ?? User::first();
        $adminId = $systemUser?->id;

        DB::transaction(function () use ($company, $loyaltyAccount, $adminId) {
            // Profile Bonus
            $profileRule = new ProfileBonusRule();
            $profilePoints = $profileRule->calculate($company);
            if ($profilePoints > 0) {
                $company->update(['bonus_profile_completed_awarded_at' => now()]);
                $this->creditBonus($loyaltyAccount, $profilePoints, 'bonus_profile', $adminId);
            }

            // Fleet Bonus
            $fleetRule = new FleetBonusRule();
            $fleetPoints = $fleetRule->calculate($company);
            if ($fleetPoints > 0) {
                $company->update(['bonus_fleet_awarded_at' => now()]);
                $this->creditBonus($loyaltyAccount, $fleetPoints, 'bonus_fleet', $adminId);
            }

            // Referral Bonus (Credit to Referrer)
            if ($company->referrer_company_id && !$company->bonus_referral_awarded_at) {
                $referrer = Company::find($company->referrer_company_id);
                $referrerAccount = $referrer?->loyaltyAccounts()->first();
                
                if ($referrerAccount) {
                    $referralRule = new ReferralBonusRule();
                    $refPoints = $referralRule->calculate($company);
                    if ($refPoints > 0) {
                        $company->update(['bonus_referral_awarded_at' => now()]);
                        $this->creditBonus($referrerAccount, $refPoints, 'bonus_referral', $adminId);
                    }
                }
            }
        });
    }

    private function creditBonus($loyaltyAccount, int $points, string $reason, ?int $adminId): void
    {
        $locked = \App\Models\LoyaltyAccount::whereKey($loyaltyAccount->id)->lockForUpdate()->first();
        $newBalance = $locked->points_balance + $points;
        $locked->update(['points_balance' => $newBalance]);

        LoyaltyLedgerEntry::create([
            'loyalty_account_id' => $locked->id,
            'type' => 'earn',
            'delta_points' => $points,
            'balance_after' => $newBalance,
            'source' => 'system_bonus',
            'idempotency_key' => $reason . '_' . $locked->id,
            'meta' => ['reason' => $reason],
            'created_by' => $adminId,
        ]);
    }
}
