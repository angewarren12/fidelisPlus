<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loyalty_settings', function (Blueprint $blueprint) {
            $blueprint->id();
            $blueprint->string('key')->unique();
            $blueprint->string('value')->nullable();
            $blueprint->string('label')->nullable();
            $blueprint->string('description', 1000)->nullable();
            $blueprint->string('type')->default('text'); // text, number, boolean
            $blueprint->timestamps();
        });

        // Seed initial values
        \Illuminate\Support\Facades\DB::table('loyalty_settings')->insert([
            [
                'key' => 'points_particulier',
                'value' => '5',
                'label' => 'Points par scan (Particulier)',
                'description' => 'Nombre de points attribués aux clients individuels.',
                'type' => 'number',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'points_tpe',
                'value' => '10',
                'label' => 'Points par scan (TPE)',
                'description' => 'Nombre de points attribués aux entreprises de type TPE.',
                'type' => 'number',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'points_pme',
                'value' => '15',
                'label' => 'Points par scan (PME)',
                'description' => 'Nombre de points attribués aux entreprises de type PME.',
                'type' => 'number',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'points_grande_flotte',
                'value' => '25',
                'label' => 'Points par scan (Grande Flotte)',
                'description' => 'Nombre de points attribués aux entreprises de type Grande Flotte.',
                'type' => 'number',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'referral_bonus',
                'value' => '500',
                'label' => 'Bonus Parrainage',
                'description' => 'Points offerts au parrain lors d\'une conversion réussie.',
                'type' => 'number',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_settings');
    }
};
