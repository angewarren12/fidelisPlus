<?php

namespace App\Services\Odoo;

use App\Models\Company;
use App\Models\Quote;
use App\Models\Vehicle;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Client HTTP vers l'API d'Odoo (service commercial uniquement), dans les deux sens
 * mais toujours à l'initiative de Fidelis (Odoo n'appelle jamais Fidelis, suite au
 * compte-rendu de la séance de travail avec leur équipe) :
 * - sortant : Fidelis pousse les prospects/clients/flottes créés ou modifiés, et les
 *   devis créés/envoyés/acceptés. Odoo vérifie de son côté si l'enregistrement existe
 *   déjà et l'enregistre sinon.
 * - pull : Fidelis interroge périodiquement Odoo (voir
 *   app/Console/Commands/SyncFromOdoo.php) pour récupérer ce qui a été créé/modifié
 *   directement côté Odoo.
 *
 * Contrat attendu côté Odoo (provisoire, à valider avec leur équipe) :
 * - POST {base}/fidelis/companies/sync -> { odoo_partner_id: string }
 * - POST {base}/fidelis/quotes/sync -> { odoo_quote_id: string }
 * - POST {base}/fidelis/vehicles/sync -> { odoo_vehicle_id: string }
 * - GET  {base}/fidelis/companies/updated?since=... -> { data: [...] }
 * - GET  {base}/fidelis/vehicles/updated?since=... -> { data: [...] } (référence uniquement,
 *   voir fetchUpdatedVehicles() : les véhicules ne sont jamais créés depuis Odoo)
 * - GET  {base}/fidelis/quotes/updated?since=... -> { data: [...] }
 */
class OdooClient
{
    public function __construct(
        private readonly ?string $baseUrl = null,
        private readonly ?string $token = null,
    ) {}

    private function http()
    {
        return Http::baseUrl($this->baseUrl ?? (string) config('services.odoo.outbound_base_url'))
            ->withToken($this->token ?? (string) config('services.odoo.outbound_token'))
            ->acceptJson()
            ->timeout(8);
    }

    /**
     * @return array{odoo_partner_id: string}|null null si l'appel échoue (Odoo indisponible).
     */
    public function syncCompany(Company $company, string $event): ?array
    {
        $mainContact = $company->contacts()->where('is_main_contact', true)->first()
            ?? $company->contacts()->first();

        try {
            $response = $this->http()->post('/fidelis/companies/sync', [
                'event' => $event,
                'fidelis_company_id' => $company->id,
                'odoo_partner_id' => $company->odoo_partner_id,
                'is_archived' => $company->trashed(),
                'name' => $company->name,
                'category' => $company->category,
                'company_type' => $company->company_type,
                'sector' => $company->sector,
                'rccm' => $company->rccm,
                'address' => $company->address,
                'city' => $company->city,
                'zip_code' => $company->zip_code,
                'phone' => $company->phone,
                'email' => $company->email,
                'estimated_potential' => $company->estimated_potential,
                'contact_first_name' => $mainContact?->first_name,
                'contact_last_name' => $mainContact?->last_name,
                'contact_email' => $mainContact?->email,
                'contact_phone' => $mainContact?->phone,
            ]);

            if (! $response->successful()) {
                Log::warning('OdooClient::syncCompany a échoué', [
                    'status' => $response->status(),
                    'company_id' => $company->id,
                    'event' => $event,
                ]);

                return null;
            }

            return [
                'odoo_partner_id' => (string) $response->json('odoo_partner_id'),
            ];
        } catch (\Throwable $e) {
            Log::warning('OdooClient::syncCompany exception', [
                'message' => $e->getMessage(),
                'company_id' => $company->id,
                'event' => $event,
            ]);

            return null;
        }
    }

    /**
     * Identification de l'entreprise propriétaire, incluse dans les payloads véhicules et
     * devis pour qu'Odoo puisse toujours la retrouver (ou la créer si nécessaire) sans
     * dépendre d'un précédent appel à /fidelis/companies/sync — utile notamment si cette
     * entreprise n'a pas encore d'odoo_partner_id connu (sync pas encore passée, ou en échec).
     */
    private function companyContext(?Company $company): ?array
    {
        if ($company === null) {
            return null;
        }

        return [
            'fidelis_company_id' => $company->id,
            'odoo_partner_id' => $company->odoo_partner_id,
            'name' => $company->name,
            'category' => $company->category,
            'email' => $company->email,
            'phone' => $company->phone,
        ];
    }

