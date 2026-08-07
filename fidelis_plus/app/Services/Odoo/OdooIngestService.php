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
 */
class OdooIngestService
{
    /**
     * Crée ou met à jour un prospect/client reçu depuis Odoo (upsert par
     * odoo_partner_id). Reprend la logique déjà validée de l'ex-webhook entrant
     * (correspondant, rapprochement du commercial par nom/prénom).
     */
    public function ingestCompany(array $payload): ?Company
    {
        $odooPartnerId = $payload['odoo_partner_id'] ?? null;
        $name = $payload['name'] ?? null;

        if (!$odooPartnerId || !$name) {
            Log::warning('OdooIngestService::ingestCompany - payload invalide (odoo_partner_id/name requis)', ['payload' => $payload]);

            return null;
        }

        $type = in_array($payload['type'] ?? null, ['prospect', 'client'], true) ? $payload['type'] : 'prospect';
        $isArchived = (bool) ($payload['is_archived'] ?? false);

        $attributes = [
            'name' => $name,
            'type' => $type,
            'category' => in_array($payload['category'] ?? null, ['entreprise', 'particulier'], true) ? $payload['category'] : 'entreprise',
            'email' => $payload['email'] ?? null,
            'phone' => $payload['phone'] ?? null,
            'address' => $payload['address'] ?? null,
            'city' => $payload['city'] ?? null,
            'sector' => $payload['sector'] ?? null,
            'kanban_stage' => $type === 'client' ? 'client_actif' : 'nouveau_lead',
            // La température n'a de sens que pour un prospect ; "tiède" par défaut,
            // même valeur par défaut que le formulaire de création côté FidelisPlus.
            'temperature' => $type === 'prospect' ? 'tiede' : null,
            'is_active' => $type === 'client',
            'created_via_odoo' => true,
        ];

        // Rapprochement du commercial par nom/prénom — les commerciaux existent
        // aussi côté Odoo. On ne touche à commercial_id que si une correspondance
        // est trouvée, jamais de désassignation silencieuse.
        if (!empty($payload['commercial_first_name']) && !empty($payload['commercial_last_name'])) {
            $commercial = User::whereIn('role', ['commercial', 'admin_commercial', 'super_admin'])
                ->whereRaw('LOWER(first_name) = ?', [mb_strtolower(trim($payload['commercial_first_name']))])
                ->whereRaw('LOWER(last_name) = ?', [mb_strtolower(trim($payload['commercial_last_name']))])
                ->first();

            if ($commercial) {
                $attributes['commercial_id'] = $commercial->id;
            }
        }

        // withTrashed() : une fiche déjà archivée côté FidelisPlus doit être retrouvée
        // (pas recréée en double) si Odoo la renvoie encore dans le flux.
        $company = Company::withTrashed()->updateOrCreate(['odoo_partner_id' => $odooPartnerId], $attributes);

        // Archivage cohérent dans les deux sens : si Odoo indique l'enregistrement
        // comme archivé/désarchivé, on reflète l'état localement (soft delete).
        if ($isArchived && !$company->trashed()) {
            $company->delete();
        } elseif (!$isArchived && $company->trashed()) {
            $company->restore();
        }

        if (!empty($payload['contact_first_name']) && !empty($payload['contact_last_name']) && !empty($payload['contact_email'])) {
            $this->syncMainContact($company, $payload);
        }

        return $company;
    }

    /**
     * Crée ou met à jour le correspondant principal d'une fiche Odoo. L'email n'est
     * jamais modifié sur un contact déjà existant (c'est son identifiant de connexion).
     */
    private function syncMainContact(Company $company, array $data): void
    {
        try {
            $mainContact = $company->contacts()->where('is_main_contact', true)->first();

            if ($mainContact) {
                $mainContact->update([
                    'first_name' => $data['contact_first_name'],
                    'last_name' => $data['contact_last_name'],
                    'phone' => $data['contact_phone'] ?? null,
                ]);

                return;
            }

            if (User::where('email', $data['contact_email'])->exists()) {
                Log::warning('OdooIngestService::ingestCompany - email de correspondant déjà utilisé', [
                    'company_id' => $company->id,
                    'contact_email' => $data['contact_email'],
                ]);

                return;
            }

            User::create([
                'company_id' => $company->id,
                'role' => 'client',
                'first_name' => $data['contact_first_name'],
                'last_name' => $data['contact_last_name'],
                'email' => $data['contact_email'],
                'phone' => $data['contact_phone'] ?? null,
                'password' => Hash::make(Str::random(40)),
                'is_main_contact' => true,
                'must_change_password' => true,
            ]);
        } catch (\Throwable $e) {
            Log::warning('OdooIngestService::ingestCompany - échec création correspondant', [
                'company_id' => $company->id,
                'message' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Met à jour un véhicule avec la référence renvoyée par Odoo. Ne crée JAMAIS de
     * véhicule depuis Odoo — les véhicules de flotte sont toujours créés côté
     * FidelisPlus (voir VehicleController::store()) — seule une mise à jour d'un
     * véhicule déjà connu (fidelis_vehicle_id) est appliquée, même principe que
     * ingestQuote().
     */
    public function ingestVehicle(array $payload): ?Vehicle
    {
        $fidelisVehicleId = $payload['fidelis_vehicle_id'] ?? null;
        if (!$fidelisVehicleId) {
            Log::warning('OdooIngestService::ingestVehicle - payload sans fidelis_vehicle_id, ignoré', ['payload' => $payload]);

            return null;
        }

        $vehicle = Vehicle::find($fidelisVehicleId);
        if (!$vehicle) {
            Log::warning('OdooIngestService::ingestVehicle - véhicule introuvable', ['fidelis_vehicle_id' => $fidelisVehicleId]);

            return null;
        }

        if (!empty($payload['odoo_vehicle_id'])) {
            $vehicle->odoo_vehicle_id = $payload['odoo_vehicle_id'];
        }
        $vehicle->odoo_sync_status = 'synced';
        $vehicle->odoo_synced_at = now();
        $vehicle->save();

        return $vehicle;
    }

    /**
     * Met à jour un devis avec la référence/le statut renvoyés par Odoo. Ne crée
     * jamais de devis depuis Odoo (les devis naissent toujours côté FidelisPlus) —
     * seule une mise à jour d'un devis déjà connu (fidelis_quote_id) est appliquée.
     */
    public function ingestQuote(array $payload): ?Quote
    {
        $fidelisQuoteId = $payload['fidelis_quote_id'] ?? null;
        if (!$fidelisQuoteId) {
            Log::warning('OdooIngestService::ingestQuote - payload sans fidelis_quote_id, ignoré', ['payload' => $payload]);

            return null;
        }

        $quote = Quote::find($fidelisQuoteId);
        if (!$quote) {
            Log::warning('OdooIngestService::ingestQuote - devis introuvable', ['fidelis_quote_id' => $fidelisQuoteId]);

            return null;
        }

        if (!empty($payload['odoo_quote_id'])) {
            $quote->odoo_quote_id = $payload['odoo_quote_id'];
        }
        $quote->odoo_sync_status = 'synced';
        $quote->odoo_synced_at = now();
        $quote->save();

        return $quote;
    }
}
