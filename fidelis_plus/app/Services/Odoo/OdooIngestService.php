<?php

namespace App\Services\Odoo;

use App\Models\Company;
use App\Models\Quote;
use App\Models\User;
use App\Models\Vehicle;
use App\Services\NotificationService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Intègre en base les enregistrements récupérés depuis Odoo par le cron de pull
 * (voir App\Console\Commands\SyncFromOdoo et OdooClient::fetchUpdated*()).
 *
 * Principe important : l'ingestion ne déclenche JAMAIS les notifications/emails
 * clients existants (NotificationService, Mail::send) — c'est une simple mise à
 * jour de données, pas un événement métier initié côté FidelisPlus. C'est la
 * façon dont on évite les doublons de notification avec ce qu'Odoo a pu déjà
 * envoyer de son côté (point retenu lors de la séance de travail avec leur équipe).
 *
 * Format des payloads : champs réels de l'API Odoo (Sale Odoo API v1).
 *
 * Correspondance external_ref → ID FidelisPlus :
 *   partners   : "fidelis-company-{id}"
 *   vehicles   : "fidelis-vehicle-{id}"
 *   sale_orders: "fidelis-quote-{id}"
 */
class OdooIngestService
{
    // ─────────────────────────────────────────────────────────────────────────
    // Partners (res.partner) → Company
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Crée ou met à jour un prospect/client reçu depuis Odoo.
     *
     * Champs Odoo attendus (GET /api/sale_odoo/v1/partners) :
     *   id            (int)    — ID Odoo unique
     *   name          (string) — nom de la société / du particulier
     *   email         (string|null)
     *   phone         (string|null)
     *   street        (string|null) → address
     *   city          (string|null)
     *   zip           (string|null) → zip_code
     *   is_company    (bool)        → category : true='entreprise', false='particulier'
     *   partner_kind  (string)      : 'prospect'|'client'|... → type
     *   active        (bool)        → gestion du soft-delete
     *   external_ref  (string|null) : "fidelis-company-{id}" si poussé par nous
     *   contact_name  (string|null) — nom complet du correspondant principal
     *   contact_email (string|null)
     *   contact_phone (string|null)
     *   customer_code        (string|null) — code client Mayelia (ex: CLT-00001) → odoo_client_code
     *   is_mayelia_customer  (bool)        — client agréé Mayelia → odoo_is_mayelia_customer
     *   salesperson_first_name / salesperson_last_name / salesperson_email — rapprochement commercial
     */
    public function ingestCompany(array $payload): ?Company
    {
        $odooPartnerId = $payload['id'] ?? null;
        $name          = $payload['name'] ?? null;

        if (! $odooPartnerId || ! $name) {
            Log::warning('OdooIngestService::ingestCompany — payload invalide (id/name requis)', [
                'keys' => array_keys($payload),
            ]);
            return null;
        }

        // Résoudre le type Fidelis (règles métier Mayelia & Odoo) :
        // 1. PROSPECT : is_mayelia_customer === false ET partner_kind === 'prospect'
        // 2. CLIENT   : is_mayelia_customer === true ET partner_kind IN ('prospect', 'client', 'client_fournisseur')
        $isMayeliaCustomer = isset($payload['is_mayelia_customer']) ? (bool) $payload['is_mayelia_customer'] : null;
        $partnerKind       = strtolower((string) ($payload['partner_kind'] ?? ''));
        $customerCode      = $payload['customer_code'] ?? null;

        if ($isMayeliaCustomer === true) {
            $isClient = true;
        } elseif ($isMayeliaCustomer === false && ($partnerKind === 'prospect' || empty($partnerKind))) {
            $isClient = false;
        } elseif (in_array($partnerKind, ['client', 'customer', 'client_fournisseur'], true) && $isMayeliaCustomer === true) {
            $isClient = true;
        } else {
            $isClient = false;
        }

        $type = $isClient ? 'client' : 'prospect';

        // Archivage : Odoo renvoie active=false pour les enregistrements archivés.
        $isArchived = ! (bool) ($payload['active'] ?? true);

        // Catégorie : is_company=true → entreprise, false → particulier.
        $category = ($payload['is_company'] ?? true) ? 'entreprise' : 'particulier';

        // Vérifier si la société existe déjà pour préserver son kanban_stage si elle est déjà dans le pipeline
        $existingCompany = Company::withTrashed()->where('odoo_partner_id', (string) $odooPartnerId)->first();
        $defaultStage    = $type === 'client' ? 'client_actif' : 'nouveau_lead';

        $attributes = [
            'name'                     => $name,
            'type'                     => $type,
            'category'                 => $category,
            'email'                    => $payload['email'] ?? null,
            'phone'                    => $payload['mobile'] ?? $payload['phone'] ?? null,
            'address'                  => $payload['street'] ?? null,
            'city'                     => $payload['city'] ?? null,
            'zip_code'                 => $payload['zip'] ?? $payload['zip_code'] ?? null,
            'kanban_stage'             => ($existingCompany && $existingCompany->type === $type) ? $existingCompany->kanban_stage : $defaultStage,
            // La température n'a de sens que pour un prospect ; "tiède" par défaut.
            'temperature'              => $type === 'prospect' ? ($existingCompany->temperature ?? 'tiede') : null,
            'is_active'                => $type === 'client',
            'created_via_odoo'         => true,
            // Champs commerciaux Odoo : code client et flag agrément Mayelia
            'odoo_client_code'         => $customerCode,
            'odoo_is_mayelia_customer' => $isMayeliaCustomer,
        ];

        // Rapprochement du commercial.
        // PRIORITÉ 1 : par email (plus fiable — correspond à ce qu'on pousse via commercial_email)
        $commercialEmail = $payload['salesperson_email']
            ?? $payload['commercial_email']
            ?? $payload['user_email']
            ?? null;

        $commercial = null;
        if ($commercialEmail) {
            $commercial = User::whereIn('role', ['commercial', 'admin_commercial', 'super_admin'])
                ->where('email', mb_strtolower(trim($commercialEmail)))
                ->first();
        }

        // PRIORITÉ 2 : fallback par prénom + nom si l'email n'a rien donné
        if (! $commercial) {
            $salesFirst = $payload['salesperson_first_name'] ?? null;
            $salesLast  = $payload['salesperson_last_name'] ?? null;
            if ($salesFirst && $salesLast) {
                $commercial = User::whereIn('role', ['commercial', 'admin_commercial', 'super_admin'])
                    ->whereRaw('LOWER(first_name) = ?', [mb_strtolower(trim($salesFirst))])
                    ->whereRaw('LOWER(last_name) = ?', [mb_strtolower(trim($salesLast))])
                    ->first();
            }
        }

        if ($commercial) {
            $attributes['commercial_id'] = $commercial->id;
        }

        // withTrashed() : retrouver une fiche déjà archivée côté FidelisPlus.
        $company = Company::withTrashed()->updateOrCreate(
            ['odoo_partner_id' => (string) $odooPartnerId],
            $attributes
        );

        // Archivage cohérent dans les deux sens.
        if ($isArchived && ! $company->trashed()) {
            $company->delete();
        } elseif (! $isArchived && $company->trashed()) {
            $company->restore();
        }

        // Correspondant principal
        $contactEmail = $payload['contact_email'] ?? $payload['email'] ?? null;
        $isFallback   = $payload['contact_is_fallback_company'] ?? false;

        if ($contactEmail) {
            $firstName = $payload['contact_first_name'] ?? null;
            $lastName  = $payload['contact_last_name'] ?? null;

            // Si Odoo n'a pas renvoyé firstName/lastName, on tente de découper contact_name ou name
            if (! $firstName && ! $lastName) {
                $contactName = $payload['contact_name'] ?? $payload['name'] ?? null;
                $nameParts   = $contactName ? explode(' ', trim($contactName), 2) : [];
                $firstName   = $nameParts[0] ?? ($contactName ?? 'Contact');
                $lastName    = $nameParts[1] ?? '';
            }

            $this->syncMainContact($company, [
                'contact_first_name' => $firstName ?? 'Contact',
                'contact_last_name'  => $lastName ?? '',
                'contact_email'      => $contactEmail,
                'contact_phone'      => $payload['contact_mobile'] ?? $payload['contact_phone'] ?? $payload['mobile'] ?? $payload['phone'] ?? null,
                'is_fallback'        => $isFallback,
            ]);
        }

        return $company;
    }

