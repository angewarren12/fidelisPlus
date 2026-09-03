<?php

namespace Database\Seeders;

use App\Models\LoyaltyAccount;
use App\Models\LoyaltyMember;
use App\Models\Station;
use App\Models\User;
use App\Services\Loyalty\LoyaltyAccountFactory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * SiraIntegrationTestSeeder
 *
 * Prépare l'environnement de préproduction pour que le développeur SIRA
 * puisse tester la collection Postman sans aucune intervention manuelle.
 *
 * Données créées :
 *  - 1 Station de scan active
 *  - 1 Utilisateur caissier (pour les scans POS)
 *  - 3 LoyaltyMember SIRA (1 validé + carte active, 1 pending particulier, 1 pending entreprise)
 *  - 1 LoyaltyAccount avec carte FID-0042 et 150 points
 *  - Véhicules liés aux membres
 *  - 3 LoyaltyPosScanEvents (historique de passages) sur le membre SIRA-DEV-TEST-001
 *
 * Utilisation :
 *   php artisan db:seed --class=SiraIntegrationTestSeeder
 *
 * Idempotent — peut être rejoué sans créer de doublons.
 */
class SiraIntegrationTestSeeder extends Seeder
{
    public function run(LoyaltyAccountFactory $factory): void
    {
        $this->command->info('🚀 SiraIntegrationTestSeeder — Démarrage...');

        // ─────────────────────────────────────────────────
        // 1. Station de scan (nécessaire pour les scan events)
        // ─────────────────────────────────────────────────
        $station = Station::firstOrCreate(
            ['name' => '[TEST] Station Abidjan Plateau'],
            [
                'location'                  => 'Plateau, Abidjan — Zone test préprod',
                'is_active'                 => true,
                'express_capacity_per_slot' => 2,
            ]
        );
        $this->command->line("  ✅ Station : #{$station->id} — {$station->name}");

        // ─────────────────────────────────────────────────
        // 2. Utilisateur caissier (pour signer les scans POS)
        // ─────────────────────────────────────────────────
        $caissier = User::firstOrCreate(
            ['email' => 'caissier.test@sira-preprod.ci'],
            [
                'first_name'           => 'Caissier',
                'last_name'            => 'Test SIRA',
                'password'             => Hash::make('TestSira2026!'),
                'role'                 => 'caissier',
                'must_change_password' => false,
            ]
        );
        $this->command->line("  ✅ Caissier : #{$caissier->id} — {$caissier->email}");

        // ─────────────────────────────────────────────────
        // 3. Membre SIRA-DEV-TEST-001 — VALIDÉ avec carte active
        //    ↳ Cible B1 (GET /loyalty/{id} → 200 OK) et D1 (historique)
        // ─────────────────────────────────────────────────
        $member1 = LoyaltyMember::firstOrCreate(
            ['sira_client_id' => 'SIRA-DEV-TEST-001'],
            [
                'type'                     => 'particulier',
                'nom'                      => 'KOUASSI',
                'prenom'                   => 'Jean',
                'contact'                  => '+2250700000099',
                'email'                    => 'test.dev@sira.ci',
                'source'                   => 'sira',
                'status'                   => 'validated',
                'sira_provisioning_status' => 'provisioned',
                'requested_at'             => now()->subDays(5),
            ]
        );

        // Compte fidélité + carte
        $account1 = $this->ensureAccount($factory, $member1, 'FID-0042', 150);
        $this->command->line("  ✅ Membre validé : SIRA-DEV-TEST-001 → Carte {$account1->card_number} — {$account1->points_balance} pts");

        // Véhicules
        $this->syncVehicles($member1, [
            ['sira_vehicle_id' => 'V-01', 'registration' => '9900-XX-01', 'brand' => 'TOYOTA',  'model' => 'Corolla', 'color' => 'Gris'],
            ['sira_vehicle_id' => 'V-02', 'registration' => '4411-YY-01', 'brand' => 'RENAULT', 'model' => 'Logan',   'color' => 'Blanc'],
        ]);
        $this->command->line("     ↳ 2 véhicule(s) liés");

        // Historique de passages pour D1/D2
        $this->createScanEvents($account1, $caissier, $station);
        $this->command->line("     ↳ 3 passage(s) en station créés");

        // ─────────────────────────────────────────────────
        // 4. Membre SIRA-DEV-PART-001 — EN ATTENTE (particulier)
        //    ↳ Cible A1 (première demande) et B2 (GET → 202 pending)
        // ─────────────────────────────────────────────────
        $member2 = LoyaltyMember::firstOrCreate(
            ['sira_client_id' => 'SIRA-DEV-PART-001'],
            [
                'type'                     => 'particulier',
                'nom'                      => 'DIALLO',
                'prenom'                   => 'Fatou',
                'contact'                  => '+2250700000001',
                'email'                    => 'jean.kouassi@test-sira.ci',
                'source'                   => 'sira',
                'status'                   => 'pending',
                'sira_provisioning_status' => 'not_applicable',
                'requested_at'             => now()->subHours(2),
            ]
        );

        $this->syncVehicles($member2, [
            ['sira_vehicle_id' => 'V-PART-101', 'registration' => '9900-AA-01', 'brand' => 'TOYOTA', 'model' => 'Corolla', 'color' => 'Gris Métallisé'],
            ['sira_vehicle_id' => 'V-PART-102', 'registration' => '1122-BB-01', 'brand' => 'HONDA',  'model' => 'Civic',   'color' => 'Blanc'],
        ]);
        $this->command->line("  ⏳ Membre pending : SIRA-DEV-PART-001 — {$member2->nom} {$member2->prenom}");

        // ─────────────────────────────────────────────────
        // 5. Membre SIRA-DEV-ENT-002 — EN ATTENTE (entreprise)
        //    ↳ Cible A2 et B2 (GET → 202 pending)
        // ─────────────────────────────────────────────────
        $member3 = LoyaltyMember::firstOrCreate(
            ['sira_client_id' => 'SIRA-DEV-ENT-002'],
            [
                'type'                     => 'entreprise',
                'nom_entreprise'           => 'TRANSPORTS ABIDJAN SARL',
                'contact'                  => '+2250707070707',
                'email'                    => 'fleet@transports-ci.com',
                'source'                   => 'sira',
                'status'                   => 'pending',
                'sira_provisioning_status' => 'not_applicable',
                'requested_at'             => now()->subHour(),
            ]
        );

        $this->syncVehicles($member3, [
            ['sira_vehicle_id' => 'V-ENT-201', 'registration' => '3300-CC-01', 'brand' => 'MERCEDES', 'model' => 'Sprinter', 'color' => 'Blanc'],
            ['sira_vehicle_id' => 'V-ENT-202', 'registration' => '4400-DD-01', 'brand' => 'RENAULT',  'model' => 'Master',   'color' => 'Gris'],
            ['sira_vehicle_id' => 'V-ENT-203', 'registration' => '5500-EE-01', 'brand' => 'IVECO',    'model' => 'Daily',    'color' => 'Blanc'],
        ]);
        $this->command->line("  ⏳ Membre pending : SIRA-DEV-ENT-002 — {$member3->nom_entreprise}");

        // ─────────────────────────────────────────────────
        // Résumé final
        // ─────────────────────────────────────────────────
        $this->command->newLine();
        $this->command->info('✅ SiraIntegrationTestSeeder terminé !');
        $this->command->newLine();
        $this->command->line('📋 Récapitulatif des données créées :');
        $this->command->table(
            ['Rôle dans les tests Postman', 'sira_client_id', 'Statut', 'Carte'],
            [
                ['B1 (200 OK — compte actif)', 'SIRA-DEV-TEST-001',  'validated', $account1->card_number . ' — ' . $account1->points_balance . ' pts'],
                ['B2 (202 — en attente)',       'SIRA-DEV-PART-001',  'pending',   'Aucune — en attente validation'],
                ['B2 (202 — en attente)',       'SIRA-DEV-ENT-002',   'pending',   'Aucune — en attente validation'],
                ['B3 (404 — introuvable)',      'SIRA-INEXISTANT-99999', 'N/A',    'N/A'],
            ]
        );
        $this->command->newLine();
        $this->command->warn('⚠️  Pour valider les membres pending : Backoffice → Marketing → Demandes de carte SIRA');
        $this->command->warn('⚠️  Communiquer le SIRA_API_TOKEN séparément (ne jamais mettre dans le JSON Postman partagé).');
    }

