<?php

namespace App\Services\Loyalty;

use App\Models\LoyaltyAccount;
use App\Models\LoyaltyRedemption;
use App\Models\LoyaltyReward;

class LoyaltyMilestoneService
{
    public function processScan(LoyaltyAccount $account, int &$basePoints): void
    {
        $basePoints = 1; // 1 véhicule / 1 visite = 1 point

        if ($account->holder_type === 'company' && $account->company) {
            $account->total_vehicles_referred += 1;
            $vc = $account->total_vehicles_referred;
            
            // Palier 20 : Bon d'achat 10 000 FCFA
            if ($vc >= 20 && $account->milestone_flotte_20_reached_at === null) {
                $account->milestone_flotte_20_reached_at = \Carbon\Carbon::now();
                $this->grantAutomaticReward($account, "Bon d'achat 10 000 FCFA (Palier 20)");
            }
            
            // Palier 30 : Bon d'achat 15 000 FCFA
            if ($vc >= 30) {
                $has30 = LoyaltyRedemption::where('loyalty_account_id', $account->id)
                    ->whereHas('reward', function ($q) {
                        $q->where('name', "Bon d'achat 15 000 FCFA (Palier 30)");
                    })->exists();
                if (!$has30) {
                    $this->grantAutomaticReward($account, "Bon d'achat 15 000 FCFA (Palier 30)");
                }
            }
            
            // Palier 50 : Bon d'achat 25 000 FCFA + Visite technique offerte
            if ($vc >= 50 && $account->milestone_flotte_50_reached_at === null) {
                $account->milestone_flotte_50_reached_at = \Carbon\Carbon::now();
                $account->milestone_apporteur_50_reached_at = \Carbon\Carbon::now();
                $this->grantAutomaticReward($account, "Bon d'achat 25 000 FCFA + Visite technique offerte (Palier 50)");
            }
        } elseif ($account->holder_type === 'user') {
            // Particulier : 5 passages = Visite offerte
            $account->total_vehicles_referred += 1;
            $vc = $account->total_vehicles_referred;

            if ($vc % 5 === 0) {
                $this->grantAutomaticReward($account, "Visite technique offerte (Fidélité 5 passages)");
            }
        }
    }

    private function grantAutomaticReward(LoyaltyAccount $account, string $rewardName): void
    {
        // On modélise cela comme une redemption 'pending' d'une fausse récompense
        // ou bien on associe avec une vraie récompense en base.
        $reward = LoyaltyReward::firstOrCreate(
            ['name' => $rewardName],
            [
                'points_cost' => 0, 
                'is_active' => true,
                'description' => 'Récompense débloquée automatiquement via le système de paliers.'
            ]
        );

        LoyaltyRedemption::create([
            'loyalty_account_id' => $account->id,
            'loyalty_reward_id' => $reward->id,
            'points_cost' => 0,
            'status' => 'pending',
            'notes' => 'Débloqué automatiquement suite au franchissement d\'un palier de véhicules.',
        ]);
    }
}
