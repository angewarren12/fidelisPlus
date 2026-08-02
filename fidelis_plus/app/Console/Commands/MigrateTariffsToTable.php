<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('tariffs:migrate-from-settings')]
#[Description('Migre les tarifs stockés dans la table settings vers la nouvelle table tariffs.')]
class MigrateTariffsToTable extends Command
{
    public function handle()
    {
        $this->info('Début de la migration des tarifs...');
        $count = 0;

        // ────────────── VISITE TECHNIQUE ──────────────
        $vtNames = [
            'utilitaire_inf7cv_ptac35'   => 'Utilitaire ≤7CV, PTAC ≤3.5t',
            'utilitaire_sup7cv_ptac35'   => 'Utilitaire >7CV, PTAC ≤3.5t',
            'ptac_3_10t'                 => 'PTAC 3 à 10 t',
            'ptac_10t_plus'              => 'PTAC >10 t',
            'perso_inf7cv_9places'       => 'Personnel ≤7CV, ≤9 places',
            'perso_sup7cv_9places'       => 'Personnel >7CV, ≤9 places',
            'perso_sup7cv_24places'      => 'Personnel >7CV, ≤24 places',
            'perso_sup7cv_25plus'        => 'Personnel >7CV, ≥25 places',
            'compteur_noro'              => 'Compteur / Noro',
            'moto_125_600'               => 'Moto (125 à 600 cm³)',
            'tricycle'                   => 'Tricycle',
            'quadricycle'                => 'Quadricycle',
        ];

        $vtRow = \Illuminate\Support\Facades\DB::table('settings')->where('key', 'pricing.visite_technique')->first();
        $vtPrices = $vtRow ? json_decode($vtRow->value, true) : [];
        foreach ((array) $vtPrices as $code => $prices) {
            \App\Models\Tariff::updateOrCreate(
                ['code' => $code],
                [
                    'type'   => 'visite_technique',
                    'name'   => $vtNames[$code] ?? $code,
                    'prices' => $prices,
                ]
            );
            $this->line("  ✓ visite_technique/{$code}");
            $count++;
        }

        // ────────────── VIGNETTE ──────────────
        $vigNames = [
            'moto_small'     => 'Moto (petite cylindrée)',
            'moto_large'     => 'Moto (grande cylindrée)',
            'auto_2_4cv'     => 'Auto (2-4 CV)',
            'auto_5_7cv'     => 'Auto (5-7 CV)',
            'auto_8_11cv'    => 'Auto (8-11 CV)',
            'auto_12_15cv'   => 'Auto (12-15 CV)',
            'camion_16cv'    => 'Camion (≥16 CV)',
            'tourisme_16cv'  => 'Tourisme (≥16 CV)',
        ];

        $vigRow = \Illuminate\Support\Facades\DB::table('settings')->where('key', 'pricing.vignette')->first();
        $vigPrices = $vigRow ? json_decode($vigRow->value, true) : [];
        foreach ((array) $vigPrices as $code => $prices) {
            \App\Models\Tariff::updateOrCreate(
                ['code' => $code],
                [
                    'type'   => 'vignette',
                    'name'   => $vigNames[$code] ?? $code,
                    'prices' => $prices,
                ]
            );
            $this->line("  ✓ vignette/{$code}");
            $count++;
        }

        $this->info("Migration terminée. {$count} tarifs créés ou mis à jour.");
    }
}