    // ─────────────────────────────────────────────
    // Helpers privés
    // ─────────────────────────────────────────────

    /**
     * Crée ou retrouve le LoyaltyAccount lié à un membre et force
     * le numéro de carte et le solde pour que les tests soient prédictibles.
     */
    private function ensureAccount(LoyaltyAccountFactory $factory, LoyaltyMember $member, string $cardNumber, int $points): LoyaltyAccount
    {
        $account = $factory->firstOrCreateForMember($member);

        $account->card_number    = $cardNumber;
        $account->points_balance = $points;
        $account->save();

        return $account->fresh();
    }

    /**
     * Remplace les véhicules du membre (idempotent — supprime puis recrée).
     */
    private function syncVehicles(LoyaltyMember $member, array $vehicles): void
    {
        DB::transaction(function () use ($member, $vehicles) {
            $member->vehicles()->delete();
            foreach ($vehicles as $v) {
                $member->vehicles()->create([
                    'sira_vehicle_id' => $v['sira_vehicle_id'] ?? null,
                    'registration'    => $v['registration'],
                    'brand'           => $v['brand'] ?? null,
                    'model'           => $v['model'] ?? null,
                    'color'           => $v['color'] ?? null,
                ]);
            }
        });
    }

    /**
     * Crée 3 passages en station pour peupler l'historique de points
     * visible via GET /loyalty/{siraClientId}/history (dossier D de la collection).
     */
    private function createScanEvents(LoyaltyAccount $account, User $caissier, Station $station): void
    {
        $events = [
            [
                'created_at'           => now()->subDays(7),
                'points_credited'      => 10,
                'vehicle_registration' => '9900-XX-01',
                'vehicle_brand'        => 'TOYOTA',
                'vehicle_color'        => 'Gris',
                'visit_type'           => 'Contrôle Technique',
            ],
            [
                'created_at'           => now()->subDays(4),
                'points_credited'      => 10,
                'vehicle_registration' => '4411-YY-01',
                'vehicle_brand'        => 'RENAULT',
                'vehicle_color'        => 'Blanc',
                'visit_type'           => 'Visite Technique',
            ],
            [
                'created_at'           => now()->subDay(),
                'points_credited'      => 10,
                'vehicle_registration' => '9900-XX-01',
                'vehicle_brand'        => 'TOYOTA',
                'vehicle_color'        => 'Gris',
                'visit_type'           => 'Vignette',
            ],
        ];

        foreach ($events as $evt) {
            $exists = DB::table('loyalty_pos_scan_events')
                ->where('loyalty_account_id', $account->id)
                ->where('vehicle_registration', $evt['vehicle_registration'])
                ->whereDate('created_at', $evt['created_at']->toDateString())
                ->exists();

            if ($exists) {
                continue;
            }

            $jti = 'seed-jti-' . Str::random(20);

            DB::table('loyalty_pos_scan_events')->insert([
                'idempotency_key'      => 'seed-' . Str::random(24),
                'qr_jti'               => $jti,
                'loyalty_account_id'   => $account->id,
                'cashier_user_id'      => $caissier->id,
                'station_id'           => $station->id,
                'points_credited'      => $evt['points_credited'],
                'vehicle_registration' => $evt['vehicle_registration'],
                'vehicle_brand'        => $evt['vehicle_brand'],
                'vehicle_color'        => $evt['vehicle_color'],
                'visit_type'           => $evt['visit_type'],
                'payload_hash'         => hash('sha256', $jti),
                'device_id'            => 'seed-device-preprod',
                'created_at'           => $evt['created_at'],
                'updated_at'           => $evt['created_at'],
            ]);
        }

        // Recalibrer le solde final à 150 pts pour la lisibilité
        $account->points_balance = 150;
        $account->save();
    }
}
