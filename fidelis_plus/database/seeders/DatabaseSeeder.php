<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Appointment;
use App\Models\CommercialKpiTarget;
use App\Models\LoyaltyAccount;
use App\Models\LoyaltyLedgerEntry;
use App\Models\LoyaltyRedemption;
use App\Models\LoyaltyPosScanEvent;
use App\Models\LoyaltyReward;
use App\Models\LoyaltySetting;
use App\Models\Document;
use App\Models\Note;
use App\Models\Notification;
use App\Models\Station;
use App\Models\SupportRequest;
use App\Models\User;
use App\Models\Quote;
use App\Models\QuoteItem;
use App\Models\QuoteRequest;
use App\Models\Visit;
use App\Models\Vehicle;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // "Empty only" : la partie core (users/stations/companies/loyalty POS...) ne s'exécute
        // que si la table users est vide, pour éviter les doublons quand on relance.
        if (User::query()->count() !== 0) {
            $this->command?->info('DatabaseSeeder: users non vides, seed core skip.');
        } else {
            // 1. UTILISATEURS ÉQUIPE
            $admin = User::create([
                'first_name' => 'Admin',
                'last_name' => 'Fidelis',
                'email' => 'admin@fidelis.ci',
                'login' => 'admin',
                'password' => Hash::make('password'),
                'role' => 'admin',
            ]);

            $marketing = User::create([
                'first_name' => 'Sarah',
                'last_name' => 'Marketing',
                'email' => 'marketing@fidelis.ci',
                'login' => 'marketing',
                'password' => Hash::make('password'),
                'role' => 'marketing',
            ]);

            $comm1 = User::create([
                'first_name' => 'Jean',
                'last_name' => 'Commercial',
                'email' => 'jean@fidelis.ci',
                'login' => 'jean',
                'password' => Hash::make('password'),
                'role' => 'commercial',
            ]);

            $comm2 = User::create([
                'first_name' => 'Marie',
                'last_name' => 'Vente',
                'email' => 'marie@fidelis.ci',
                'login' => 'marie',
                'password' => Hash::make('password'),
                'role' => 'commercial',
            ]);

            // 2. CAISSIERS (STATIONS)
            $caissier1 = User::create([
                'first_name' => 'Bakary',
                'last_name' => 'Station',
                'email' => 'bakary@station.ci',
                'login' => 'bakary',
                'password' => Hash::make('password'),
                'role' => 'caissier',
            ]);

            // 3. STATIONS
            $st1 = Station::create(['name' => 'Mayelia Cocody', 'location' => 'Boulevard de France', 'is_active' => true]);
            $st2 = Station::create(['name' => 'Mayelia Marcory', 'location' => 'Zone 4', 'is_active' => true]);
            $st3 = Station::create(['name' => 'Mayelia Yopougon', 'location' => 'Keneya', 'is_active' => true]);

            // 5. RÉCOMPENSES
            // Récompenses Particuliers
            LoyaltyReward::create(['name' => 'Bon lavage 5 000F', 'points_cost' => 10, 'is_active' => true, 'client_segments' => ['particulier']]);
            LoyaltyReward::create(['name' => 'Bon carburant 5 000F', 'points_cost' => 15, 'is_active' => true, 'client_segments' => ['particulier']]);
            LoyaltyReward::create(['name' => 'Recharge téléphonique 1 000F', 'points_cost' => 2, 'is_active' => true, 'client_segments' => ['particulier']]);
            LoyaltyReward::create(['name' => 'Diagnostic Technique Offert', 'points_cost' => 5, 'is_active' => true, 'client_segments' => ['particulier']]);
            LoyaltyReward::create(['name' => 'Senteur Mayelia', 'points_cost' => 1, 'is_active' => true, 'client_segments' => ['particulier']]);
            LoyaltyReward::create(['name' => 'Visite technique offerte (Fidélité 5 passages)', 'points_cost' => 0, 'is_active' => true, 'client_segments' => ['particulier']]);

            // Récompenses Professionnels & Apporteurs (Paliers Automatiques et Catalogue)
            LoyaltyReward::create(['name' => "Bon d'achat 10 000 FCFA (Palier 20)", 'points_cost' => 0, 'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']]);
            LoyaltyReward::create(['name' => "Bon d'achat 15 000 FCFA (Palier 30)", 'points_cost' => 0, 'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']]);
            LoyaltyReward::create(['name' => "Bon d'achat 25 000 FCFA + Visite technique offerte (Palier 50)", 'points_cost' => 0, 'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']]);
            LoyaltyReward::create(['name' => 'Diagnostic Technique Professionnel Offert', 'points_cost' => 50, 'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']]);
            LoyaltyReward::create(['name' => 'Visite Technique Offerte', 'points_cost' => 100, 'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']]);
            LoyaltyReward::create(['name' => 'Bons d\'achats Carburant 10 000F', 'points_cost' => 20, 'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']]);
            LoyaltyReward::create(['name' => 'Bons de vidange', 'points_cost' => 40, 'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']]);
            LoyaltyReward::create(['name' => 'Bons d\'achats lavage complet auto', 'points_cost' => 15, 'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']]);
            LoyaltyReward::create(['name' => 'Bons d\'achat Super Marché 20 000F', 'points_cost' => 45, 'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']]);
            LoyaltyReward::create(['name' => 'Bons entretiens véhicule', 'points_cost' => 60, 'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage']]);
            LoyaltyReward::create(['name' => 'Jeux / Tombola', 'points_cost' => 5, 'is_active' => true, 'client_segments' => ['flotte', 'apporteur', 'garage', 'particulier']]);

            // 6. PROSPECTS (COMMERCIAL 1)
            $p1 = Company::create([
                'commercial_id' => $comm1->id,
                'name' => 'Transport Express SARL',
                'category' => 'entreprise',
                'company_type' => 'garage',
                'kanban_stage' => 'nouveau_lead',
                'temperature' => 'chaud',
                'is_active' => false,
            ]);

            $p2 = Company::create([
                'commercial_id' => $comm1->id,
                'name' => 'BTP Côte d\'Ivoire',
                'category' => 'entreprise',
                'company_type' => 'flotte',
                'kanban_stage' => 'negociation',
                'temperature' => 'tiede',
                'is_active' => false,
            ]);

            // 7. CLIENTS ACTIFS (COMMERCIAL 2)
            $c1 = Company::create([
                'commercial_id' => $comm2->id,
                'name' => 'Logistique Plus SA',
                'category' => 'entreprise',
                'company_type' => 'flotte',
                'kanban_stage' => 'converti',
                'is_active' => true,
                'converted_at' => now()->subMonths(2),
            ]);

            $c2 = Company::create([
                'commercial_id' => $comm2->id,
                'name' => 'Boulangerie Moderne',
                'category' => 'entreprise',
                'company_type' => 'apporteur',
                'kanban_stage' => 'converti',
                'is_active' => true,
                'converted_at' => now()->subMonth(),
            ]);

            // 8. VÉHICULES
            Vehicle::create(['company_id' => $c1->id, 'license_plate' => 'AA-123-BB', 'brand' => 'Toyota', 'model' => 'Hilux', 'status' => 'a_jour']);
            Vehicle::create(['company_id' => $c1->id, 'license_plate' => 'CC-456-DD', 'brand' => 'Mitsubishi', 'model' => 'L200', 'status' => 'a_jour']);
            Vehicle::create(['company_id' => $c1->id, 'license_plate' => 'GG-001-HH', 'brand' => 'Isuzu', 'model' => 'D-Max', 'status' => 'bientot']);
            Vehicle::create(['company_id' => $c1->id, 'license_plate' => 'II-002-JJ', 'brand' => 'Nissan', 'model' => 'Navara', 'status' => 'en_retard']);
            Vehicle::create(['company_id' => $c2->id, 'license_plate' => 'EE-789-FF', 'brand' => 'Renault', 'model' => 'Kangoo', 'status' => 'a_jour']);
            $transportExpressVehicle = Vehicle::create([
                'company_id' => $p1->id,
                'license_plate' => 'TX-101-SARL',
                'brand' => 'Hyundai',
                'model' => 'H1',
                'status' => 'a_jour',
            ]);

            // 9. COMPTES FIDÉLITÉ
            $acc1 = LoyaltyAccount::create([
                'holder_type' => 'company',
                'company_id' => $c1->id,
                'holder_key' => 'LOGPLUS-FID',
                'public_uuid' => (string) Str::uuid(),
                'points_balance' => 1250,
            ]);

            $acc2 = LoyaltyAccount::create([
                'holder_type' => 'company',
                'company_id' => $c2->id,
                'holder_key' => 'BOULMOD-FID',
                'public_uuid' => (string) Str::uuid(),
                'points_balance' => 45,
            ]);

            // Particulier
            $clientUser = User::create([
                'first_name' => 'Amadou',
                'last_name' => 'Kone',
                'email' => 'amadou@gmail.com',
                'login' => 'amadou',
                'password' => Hash::make('password'),
                'role' => 'client',
            ]);

            $acc3 = LoyaltyAccount::create([
                'holder_type' => 'user',
                'user_id' => $clientUser->id,
                'holder_key' => 'AMADOU-K',
                'public_uuid' => (string) Str::uuid(),
                'points_balance' => 120,
            ]);

            // 10. HISTORIQUE DE SCANS
            LoyaltyPosScanEvent::create([
                'idempotency_key' => Str::random(32),
                'qr_jti' => Str::random(16),
                'loyalty_account_id' => $acc1->id,
                'cashier_user_id' => $caissier1->id,
                'station_id' => $st1->id,
                'points_credited' => 25, // Grande Flotte
                'payload_hash' => hash('sha256', 'dummy1'),
                'created_at' => now()->subDay(),
            ]);

            LoyaltyPosScanEvent::create([
                'idempotency_key' => Str::random(32),
                'qr_jti' => Str::random(16),
                'loyalty_account_id' => $acc3->id,
                'cashier_user_id' => $caissier1->id,
                'station_id' => $st2->id,
                'points_credited' => 5, // Particulier
                'payload_hash' => hash('sha256', 'dummy2'),
                'created_at' => now()->subHours(2),
            ]);

            // 10.b Demande de devis dédiée : Transport Express SARL (1 seul véhicule)
            $transportClientUser = User::create([
                'first_name' => 'Moussa',
                'last_name' => 'Traore',
                'email' => 'transport.express.client@fidelis.ci',
                'login' => 'transport.express',
                'password' => Hash::make('password'),
                'role' => 'client',
                'company_id' => $p1->id,
            ]);

            QuoteRequest::create([
                'user_id' => $transportClientUser->id,
                'company_id' => $p1->id,
                'vehicle_id' => $transportExpressVehicle->id,
                'registration_image' => '/seed/quote/transport-express-registration.jpg',
                'vignette_image' => '/seed/quote/transport-express-vignette.jpg',
                'status' => 'pending',
                'notes' => 'Demande de devis initiale Transport Express SARL',
                'created_at' => now()->subHours(6),
                'updated_at' => now()->subHours(6),
            ]);

        } // end core seed (users empty)

        // 11. Données de démo complémentaires (couvrent les tables applicatives)
        $anyCompany = Company::query()->first();
        $anyVehicle = Vehicle::query()->first();
        $anyStation = Station::query()->first();
        $anyUser = User::query()->first();
        $anyCommercial = User::query()->where('role', 'commercial')->first();

        // 11.1 Rendez-vous + visites
        if ($anyCompany && $anyVehicle && $anyStation && Appointment::query()->count() === 0) {
            Appointment::create([
                'company_id' => $anyCompany->id,
                'vehicle_id' => $anyVehicle->id,
                'station_id' => $anyStation->id,
                'appointment_date' => now()->addDays(3),
                'is_pass_express' => false,
                'status' => 'confirme',
            ]);
        }

        // Visites (si table vide, indépendamment de l'état de appointments)
        if ($anyVehicle && Visit::query()->count() === 0) {
            $appointment = Appointment::query()->first();
            if ($appointment) {
                Visit::create([
                    'appointment_id' => $appointment->id,
                    'vehicle_id' => $anyVehicle->id,
                    'result' => 'favorable',
                    'report_pdf_url' => '/seed/reports/visit-demo.pdf',
                    'diagnostics_summary' => ['ok' => true, 'notes' => 'Démo'],
                    'created_at' => now()->subDay(),
                    'updated_at' => now()->subDay(),
                ]);
            }
        }

        // 11.2 Notifications
        if ($anyUser && Notification::query()->count() === 0) {
            Notification::create([
                'user_id' => $anyUser->id,
                'title' => 'Bienvenue',
                'body' => 'Données de démo chargées avec succès.',
                'type' => 'alert',
                'action' => 'dashboard',
                'priority' => 'normal',
                'channel' => 'both',
                'data' => ['seed' => true],
                'read_at' => null,
            ]);
        }

        // 11.3 Support (ticket)
        if ($anyUser && SupportRequest::query()->count() === 0) {
            SupportRequest::create([
                'user_id' => $anyUser->id,
                'subject' => 'Demande d’information',
                'message' => 'Bonjour, j’ai besoin d’aide concernant la carte fidélité.',
                'staff_reply' => null,
                'status' => 'open',
                'priority' => 'medium',
                'created_at' => now()->subDays(2),
                'updated_at' => now()->subDays(2),
            ]);
        }

        // 11.4 Notes (pour la fiche client)
        if ($anyCompany && $anyUser && Note::query()->count() === 0) {
            Note::create([
                'company_id' => $anyCompany->id,
                'user_id' => $anyUser->id,
                'content' => 'Note de démo : relance effectuée.',
                'created_at' => now()->subDays(1),
                'updated_at' => now()->subDays(1),
            ]);
        }

        // 11.5 Documents polymorphiques
        if ($anyCompany && $anyVehicle && Document::query()->count() === 0) {
            $anyVisit = Visit::query()->first();

            Document::create([
                'documentable_id' => $anyCompany->id,
                'documentable_type' => Company::class,
                'name' => 'Pièce justificative société',
                'path' => '/seed/documents/company-demo.pdf',
                'type' => 'pdf',
                'meta' => ['seed' => true],
            ]);

            Document::create([
                'documentable_id' => $anyVehicle->id,
                'documentable_type' => Vehicle::class,
                'name' => 'Carte grise',
                'path' => '/seed/documents/vehicle-demo.pdf',
                'type' => 'pdf',
                'meta' => ['seed' => true],
            ]);

            if ($anyVisit) {
                Document::create([
                    'documentable_id' => $anyVisit->id,
                    'documentable_type' => Visit::class,
                    'name' => 'Rapport visite',
                    'path' => '/seed/documents/visit-demo.pdf',
                    'type' => 'pdf',
                    'meta' => ['seed' => true],
                ]);
            }
        }

        // 11.6 Quotes / quote_requests / quote_items / pivot quote_vehicle
        if ($anyCompany && $anyVehicle && $anyUser && QuoteRequest::query()->count() === 0) {
            QuoteRequest::create([
                'user_id' => $anyUser->id,
                'company_id' => $anyCompany->id,
                'vehicle_id' => $anyVehicle->id,
                'registration_image' => '/seed/quote/registration.jpg',
                'vignette_image' => '/seed/quote/vignette.jpg',
                'status' => 'pending',
                'notes' => 'Demande générée par le seeder',
                'created_at' => now()->subDays(1),
                'updated_at' => now()->subDays(1),
            ]);
        }

        $quoteRequest = QuoteRequest::query()->first();

        if ($anyCompany && $quoteRequest && Quote::query()->count() === 0) {
            $quote = Quote::create([
                'company_id' => $anyCompany->id,
                'quote_request_id' => $quoteRequest->id,
                'quote_number' => 'Q-0001',
                'status' => 'draft',
                'total_amount' => 250000,
                'valid_until' => now()->addMonth(),
            ]);

            if (QuoteItem::query()->count() === 0) {
                QuoteItem::create([
                    'quote_id' => $quote->id,
                    'description' => 'Diagnostic + prestation',
                    'price' => 250000,
                    'quantity' => 1,
                ]);
            }

            if (DB::table('quote_vehicle')->count() === 0) {
                $quote->vehicles()->attach($anyVehicle->id);
            }
        }

        // Si la quote existe mais les dépendances sont vides, on les complète aussi.
        $existingQuote = Quote::query()->first();
        if ($anyCompany && $existingQuote) {
            if (QuoteItem::query()->count() === 0) {
                QuoteItem::create([
                    'quote_id' => $existingQuote->id,
                    'description' => 'Diagnostic + prestation',
                    'price' => 250000,
                    'quantity' => 1,
                ]);
            }

            if (DB::table('quote_vehicle')->count() === 0 && $anyVehicle) {
                $existingQuote->vehicles()->attach($anyVehicle->id);
            }
        }

        // 11.7 KPI commerciaux
        if ($anyCommercial && CommercialKpiTarget::query()->count() === 0) {
            $year = (int) now()->year;
            CommercialKpiTarget::create([
                'commercial_id' => $anyCommercial->id,
                'period_type' => 'month',
                'period_year' => $year,
                'period_month' => (int) now()->month,
                'period_quarter' => null,
                'target_clients' => 30,
                'target_revenue_signed' => 5000000,
                'created_by' => $anyCommercial->id,
            ]);
        }

        // 11.8 Loyalty : ledger entries + redemptions
        $anyLoyaltyAccount = LoyaltyAccount::query()->first();
        $anyLoyaltyReward = LoyaltyReward::query()->first();
        $anyHandler = User::query()->whereIn('role', ['admin', 'marketing'])->first() ?? $anyUser;

        if ($anyLoyaltyAccount && $anyLoyaltyReward && LoyaltyLedgerEntry::query()->count() === 0) {
            $startPoints = (int) ($anyLoyaltyAccount->points_balance ?? 0);
            LoyaltyLedgerEntry::create([
                'loyalty_account_id' => $anyLoyaltyAccount->id,
                'type' => 'credit',
                'delta_points' => 10,
                'balance_after' => $startPoints + 10,
                'source' => 'seed',
                'idempotency_key' => 'seed-' . Str::random(16),
                'meta' => ['seed' => true],
                'created_by' => $anyHandler?->id,
            ]);
        }

        if ($anyLoyaltyAccount && $anyLoyaltyReward && LoyaltyRedemption::query()->count() === 0) {
            LoyaltyRedemption::create([
                'loyalty_account_id' => $anyLoyaltyAccount->id,
                'loyalty_reward_id' => $anyLoyaltyReward->id,
                'points_cost' => (int) $anyLoyaltyReward->points_cost,
                'status' => 'pending',
                'notes' => 'Demande de démo',
                'handled_by' => $anyHandler?->id,
                'created_at' => now()->subDays(3),
                'updated_at' => now()->subDays(3),
            ]);
        }
    }
}
