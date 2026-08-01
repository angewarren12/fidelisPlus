<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Setting;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            ['key' => 'quote.appointment.max_slots_per_day', 'value' => 3],
            ['key' => 'quote.appointment.price', 'value' => 0],
            ['key' => 'pricing.visite_technique', 'value' => [
                'utilitaire_inf7cv_ptac35' => ['visite' => 13700, 'revisite' => 12350, 'volontaire' => 12300],
                'utilitaire_sup7cv_ptac35' => ['visite' => 16100, 'revisite' => 12350, 'volontaire' => 12300],
                'ptac_3_10t' => ['visite' => 18600, 'revisite' => 14700, 'volontaire' => null],
                'ptac_10t_plus' => ['visite' => 21050, 'revisite' => 14700, 'volontaire' => null],
                'perso_inf7cv_9places' => ['visite' => 13700, 'revisite' => 12380, 'volontaire' => 12300],
                'perso_sup7cv_9places' => ['visite' => 16100, 'revisite' => 12350, 'volontaire' => 12300],
                'perso_sup7cv_24places' => ['visite' => 18600, 'revisite' => 12350, 'volontaire' => 12300],
                'perso_sup7cv_25plus' => ['visite' => 21050, 'revisite' => 12350, 'volontaire' => 12300],
                'compteur_noro' => ['visite' => 3250, 'revisite' => 3250, 'volontaire' => 3250],
                'moto_125_600' => ['visite' => 8500, 'revisite' => 5000, 'volontaire' => 5000],
                'tricycle' => ['visite' => 8500, 'revisite' => 5000, 'volontaire' => 5000],
                'quadricycle' => ['visite' => 8500, 'revisite' => 5000, 'volontaire' => 5000]
            ]],
            ['key' => 'pricing.vignette', 'value' => [
                'moto_small' => ['recent' => 5000, 'medium' => 3750, 'old' => 3500],
                'moto_large' => ['recent' => 12000, 'medium' => 9000, 'old' => 6000],
                'auto_2_4cv' => ['recent' => 19000, 'medium' => 14250, 'old' => 13500],
                'auto_5_7cv' => ['recent' => 35000, 'medium' => 26250, 'old' => 25000],
                'auto_8_11cv' => ['recent' => 49000, 'medium' => 36750, 'old' => 30000],
                'auto_12_15cv' => ['recent' => 96000, 'medium' => 72000, 'old' => 40000],
                'camion_16cv' => ['recent' => 190000, 'medium' => 142500, 'old' => 80000],
                'tourisme_16cv' => ['recent_1_2' => 250000, 'recent_3_4' => 190000, 'medium' => 142500, 'old' => 80000]
            ]]
        ];

        foreach ($settings as $setting) {
            Setting::updateOrCreate(
                ['key' => $setting['key']],
                ['value' => $setting['value']]
            );
        }
    }
}
