<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Le programme ne distingue que deux segments (particulier / entreprise — voir
 * LoyaltyMember::type et le préfixe de carte FID-/ENT-), pas les quatre paliers
 * TPE/PME/Grande Flotte hérités d'un ancien modèle jamais réellement branché.
 * On aligne les réglages fidélité configurables sur cette réalité.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('loyalty_settings')->whereIn('key', ['points_tpe', 'points_pme', 'points_grande_flotte'])->delete();

        if (! DB::table('loyalty_settings')->where('key', 'points_entreprise')->exists()) {
            DB::table('loyalty_settings')->insert([
                'key' => 'points_entreprise',
                'value' => '10',
                'label' => 'Points par scan (Entreprise)',
                'description' => 'Nombre de points attribués aux comptes entreprise (flotte, garage, apporteur) à chaque scan.',
                'type' => 'number',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        DB::table('loyalty_settings')->where('key', 'points_particulier')->update([
            'description' => 'Nombre de points attribués aux comptes particulier à chaque scan.',
        ]);
    }

    public function down(): void
    {
        DB::table('loyalty_settings')->where('key', 'points_entreprise')->delete();

        DB::table('loyalty_settings')->insert([
            ['key' => 'points_tpe', 'value' => '10', 'label' => 'Points par scan (TPE)', 'description' => null, 'type' => 'number', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'points_pme', 'value' => '15', 'label' => 'Points par scan (PME)', 'description' => null, 'type' => 'number', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'points_grande_flotte', 'value' => '25', 'label' => 'Points par scan (Grande Flotte)', 'description' => null, 'type' => 'number', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }
};