    /**
     * Crée ou met à jour le correspondant principal d'une fiche Odoo.
     * L'email n'est jamais modifié sur un contact déjà existant (identifiant de connexion).
     */
    private function syncMainContact(Company $company, array $data): void
    {
        try {
            $mainContact = $company->contacts()->where('is_main_contact', true)->first();

            if ($mainContact) {
                $mainContact->update([
                    'first_name' => $data['contact_first_name'],
                    'last_name'  => $data['contact_last_name'],
                    'phone'      => $data['contact_phone'] ?? null,
                ]);
                return;
            }

            if (User::where('email', $data['contact_email'])->exists()) {
                Log::warning('OdooIngestService::syncMainContact — email déjà utilisé', [
                    'company_id'    => $company->id,
                    'contact_email' => $data['contact_email'],
                ]);
                return;
            }

            User::create([
                'company_id'           => $company->id,
                'role'                 => 'client',
                'first_name'           => $data['contact_first_name'],
                'last_name'            => $data['contact_last_name'],
                'email'                => $data['contact_email'],
                'phone'                => $data['contact_phone'] ?? null,
                'password'             => Hash::make(Str::random(40)),
                'is_main_contact'      => true,
                'must_change_password' => true,
            ]);
        } catch (\Throwable $e) {
            Log::warning('OdooIngestService::syncMainContact — échec', [
                'company_id' => $company->id,
                'message'    => $e->getMessage(),
            ]);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Vehicles (fleet.vehicle) → Vehicle
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Met à jour un véhicule avec les données renvoyées par Odoo.
     *
     * On retrouve le véhicule FidelisPlus via :
     *   1. external_ref = "fidelis-vehicle-{fidelis_id}" (préféré)
     *   2. odoo_vehicle_id déjà persisté en base
     *
     * Champs Odoo attendus (GET /api/sale_odoo/v1/vehicles) :
     *   id            (int)    — ID Odoo
     *   external_ref  (string) — "fidelis-vehicle-{fidelis_id}" si poussé par nous
     *   license_plate (string|null)
     *   brand_name    (string|null)
     *   model_name    (string|null)
     *   year          (int|null)
     *   fuel          (string|null)
     *   state_name    (string|null)
     *   active        (bool)
     */
    public function ingestVehicle(array $payload): ?Vehicle
    {
        $odooVehicleId = $payload['id'] ?? null;

        // Retrouver le véhicule FidelisPlus via external_ref ou odoo_vehicle_id.
        $vehicle     = null;
        $externalRef = $payload['external_ref'] ?? null;

        if ($externalRef && str_starts_with($externalRef, 'fidelis-vehicle-')) {
            $fidelisId = (int) substr($externalRef, strlen('fidelis-vehicle-'));
            $vehicle   = Vehicle::find($fidelisId);
        }

        if (! $vehicle && $odooVehicleId) {
            $vehicle = Vehicle::where('odoo_vehicle_id', (string) $odooVehicleId)->first();
        }

        if (! $vehicle) {
            // Les véhicules ne sont jamais créés depuis Odoo dans notre workflow.
            Log::info('OdooIngestService::ingestVehicle — véhicule Odoo inconnu dans FidelisPlus, ignoré', [
                'odoo_vehicle_id' => $odooVehicleId,
                'external_ref'    => $externalRef,
            ]);
            return null;
        }

        if ($odooVehicleId) {
            $vehicle->odoo_vehicle_id = (string) $odooVehicleId;
        }

        // Synchronisation des champs véhicule depuis Odoo.
        if (array_key_exists('license_plate', $payload)) {
            $vehicle->license_plate = $payload['license_plate'];
        }
        if (array_key_exists('brand_name', $payload)) {
            $vehicle->brand = $payload['brand_name'];
        }
        if (array_key_exists('model_name', $payload)) {
            $vehicle->model = $payload['model_name'];
        }
        if (array_key_exists('year', $payload)) {
            $vehicle->year = $payload['year'];
        }
        if (array_key_exists('fuel', $payload)) {
            $vehicle->fuel_type = $payload['fuel'];
        }
        if (! empty($payload['state_name'])) {
            $stateName = strtolower(trim((string) $payload['state_name']));
            if (in_array($stateName, ['jamais_controle', 'a_jour', 'bientot', 'en_retard'], true)) {
                $vehicle->status = $stateName;
            }
        }

        $vehicle->odoo_sync_status = 'synced';
        $vehicle->odoo_synced_at   = now();
        $vehicle->save();

        // Archivage cohérent (Suppression physique car pas de SoftDeletes sur Vehicle).
        $isArchived = ! (bool) ($payload['active'] ?? true);
        if ($isArchived) {
            $vehicle->delete();
        }

        return $vehicle;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Sale Orders (sale.order) → Quote
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Met à jour un devis avec les données renvoyées par Odoo.
     *
     * On retrouve le devis FidelisPlus via :
     *   1. external_ref = "fidelis-quote-{fidelis_id}" (préféré)
     *   2. odoo_quote_id déjà persisté en base
     *
     * Champs Odoo attendus (GET /api/sale_odoo/v1/sale_orders) :
     *   id               (int)    — ID Odoo
     *   external_ref     (string) — "fidelis-quote-{fidelis_id}" si poussé par nous
     *   state            (string) : draft|sent|sale|done|cancel
     *   client_order_ref (string|null)
     *   validity_date    (string|null)
     */
    public function ingestQuote(array $payload): ?Quote
    {
        $odooQuoteId = $payload['id'] ?? null;

        $quote       = null;
        $externalRef = $payload['external_ref'] ?? null;

        if ($externalRef && str_starts_with($externalRef, 'fidelis-quote-')) {
            $fidelisId = (int) substr($externalRef, strlen('fidelis-quote-'));
            $quote     = Quote::find($fidelisId);
        }

        if (! $quote && $odooQuoteId) {
            $quote = Quote::where('odoo_quote_id', (string) $odooQuoteId)->first();
        }

        // ─────────────────────────────────────────────────────────────────────
        // VÉRIFICATION STRICTE DE SÉCURITÉ :
        // Dans FidelisPlus, tout devis Odoo DOIT être lié à un véhicule (vignette ou contrôle technique).
        // Si Odoo transmet un devis sans aucun véhicule et qu'aucun véhicule n'est déjà rattaché :
        // 1. FidelisPlus REJETTE l'enregistrement de ce devis (return null).
        // 2. FidelisPlus génère une alerte in-app et envoie un email à tous les commerciaux.
        // ─────────────────────────────────────────────────────────────────────
        $hasVehicleInPayload = !empty($payload['vehicle_id'])
            || !empty($payload['vehicle_ids'])
            || !empty($payload['vehicles'])
            || !empty($payload['license_plate'])
            || !empty($payload['immatriculation'])
            || !empty($payload['fleet_vehicle_id']);

        $hasExistingVehicle = $quote && $quote->vehicles()->exists();

        if (!$hasVehicleInPayload && !$hasExistingVehicle) {
            $quoteNum = $payload['name'] ?? $payload['display_name'] ?? ('#' . ($odooQuoteId ?? 'inconnu'));
            $partnerName = is_array($payload['partner_id'] ?? null)
                ? ($payload['partner_id'][1] ?? 'Client inconnu')
                : ($payload['partner_name'] ?? 'Client inconnu');

            Log::warning("OdooIngestService::ingestQuote — REJET du devis Odoo {$quoteNum} : aucun véhicule (vignette/CT) rattaché.", [
                'odoo_quote_id' => $odooQuoteId,
                'payload'       => $payload,
            ]);

            $this->alertCommercialsMissingVehicleQuote($quoteNum, $partnerName, $odooQuoteId);

            return null;
        }

        if (! $quote) {
            // Tenter d'associer le devis Odoo à la société correspondante dans FidelisPlus
            $odooPartnerId = $payload['partner_id'] ?? null;
            if (is_array($odooPartnerId)) {
                $odooPartnerId = $odooPartnerId[0] ?? null;
            }

            $company = null;
            if ($odooPartnerId) {
                $company = Company::where('odoo_partner_id', (string) $odooPartnerId)->first();
            }

            if ($company) {
                $quoteNumber = $payload['name'] ?? $payload['display_name'] ?? ('OD-' . $odooQuoteId);
                
                $quote = Quote::where('quote_number', $quoteNumber)->first();
                
                if ($quote) {
                    $quote->update([
                        'company_id'       => $company->id,
                        'status'           => $this->mapOdooStateToFidelis($payload['state'] ?? 'draft'),
                        'total_amount'     => $payload['amount_total'] ?? $payload['total_amount'] ?? 0,
                        'valid_until'      => $payload['validity_date'] ?? null,
                        'odoo_quote_id'    => (string) $odooQuoteId,
                        'odoo_sync_status' => 'synced',
                        'odoo_synced_at'   => now(),
                    ]);
                } else {
                    $quote = Quote::create([
                        'company_id'       => $company->id,
                        'quote_number'     => $quoteNumber,
                        'status'           => $this->mapOdooStateToFidelis($payload['state'] ?? 'draft'),
                        'total_amount'     => $payload['amount_total'] ?? $payload['total_amount'] ?? 0,
                        'valid_until'      => $payload['validity_date'] ?? null,
                        'odoo_quote_id'    => (string) $odooQuoteId,
                        'odoo_sync_status' => 'synced',
                        'odoo_synced_at'   => now(),
                    ]);
                }

                // Synchronisation des lignes d'articles et des véhicules si présents dans le payload Odoo
                $this->ingestQuoteItems($quote, $payload);
                $this->syncQuoteVehicles($quote, $payload);

                Log::info("OdooIngestService::ingestQuote — devis Odoo #{$odooQuoteId} ingéré pour la société {$company->name}");
                return $quote;
            }

            Log::info('OdooIngestService::ingestQuote — devis Odoo inconnu sans client correspondant dans FidelisPlus, ignoré', [
                'odoo_quote_id'   => $odooQuoteId,
                'odoo_partner_id' => $odooPartnerId,
                'external_ref'    => $externalRef,
            ]);
            return null;
        }

        if ($odooQuoteId) {
            $quote->odoo_quote_id = (string) $odooQuoteId;
        }

        // Mise à jour du statut Odoo → Fidelis.
        if (! empty($payload['state'])) {
            $quote->status = $this->mapOdooStateToFidelis($payload['state']);
        }
        if (isset($payload['amount_total']) || isset($payload['total_amount'])) {
            $quote->total_amount = $payload['amount_total'] ?? $payload['total_amount'];
        }

        $quote->odoo_sync_status = 'synced';
        $quote->odoo_synced_at   = now();
        $quote->save();

        $this->ingestQuoteItems($quote, $payload);
        $this->syncQuoteVehicles($quote, $payload);
        return $quote;
    }

    /**
     * Rattache les véhicules transmis dans le payload Odoo au devis FidelisPlus.
     */
    private function syncQuoteVehicles(Quote $quote, array $payload): void
    {
        $vehicleIds = [];

        // 1. Détection par ID véhicule Odoo
        $rawVehicleIds = (array) ($payload['vehicle_ids'] ?? $payload['vehicle_id'] ?? $payload['fleet_vehicle_id'] ?? []);
        foreach ($rawVehicleIds as $vId) {
            $idVal = is_array($vId) ? ($vId[0] ?? null) : $vId;
            if ($idVal) {
                $veh = Vehicle::where('odoo_vehicle_id', (string) $idVal)->first();
                if ($veh) {
                    $vehicleIds[] = $veh->id;
                }
            }
        }

        // 2. Détection par Immatriculation
        $plate = $payload['license_plate'] ?? $payload['immatriculation'] ?? null;
        if ($plate) {
            $veh = Vehicle::where('license_plate', trim((string) $plate))->first();
            if ($veh) {
                $vehicleIds[] = $veh->id;
            }
        }

        if (!empty($vehicleIds)) {
            $quote->vehicles()->syncWithoutDetaching(array_unique($vehicleIds));
        }
    }

    /**
     * Notifie tous les commerciaux et admins par In-App et Email
     * lorsqu'un devis Odoo sans véhicule (vignette/CT) est rejeté.
     */
    private function alertCommercialsMissingVehicleQuote(string $quoteNum, string $clientName, ?int $odooQuoteId): void
    {
        try {
            $commercials = User::whereIn('role', ['commercial', 'admin_commercial', 'super_admin'])->get();
            $title = "⚠️ ALERTE SÉCURITÉ : Devis Odoo {$quoteNum} rejeté (sans véhicule)";
            $body  = "Le devis Odoo {$quoteNum} pour le client \"{$clientName}\" a été rejeté car aucun véhicule (vignette / contrôle technique) n'y est rattaché.";

            /** @var NotificationService $notifs */
            $notifs = app(NotificationService::class);

            foreach ($commercials as $user) {
                // 1. Notification In-App Backoffice
                $notifs->notifyUser(
                    $user,
                    $title,
                    $body,
                    'quote_status',
                    ['odoo_quote_id' => $odooQuoteId, 'client' => $clientName],
                    '/vente',
                    'high',
                    'both'
                );

                // 2. Alerte Email par mesure de sécurité
                if (!empty($user->email)) {
                    try {
                        Mail::raw(
                            "Bonjour {$user->first_name},\n\n" .
                            "⚠️ ALERTE SÉCURITÉ FIDELISPLUS :\n\n" .
                            "Le devis Odoo {$quoteNum} concernant le client \"{$clientName}\" a été automatiquement REJETÉ par FidelisPlus lors de la synchronisation.\n\n" .
                            "Motif du rejet : Aucun véhicule (vignette ou contrôle technique) n'est associé à ce devis Odoo.\n\n" .
                            "Par mesure de sécurité dans FidelisPlus, tous les devis enregistrés doivent obligatoirement être rattachés à un véhicule.\n\n" .
                            "Merci de bien vouloir contacter l'équipe Odoo afin de garantir que l'immatriculation / le véhicule soit correctement sélectionné sur Odoo.\n\n" .
                            "Cordialement,\n" .
                            "Système de Sécurité FidelisPlus",
                            function ($message) use ($user, $quoteNum) {
                                $message->to($user->email)
                                        ->subject("⚠️ [ALERTE SECURITE FIDELISPLUS] Devis Odoo {$quoteNum} rejeté (Sans véhicule)");
                            }
                        );
                    } catch (\Throwable $e) {
                        Log::error("Échec envoi email alerte devis sans véhicule à {$user->email}: " . $e->getMessage());
                    }
                }
            }
        } catch (\Throwable $e) {
            Log::error("Erreur lors de l'envoi de l'alerte devis sans véhicule: " . $e->getMessage());
        }
    }

    /**
     * Traite et enregistre les lignes d'un devis Odoo (order_line).
     */
    private function ingestQuoteItems(Quote $quote, array $payload): void
    {
        $lines = $payload['order_line'] ?? $payload['order_lines'] ?? $payload['lines'] ?? $payload['items'] ?? null;
        if (! is_array($lines) || empty($lines)) {
            return;
        }

        $quote->items()->delete();
        foreach ($lines as $line) {
            if (! is_array($line)) {
                continue;
            }

            $description = $line['name'] ?? $line['description'] ?? null;
            if (!$description && isset($line['product_id']) && is_array($line['product_id'])) {
                $description = $line['product_id'][1] ?? null;
            }
            $description = $description ?? 'Prestation / Article Odoo';

            $qty   = (float) ($line['product_uom_qty'] ?? $line['product_uops_qty'] ?? $line['quantity'] ?? $line['qty'] ?? 1);
            $price = (float) ($line['price_unit'] ?? $line['price'] ?? 0);

            $quote->items()->create([
                'description' => $description,
                'quantity'    => $qty > 0 ? $qty : 1,
                'price'       => $price,
            ]);
        }
    }

    /**
     * Convertit les états Odoo sale.order vers les statuts FidelisPlus.
     * Odoo : draft | sent | sale | done | cancel
     */
    private function mapOdooStateToFidelis(string $odooState): string
    {
        return match ($odooState) {
            'draft'        => 'draft',
            'sent'         => 'sent',
            'sale', 'done' => 'accepted',
            'cancel'       => 'rejected',
            default        => 'draft',
        };
    }
}
