<?php

namespace Database\Seeders;

use App\Models\LoyaltyReward;
use App\Models\Station;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Seeder minimaliste de PRODUCTION.
 *
 * Crée uniquement les données strictement nécessaires pour démarrer l application :
 *   1. Comptes utilisateurs de l equipe (admin, commercial, marketing, caissier)
 *   2. Stations de service
 *   3. Catalogue de recompenses fidelite
 *
 * Idempotent : protege par des verifications "si vide" sur chaque entite.
 * Aucune donnee fictive (clients, prospects, vehicules) n est inseree.
 */
class ProductionSeeder extends Seeder
{
    public function run(): void
    {
        // 1. UTILISATEURS EQUIPE
        if (User::query()->count() === 0) {
            User::create([
                'first_name' => 'Admin',
                'last_name'  => 'Fidelis',
                'email'      => 'admin@fidelis.ci',
                'login'      => 'admin',
                'password'   => Hash::make('FidelisAdmin2026!'),
                'role'       => 'super_admin',
            ]);
            User::create([
                'first_name' => 'Commercial',
                'last_name'  => 'Mayelia',
                'email'      => 'commercial@fidelis.ci',
                'login'      => 'commercial',
                'password'   => Hash::make('FidelisAdmin2026!'),
                'role'       => 'commercial',
            ]);
            User::create([
                'first_name' => 'Marketing',
                'last_name'  => 'Mayelia',
                'email'      => 'marketing@fidelis.ci',
                'login'      => 'marketing',
                'password'   => Hash::make('FidelisAdmin2026!'),
                'role'       => 'marketing',
            ]);
            User::create([
                'first_name' => 'Caissier',
                'last_name'  => 'Station',
                'email'      => 'caissier@fidelis.ci',
                'login'      => 'caissier',
                'password'   => Hash::make('FidelisAdmin2026!'),
                'role'       => 'caissier',
            ]);
            $this->command?->info('Utilisateurs crees.');
        } else {
            $this->command?->info('Utilisateurs deja presents - skip.');
        }

        // 2. STATIONS
        if (Station::query()->count() === 0) {
            Station::create(['name' => 'Mayelia Cocody',   'location' => 'Boulevard de France', 'is_active' => true]);
            Station::create(['name' => 'Mayelia Marcory',  'location' => 'Zone 4',              'is_active' => true]);
            Station::create(['name' => 'Mayelia Yopougon', 'location' => 'Keneya',              'is_active' => true]);
            $this->command?->info('Stations creees.');
        } else {
            $this->command?->info('Stations deja presentes - skip.');
        }

        // 3. CATALOGUE RECOMPENSES FIDELITE
        if (LoyaltyReward::query()->count() === 0) {
            // Particuliers
            LoyaltyReward::create(['name' => 'Bon lavage 5 000F',                              'points_cost' => 10,  'is_active' => true, 'client_segments' => ['particulier']]);
            LoyaltyReward::create(['name' => 'Bon carburant 5 000F',                           'points_cost' => 15,  'is_active' => true, 'client_segments' => ['particulier']]);
            LoyaltyReward::create(['name' => 'Recharge telephonique 1 000F',                   'points_cost' => 2,   'is_active' => true, 'client_segments' => ['particulier']]);
            LoyaltyReward::create(['name' => 'Diagnostic Technique Offert',                    'points_cost' => 5,   'is_active' => true, 'client_segments' => ['particulier']]);
            LoyaltyReward::create(['name' => 'Senteur Mayelia',                                'points_cost' => 1,   'is_active' => true, 'client_segments' => ['particulier']]);
            LoyaltyReward::create(['name' => 'Visite technique offerte (Fidelite 5 passages)', 'points_cost' => 0,   'is_active' => true, 'client_segments' => ['particulier']]);
            // Professionnels
            LoyaltyReward::create(['name' => "Bon d'achat 10 000 FCFA (Palier 20)",            'points_cost' => 0,   'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']]);
            LoyaltyReward::create(['name' => "Bon d'achat 15 000 FCFA (Palier 30)",            'points_cost' => 0,   'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']]);
            LoyaltyReward::create(['name' => "Bon d'achat 25 000 FCFA + Visite (Palier 50)",   'points_cost' => 0,   'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']]);
            LoyaltyReward::create(['name' => 'Diagnostic Technique Professionnel Offert',      'points_cost' => 50,  'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']]);
            LoyaltyReward::create(['name' => 'Visite Technique Offerte',                       'points_cost' => 100, 'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']]);
            LoyaltyReward::create(['name' => "Bons d'achats Carburant 10 000F",                'points_cost' => 20,  'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']]);
            LoyaltyReward::create(['name' => 'Bons de vidange',                                'points_cost' => 40,  'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']]);
            LoyaltyReward::create(['name' => "Bons d'achats lavage complet auto",              'points_cost' => 15,  'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']]);
            LoyaltyReward::create(['name' => "Bons d'achat Super Marche 20 000F",              'points_cost' => 45,  'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']]);
            LoyaltyReward::create(['name' => 'Bons entretiens vehicule',                       'points_cost' => 60,  'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']]);
            // Commun
            LoyaltyReward::create(['name' => 'Jeux / Tombola',                                 'points_cost' => 5,   'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage', 'particulier']]);
            $this->command?->info('Catalogue de recompenses cree.');
        } else {
            $this->command?->info('Recompenses deja presentes - skip.');
        }

        $this->command?->info('Seeder de production termine.');
    }
}
