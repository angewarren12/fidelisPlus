<?php

namespace App\Services\Odoo;

use App\Models\Company;
use App\Models\Quote;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
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
     *   salesperson_first_name / salesperson_last_name — rapprochement commercial
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

        // Résoudre le type Fidelis depuis partner_kind Odoo.
        $partnerKind = $payload['partner_kind'] ?? 'prospect';
        $type = in_array($partnerKind, ['client', 'customer', 'client_fournisseur'], true)
            ? 'client'
            : 'prospect';

        // Archivage : Odoo renvoie active=false pour les enregistrements archivés.
        $isArchived = ! (bool) ($payload['active'] ?? true);

        // Catégorie : is_company=true → entreprise, false → particulier.
        $category = ($payload['is_company'] ?? true) ? 'entreprise' : 'particulier';

        $attributes = [
            'name'             => $name,
            'type'             => $type,
            'category'         => $category,
            'email'            => $payload['email'] ?? null,
            'phone'            => $payload['phone'] ?? null,
            'address'          => $payload['street'] ?? null,
            'city'             => $payload['city'] ?? null,
            'zip_code'         => $payload['zip'] ?? $payload['zip_code'] ?? null,
            'kanban_stage'     => $type === 'client' ? 'client_actif' : 'nouveau_lead',
            // La température n'a de sens que pour un prospect ; "tiède" par défaut.
            'temperature'      => $type === 'prospect' ? 'tiede' : null,
            'is_active'        => $type === 'client',
            'created_via_odoo' => true,
        ];

        // Rapprochement du commercial par prénom/nom.
        $salesFirst = $payload['salesperson_first_name'] ?? null;
        $salesLast  = $payload['salesperson_last_name'] ?? null;
        if ($salesFirst && $salesLast) {
            $commercial = User::whereIn('role', ['commercial', 'admin_commercial', 'super_admin'])
                ->whereRaw('LOWER(first_name) = ?', [mb_strtolower(trim($salesFirst))])
                ->whereRaw('LOWER(last_name) = ?', [mb_strtolower(trim($salesLast))])
                ->first();
            if ($commercial) {
                $attributes['commercial_id'] = $commercial->id;
            }
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

        // Correspondant principal : contact_name peut être "Prénom Nom" — on split.
        $contactEmail = $payload['contact_email'] ?? null;
        $contactName  = $payload['contact_name'] ?? null;
        $contactPhone = $payload['contact_phone'] ?? null;

        if ($contactEmail) {
            $nameParts = $contactName ? explode(' ', trim($contactName), 2) : [];
            $this->syncMainContact($company, [
                'contact_first_name' => $nameParts[0] ?? ($contactName ?? 'Contact'),
                'contact_last_name'  => $nameParts[1] ?? '',
                'contact_email'      => $contactEmail,
                'contact_phone'      => $contactPhone,
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
            $vehicle   = Vehicle::withTrashed()->find($fidelisId);
        }

        if (! $vehicle && $odooVehicleId) {
            $vehicle = Vehicle::withTrashed()->where('odoo_vehicle_id', (string) $odooVehicleId)->first();
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
        if (array_key_exists('state_name', $payload)) {
            $vehicle->status = $payload['state_name'];
        }

        $vehicle->odoo_sync_status = 'synced';
        $vehicle->odoo_synced_at   = now();
        $vehicle->save();

        // Archivage cohérent.
        $isArchived = ! (bool) ($payload['active'] ?? true);
        if ($isArchived && ! $vehicle->trashed()) {
            $vehicle->delete();
        } elseif (! $isArchived && $vehicle->trashed()) {
            $vehicle->restore();
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

        if (! $quote) {
            Log::info('OdooIngestService::ingestQuote — devis Odoo inconnu dans FidelisPlus, ignoré', [
                'odoo_quote_id' => $odooQuoteId,
                'external_ref'  => $externalRef,
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

        $quote->odoo_sync_status = 'synced';
        $quote->odoo_synced_at   = now();
        $quote->save();

        return $quote;
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