    /**
     * @return array{odoo_vehicle_id: string}|null null si l'appel échoue (Odoo indisponible).
     */
    public function syncVehicle(Vehicle $vehicle, string $event): ?array
    {
        try {
            $response = $this->http()->post('/fidelis/vehicles/sync', [
                'event' => $event,
                'fidelis_vehicle_id' => $vehicle->id,
                'odoo_vehicle_id' => $vehicle->odoo_vehicle_id,
                // Identifiants à plat (compat) + objet complet pour identifier/créer
                // l'entreprise propriétaire sans dépendance d'ordre entre les syncs.
                'odoo_partner_id' => $vehicle->company?->odoo_partner_id,
                'fidelis_company_id' => $vehicle->company_id,
                'company' => $this->companyContext($vehicle->company),
                'license_plate' => $vehicle->license_plate,
                'brand' => $vehicle->brand,
                'model' => $vehicle->model,
                'vehicle_type' => $vehicle->vehicle_type,
                'year' => $vehicle->year,
                'fuel_type' => $vehicle->fuel_type,
                'usage_type' => $vehicle->usage_type,
                'status' => $vehicle->status,
            ]);

            if (! $response->successful()) {
                Log::warning('OdooClient::syncVehicle a échoué', [
                    'status' => $response->status(),
                    'vehicle_id' => $vehicle->id,
                    'event' => $event,
                ]);

                return null;
            }

            return [
                'odoo_vehicle_id' => (string) $response->json('odoo_vehicle_id'),
            ];
        } catch (\Throwable $e) {
            Log::warning('OdooClient::syncVehicle exception', [
                'message' => $e->getMessage(),
                'vehicle_id' => $vehicle->id,
                'event' => $event,
            ]);

            return null;
        }
    }

    /**
     * @return array{odoo_quote_id: string}|null null si l'appel échoue (Odoo indisponible).
     */
    public function syncQuote(Quote $quote, string $event): ?array
    {
        try {
            $response = $this->http()->post('/fidelis/quotes/sync', [
                'event' => $event,
                'fidelis_quote_id' => $quote->id,
                'fidelis_quote_number' => $quote->quote_number,
                // Identifiants à plat (compat) + objet complet pour identifier/créer
                // l'entreprise propriétaire sans dépendance d'ordre entre les syncs.
                'fidelis_company_id' => $quote->company_id,
                'odoo_partner_id' => $quote->company?->odoo_partner_id,
                'company' => $this->companyContext($quote->company),
                'odoo_quote_id' => $quote->odoo_quote_id,
                'status' => $quote->status,
                'currency' => $quote->currency,
                'total_amount' => $quote->total_amount,
                'valid_until' => $quote->valid_until,
                'payment_term' => $quote->paymentTerm?->label,
                'bon_de_commande_url' => $quote->bon_de_commande_url,
                'items' => $quote->items->map(fn ($item) => [
                    'description' => $item->description,
                    'quantity' => $item->quantity,
                    'price' => $item->price,
                ])->all(),
            ]);

            if (! $response->successful()) {
                Log::warning('OdooClient::syncQuote a échoué', [
                    'status' => $response->status(),
                    'quote_id' => $quote->id,
                    'event' => $event,
                ]);

                return null;
            }

            return [
                'odoo_quote_id' => (string) $response->json('odoo_quote_id'),
            ];
        } catch (\Throwable $e) {
            Log::warning('OdooClient::syncQuote exception', [
                'message' => $e->getMessage(),
                'quote_id' => $quote->id,
                'event' => $event,
            ]);

            return null;
        }
    }

    /**
     * Récupère les prospects/clients créés ou modifiés côté Odoo depuis $since.
     *
     * @return array[]|null tableau d'enregistrements bruts (voir OdooIngestService::ingestCompany),
     *                       null si l'appel échoue.
     */
    public function fetchUpdatedCompanies(?string $since): ?array
    {
        return $this->fetchUpdated('/fidelis/companies/updated', $since, 'fetchUpdatedCompanies');
    }

    /**
     * Récupère la référence Odoo des véhicules précédemment poussés (voir syncVehicle()).
     * Les véhicules ne sont jamais créés côté Odoo — c'est toujours FidelisPlus qui les
     * crée — donc ce pull ne fait que corréler fidelis_vehicle_id <-> odoo_vehicle_id,
     * jamais une création (voir OdooIngestService::ingestVehicle()).
     *
     * @return array[]|null
     */
    public function fetchUpdatedVehicles(?string $since): ?array
    {
        return $this->fetchUpdated('/fidelis/vehicles/updated', $since, 'fetchUpdatedVehicles');
    }

    /**
     * Récupère les devis créés ou modifiés côté Odoo depuis $since.
     *
     * @return array[]|null
     */
    public function fetchUpdatedQuotes(?string $since): ?array
    {
        return $this->fetchUpdated('/fidelis/quotes/updated', $since, 'fetchUpdatedQuotes');
    }

    /**
     * @return array[]|null
     */
    private function fetchUpdated(string $path, ?string $since, string $callerLabel): ?array
    {
        try {
            $response = $this->http()->get($path, array_filter(['since' => $since]));

            if (! $response->successful()) {
                Log::warning("OdooClient::{$callerLabel} a échoué", [
                    'status' => $response->status(),
                    'since' => $since,
                ]);

                return null;
            }

            return (array) $response->json('data', []);
        } catch (\Throwable $e) {
            Log::warning("OdooClient::{$callerLabel} exception", [
                'message' => $e->getMessage(),
                'since' => $since,
            ]);

            return null;
        }
    }
}
