<?php

namespace App\Services\Loyalty;

use App\Models\Company;
use App\Models\LoyaltyAccount;
use App\Models\LoyaltyMember;
use App\Models\User;

class LoyaltyAccountFactory
{
    /** Client fidélité propre au marketing (indépendant du CRM commercial). */
    public function firstOrCreateForMember(LoyaltyMember $member): LoyaltyAccount
    {
        $key = 'member:'.$member->id;

        return LoyaltyAccount::query()->firstOrCreate(
            ['holder_key' => $key],
            [
                'holder_type' => 'member',
                'company_id' => null,
                'user_id' => null,
                'loyalty_member_id' => $member->id,
                'points_balance' => 0,
            ]
        );
    }

    public function firstOrCreateForCompany(Company $company): LoyaltyAccount
    {
        $key = 'company:'.$company->id;

        return LoyaltyAccount::query()->firstOrCreate(
            ['holder_key' => $key],
            [
                'holder_type' => 'company',
                'company_id' => $company->id,
                'user_id' => null,
                'points_balance' => 0,
            ]
        );
    }

    public function firstOrCreateForClientUser(User $user): LoyaltyAccount
    {
        if ($user->role !== 'client') {
            throw new \InvalidArgumentException('Le compte utilisateur fidélité particulier concerne un utilisateur avec le rôle client.');
        }

        $key = 'user:'.$user->id;

        return LoyaltyAccount::query()->firstOrCreate(
            ['holder_key' => $key],
            [
                'holder_type' => 'user',
                'company_id' => null,
                'user_id' => $user->id,
                'points_balance' => 0,
            ]
        );
    }
}
