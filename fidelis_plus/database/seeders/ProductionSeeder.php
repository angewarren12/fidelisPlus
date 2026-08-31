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
        $users = [
            [
                'first_name' => 'Admin',
                'last_name'  => 'Fidelis',
                'email'      => 'admin@fidelis.ci',
                'login'      => 'admin',
                'password'   => Hash::make('FidelisAdmin2026!'),
                'role'       => 'super_admin',
            ],
            [
                'first_name' => 'Commercial',
                'last_name'  => 'Mayelia',
                'email'      => 'commercial@fidelis.ci',
                'login'      => 'commercial',
                'password'   => Hash::make('FidelisAdmin2026!'),
                'role'       => 'commercial',
            ],
            [
                'first_name' => 'Marketing',
                'last_name'  => 'Mayelia',
                'email'      => 'marketing@fidelis.ci',
                'login'      => 'marketing',
                'password'   => Hash::make('FidelisAdmin2026!'),
                'role'       => 'marketing',
            ],
            [
                'first_name' => 'Caissier',
                'last_name'  => 'Station',
                'email'      => 'caissier@fidelis.ci',
                'login'      => 'caissier',
                'password'   => Hash::make('FidelisAdmin2026!'),
                'role'       => 'caissier',
            ],
        ];

        foreach ($users as $userData) {
            $user = User::where('email', $userData['email'])->first();
            if (!$user) {
                User::create($userData);
                $this->command?->info("Utilisateur {$userData['email']} cree.");
            } else {
                $user->update([
                    'first_name' => $userData['first_name'],
                    'last_name'  => $userData['last_name'],
                    'login'      => $userData['login'],
                    'password'   => $userData['password'],
                    'role'       => $userData['role'],
                ]);
                $this->command?->info("Utilisateur {$userData['email']} mis a jour.");
            }
        }

        // 2. STATIONS
        $stations = [
            ['name' => 'Mayelia Cocody',   'location' => 'Boulevard de France', 'is_active' => true],
            ['name' => 'Mayelia Marcory',  'location' => 'Zone 4',              'is_active' => true],
            ['name' => 'Mayelia Yopougon', 'location' => 'Keneya',              'is_active' => true],
        ];

        foreach ($stations as $stationData) {
            Station::firstOrCreate(
                ['name' => $stationData['name']],
                $stationData
            );
        }
        $this->command?->info('Stations synchronisees.');

        // 3. CATALOGUE RECOMPENSES FIDELITE
        $rewards = [
            // Particuliers
            ['name' => 'Bon lavage 5 000F',                              'points_cost' => 10,  'is_active' => true, 'client_segments' => ['particulier']],
            ['name' => 'Bon carburant 5 000F',                           'points_cost' => 15,  'is_active' => true, 'client_segments' => ['particulier']],
            ['name' => 'Recharge telephonique 1 000F',                   'points_cost' => 2,   'is_active' => true, 'client_segments' => ['particulier']],
            ['name' => 'Diagnostic Technique Offert',                    'points_cost' => 5,   'is_active' => true, 'client_segments' => ['particulier']],
            ['name' => 'Senteur Mayelia',                                'points_cost' => 1,   'is_active' => true, 'client_segments' => ['particulier']],
            ['name' => 'Visite technique offerte (Fidelite 5 passages)', 'points_cost' => 0,   'is_active' => true, 'client_segments' => ['particulier']],
            // Professionnels
            ['name' => "Bon d'achat 10 000 FCFA (Palier 20)",            'points_cost' => 0,   'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']],
            ['name' => "Bon d'achat 15 000 FCFA (Palier 30)",            'points_cost' => 0,   'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']],
            ['name' => "Bon d'achat 25 000 FCFA + Visite (Palier 50)",   'points_cost' => 0,   'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']],
            ['name' => 'Diagnostic Technique Professionnel Offert',      'points_cost' => 50,  'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']],
            ['name' => 'Visite Technique Offerte',                       'points_cost' => 100, 'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']],
            ['name' => "Bons d'achats Carburant 10 000F",                'points_cost' => 20,  'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']],
            ['name' => 'Bons de vidange',                                'points_cost' => 40,  'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']],
            ['name' => "Bons d'achats lavage complet auto",              'points_cost' => 15,  'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']],
            ['name' => "Bons d'achat Super Marche 20 000F",              'points_cost' => 45,  'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']],
            ['name' => 'Bons entretiens vehicule',                       'points_cost' => 60,  'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']],
            // Commun
            ['name' => 'Jeux / Tombola',                                 'points_cost' => 5,   'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage', 'particulier']],
        ];

        foreach ($rewards as $rewardData) {
            LoyaltyReward::firstOrCreate(
                ['name' => $rewardData['name']],
                $rewardData
            );
        }
        $this->command?->info('Catalogue de recompenses synchronise.');
        $this->command?->info('Seeder de production termine.');
    }
}
