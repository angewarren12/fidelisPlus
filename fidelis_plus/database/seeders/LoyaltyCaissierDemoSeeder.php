<?php

namespace Database\Seeders;

use App\Models\LoyaltyAccount;
use App\Models\Station;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class LoyaltyCaissierDemoSeeder extends Seeder
{
    /**
     * Caissier démo + station + compte fidélité (pour tests scan).
     */
    public function run(): void
    {
        Station::query()->firstOrCreate(
            ['name' => 'Station démo Mayelia'],
            ['location' => 'Paris', 'express_capacity_per_slot' => 2]
        );

        User::query()->firstOrCreate(
            ['email' => 'caisse@mayelia.test'],
            [
                'role' => 'caissier',
                'company_id' => null,
                'first_name' => 'Caissier',
                'last_name' => 'Démo',
                'password' => Hash::make('caisse2026'),
                'phone' => null,
            ]
        );

        if (LoyaltyAccount::query()->doesntExist()) {
            LoyaltyAccount::factory()->create();
        }

        $this->command?->info('Identifiants test caisse : caisse@mayelia.test / caisse2026 — puis : php artisan loyalty:generate-test-qr');
    }
}
