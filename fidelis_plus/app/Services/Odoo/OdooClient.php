<?php

namespace App\Services\Odoo;

use App\Models\Company;
use App\Models\Quote;
use App\Models\Vehicle;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Client HTTP vers l'API Odoo (Sale Odoo API v1), dans les deux sens
 * mais toujours à l'initiative de Fidelis (Odoo n'appelle jamais Fidelis).
 *
 * Authentification : header X-API-Key (supporté en parallèle de Bearer).
 * Format de réponse uniforme : { "success": bool, "data": {...}, "message": "..." }
 *
 * Endpoints utilisés :
 *   Partners   : GET|POST /api/sale_odoo/v1/partners
 *                GET|PUT  /api/sale_odoo/v1/partners/{id}
 *                POST     /api/sale_odoo/v1/partners/by-ref/{ref}
 *                POST     /api/sale_odoo/v1/partners/{id}/archive|unarchive|promote-to-customer
 *   Vehicles   : GET|POST /api/sale_odoo/v1/vehicles
 *                GET|PUT  /api/sale_odoo/v1/vehicles/{id}
 *                POST     /api/sale_odoo/v1/vehicles/{id}/archive
 *   Sale Orders: GET|POST /api/sale_odoo/v1/sale_orders
 *                GET|PUT  /api/sale_odoo/v1/sale_orders/{id}
 *
 * Prévention des doublons : chaque ressource porte un external_ref stable
 * ("fidelis-company-{id}", "fidelis-vehicle-{id}", "fidelis-quote-{id}")
 * permettant le lookup by-ref avant toute création.
 */
class OdooClient
{
    public function __construct(
        private readonly ?string $baseUrl = null,
        private readonly ?string $token = null,
    ) {
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Infrastructure HTTP
    // ─────────────────────────────────────────────────────────────────────────

    private function http()
    {
        return Http::baseUrl($this->baseUrl ?? (string) config('services.odoo.outbound_base_url'))
            ->withHeaders([
                // L'API Odoo supporte X-API-Key OU Authorization: Bearer.
                'X-API-Key' => $this->token ?? (string) config('services.odoo.outbound_token'),
            ])
            ->acceptJson()
            ->timeout(12);
    }

    /**
     * Extrait le tableau `data` de { "success": true, "data": ... }.
     * Retourne null et journalise en cas d'échec.
     */
    private function extractData(Response $response, string $label): ?array
    {
        if (!$response->successful()) {
            Log::warning("OdooClient::{$label} — HTTP {$response->status()}", [
                'body' => mb_substr($response->body(), 0, 500),
            ]);
            return null;
        }

        $json = $response->json();
        if (!($json['success'] ?? false)) {
            Log::warning("OdooClient::{$label} — success=false", [
                'error' => $json['error'] ?? $json,
            ]);
            return null;
        }

        return $json['data'] ?? [];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Lookups par référence externe (anti-doublons)
    // ─────────────────────────────────────────────────────────────────────────

    private function findPartnerByRef(string $ref): ?int
    {
        try {
            $data = $this->extractData(
                $this->http()->get("/api/sale_odoo/v1/partners/by-ref/{$ref}"),
                'findPartnerByRef'
            );
            return isset($data['id']) ? (int) $data['id'] : null;
        } catch (\Throwable $e) {
            Log::warning('OdooClient::findPartnerByRef exception', ['message' => $e->getMessage(), 'ref' => $ref]);
            return null;
        }
    }

    private function findVehicleByRef(string $ref): ?int
    {
        try {
            $data = $this->extractData(
                $this->http()->get("/api/sale_odoo/v1/vehicles/by-ref/{$ref}"),
                'findVehicleByRef'
            );
            return isset($data['id']) ? (int) $data['id'] : null;
        } catch (\Throwable $e) {
            Log::warning('OdooClient::findVehicleByRef exception', ['message' => $e->getMessage(), 'ref' => $ref]);
            return null;
        }
    }

    private function findSaleOrderByRef(string $ref): ?int
    {
        try {
            $data = $this->extractData(
                $this->http()->get("/api/sale_odoo/v1/sale_orders/by-ref/{$ref}"),
                'findSaleOrderByRef'
            );
            return isset($data['id']) ? (int) $data['id'] : null;
        } catch (\Throwable $e) {
            Log::warning('OdooClient::findSaleOrderByRef exception', ['message' => $e->getMessage(), 'ref' => $ref]);
            return null;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Sync sortant : Company (Prospect / Client → res.partner)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Synchronise une fiche Société/Prospect/Client vers Odoo (res.partner).
     *
     * Évènements gérés :
     *   company_archived     → POST /partners/{id}/archive
     *   company_restored     → POST /partners/{id}/unarchive
     *   converted_to_client  → PUT /partners/{id}  + POST /partners/{id}/promote-to-customer
     *   prospect_created     → POST /partners  (ou PUT si déjà connu par by-ref lookup)
     *   (tout autre)         → PUT /partners/{id}  |  POST /partners
     *
     * @return array{odoo_partner_id: int}|null  null = Odoo indisponible.
     */
    public function syncCompany(Company $company, string $event): ?array
    {
        $mainContact = $company->contacts()->where('is_main_contact', true)->first()
            ?? $company->contacts()->first();

        $ref = 'fidelis-company-' . $company->id;

        // Résolution de l'ID Odoo : persisté en base → lookup by-ref → null (premier push).
        $odooId = $company->odoo_partner_id
            ? (int) $company->odoo_partner_id
            : $this->findPartnerByRef($ref);

        // --- Archivage ---
        if ($event === 'company_archived') {
            if (!$odooId) {
                return ['odoo_partner_id' => 0]; // Pas encore synchronisé → rien à faire.
            }
            return $this->archivePartner($odooId, $company->id);
        }

        // --- Restauration ---
        if ($event === 'company_restored') {
            if (!$odooId) {
                return ['odoo_partner_id' => 0];
            }
            return $this->unarchivePartner($odooId, $company->id);
        }

        $payload = array_filter([
            'external_ref' => $ref,
            'name' => $company->name,
            'email' => $mainContact?->email ?? $company->email,
            'phone' => $company->phone,
            'street' => $company->address,
            'city' => $company->city,
            'zip' => $company->zip_code,
            'country_code' => $company->country_code ?? 'CI', // Code ISO-2 (recommandé par Odoo, évite le hardcoding country_id)
            'is_company' => $company->category === 'entreprise',
            'vat' => $company->rccm,
            'ref' => $company->rccm,
            'comment' => $company->observations,
            'commercial_email' => $company->commercial?->email,
            'commercial_first_name' => $company->commercial?->first_name,
            'commercial_last_name' => $company->commercial?->last_name,
            'commercial_name' => $company->commercial
                ? trim($company->commercial->first_name . ' ' . $company->commercial->last_name)
                : null,
        ], fn($val) => $val !== null && $val !== '');

        try {
            if ($odooId) {
                $data = $this->extractData(
                    $this->http()->put("/api/sale_odoo/v1/partners/{$odooId}", $payload),
                    'syncCompany/PUT'
                );
                if ($data === null) {
                    return null;
                }
                if ($event === 'converted_to_client') {
                    $this->promoteToCustomer($odooId, $company->id);
                }
                return ['odoo_partner_id' => $odooId];
            }

            // Création.
            $data = $this->extractData(
                $this->http()->post('/api/sale_odoo/v1/partners', $payload),
                'syncCompany/POST'
            );
            if ($data === null) {
                return null;
            }

            $newId = (int) ($data['id'] ?? 0);
            if ($event === 'converted_to_client' && $newId) {
                $this->promoteToCustomer($newId, $company->id);
            }

            return ['odoo_partner_id' => $newId];
        } catch (\Throwable $e) {
            Log::warning('OdooClient::syncCompany exception', [
                'message' => $e->getMessage(),
                'company_id' => $company->id,
                'event' => $event,
            ]);
            return null;
        }
    }

    private function archivePartner(int $odooId, int $companyId): ?array
    {
        try {
            $data = $this->extractData(
                $this->http()->post("/api/sale_odoo/v1/partners/{$odooId}/archive"),
                'archivePartner'
            );
            return $data !== null ? ['odoo_partner_id' => $odooId] : null;
        } catch (\Throwable $e) {
            Log::warning('OdooClient::archivePartner exception', ['message' => $e->getMessage(), 'company_id' => $companyId]);
            return null;
        }
    }

    private function unarchivePartner(int $odooId, int $companyId): ?array
    {
        try {
            $data = $this->extractData(
                $this->http()->post("/api/sale_odoo/v1/partners/{$odooId}/unarchive"),
                'unarchivePartner'
            );
            return $data !== null ? ['odoo_partner_id' => $odooId] : null;
        } catch (\Throwable $e) {
            Log::warning('OdooClient::unarchivePartner exception', ['message' => $e->getMessage(), 'company_id' => $companyId]);
            return null;
        }
    }

    private function promoteToCustomer(int $odooId, int $companyId): void
    {
        try {
            $response = $this->http()->post("/api/sale_odoo/v1/partners/{$odooId}/promote-to-customer");
            if (!$response->successful()) {
                Log::warning('OdooClient::promoteToCustomer a échoué', [
                    'odoo_id' => $odooId,
                    'company_id' => $companyId,
                    'status' => $response->status(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::warning('OdooClient::promoteToCustomer exception', ['message' => $e->getMessage(), 'company_id' => $companyId]);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Sync sortant : Vehicle (Flotte → fleet.vehicle)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Synchronise un véhicule de flotte vers Odoo (fleet.vehicle).
     *
     * Note model_id : l'API Odoo requiert normalement un model_id entier.
     * On envoie brand_name/model_name en texte — si Odoo refuse (422), le
     * sync_status passera à 'failed' et sera journalisé. À clarifier avec
     * l'équipe Odoo si nécessaire.
     *
     * @return array{odoo_vehicle_id: int}|null
     */
    public function syncVehicle(Vehicle $vehicle, string $event): ?array
    {
        $ref = 'fidelis-vehicle-' . $vehicle->id;

        $odooId = $vehicle->odoo_vehicle_id
            ? (int) $vehicle->odoo_vehicle_id
            : $this->findVehicleByRef($ref);

        if ($event === 'vehicle_archived') {
            if (!$odooId) {
                return ['odoo_vehicle_id' => 0];
            }
            return $this->archiveVehicle($odooId, $vehicle->id);
        }

        $ownerOdooId = $vehicle->company?->odoo_partner_id
            ? (int) $vehicle->company->odoo_partner_id
            : null;

        $payload = [
            'external_ref' => $ref,
            'license_plate' => $vehicle->license_plate,
            'brand_name' => $vehicle->brand,
            'model_name' => $vehicle->model,
            'year' => $vehicle->year,
            'model_year' => $vehicle->year ? (string) $vehicle->year : null,
            'fuel' => $vehicle->fuel_type,
            'fuel_type' => $vehicle->fuel_type,
            // NOUVEAU : support du champ symbolique state_name (recommandé) et state_id pour rétrocompatibilité.
            'state_name' => $this->resolveVehicleStateName($vehicle->status),
            'state_id' => $this->resolveVehicleStateId($vehicle->status),
            'partner_id' => $ownerOdooId,
            'owner_id' => $ownerOdooId,
            'partner_ref' => $vehicle->company_id
                ? 'fidelis-company-' . $vehicle->company_id
                : null,
        ];

        try {
            if ($odooId) {
                $data = $this->extractData(
                    $this->http()->put("/api/sale_odoo/v1/vehicles/{$odooId}", $payload),
                    'syncVehicle/PUT'
                );
                return $data !== null ? ['odoo_vehicle_id' => $odooId] : null;
            }

            $data = $this->extractData(
                $this->http()->post('/api/sale_odoo/v1/vehicles', $payload),
                'syncVehicle/POST'
            );
            return $data !== null ? ['odoo_vehicle_id' => (int) ($data['id'] ?? 0)] : null;
        } catch (\Throwable $e) {
            Log::warning('OdooClient::syncVehicle exception', [
                'message' => $e->getMessage(),
                'vehicle_id' => $vehicle->id,
                'event' => $event,
            ]);
            return null;
        }
    }

    private function archiveVehicle(int $odooId, int $vehicleId): ?array
    {
        try {
            $data = $this->extractData(
                $this->http()->post("/api/sale_odoo/v1/vehicles/{$odooId}/archive"),
                'archiveVehicle'
            );
            return $data !== null ? ['odoo_vehicle_id' => $odooId] : null;
        } catch (\Throwable $e) {
            Log::warning('OdooClient::archiveVehicle exception', ['message' => $e->getMessage(), 'vehicle_id' => $vehicleId]);
            return null;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Sync sortant : Quote (Devis → sale.order)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Synchronise un devis vers Odoo (sale.order).
     * États Odoo : draft | sent | sale (accepté) | done | cancel.
     *
     * @return array{odoo_quote_id: int}|null
     */
    public function syncQuote(Quote $quote, string $event): ?array
    {
        $ref = 'fidelis-quote-' . $quote->id;

        $odooId = $quote->odoo_quote_id
            ? (int) $quote->odoo_quote_id
            : $this->findSaleOrderByRef($ref);

        $payload = [
            'external_ref' => $ref,
            'client_order_ref' => $quote->quote_number,
            'partner_id' => $quote->company?->odoo_partner_id
                ? (int) $quote->company->odoo_partner_id
                : null,
            'partner_ref' => $quote->company_id
                ? 'fidelis-company-' . $quote->company_id
                : null,
            'state' => $this->mapQuoteStatus($quote->status),
            'validity_date' => $quote->valid_until?->format('Y-m-d'),
            'note' => $quote->bon_de_commande_url
                ? 'Bon de commande : ' . $quote->bon_de_commande_url
                : null,
            // payment_term_id : ID Odoo du mode de paiement.
            // Nécessite que la table payment_terms ait une colonne odoo_payment_term_id.
            'payment_term_id' => $quote->paymentTerm?->odoo_payment_term_id ?? null,
            'order_lines' => $quote->items->map(fn($item) => [
                'product_id' => $this->resolveProductId($item->description),
                'name' => $item->description,
                'product_uom_qty' => (float) $item->quantity,
                'price_unit' => (float) $item->price,
                'discount' => isset($item->discount) ? (float) $item->discount : null,
            ])->all(),
        ];

        try {
            if ($odooId) {
                $data = $this->extractData(
                    $this->http()->put("/api/sale_odoo/v1/sale_orders/{$odooId}", $payload),
                    'syncQuote/PUT'
                );
                if ($data !== null) {
                    if ($quote->bon_de_commande_url) {
                        $this->syncQuoteAttachments($odooId, $quote->bon_de_commande_url);
                    }
                    return ['odoo_quote_id' => $odooId];
                }
                return null;
            }

            $data = $this->extractData(
                $this->http()->post('/api/sale_odoo/v1/sale_orders', $payload),
                'syncQuote/POST'
            );
            if ($data !== null) {
                $newId = (int) ($data['id'] ?? 0);
                if ($newId && $quote->bon_de_commande_url) {
                    $this->syncQuoteAttachments($newId, $quote->bon_de_commande_url);
                }
                return ['odoo_quote_id' => $newId];
            }
            return null;
        } catch (\Throwable $e) {
            Log::warning('OdooClient::syncQuote exception', [
                'message' => $e->getMessage(),
                'quote_id' => $quote->id,
                'event' => $event,
            ]);
            return null;
        }
    }

    private function mapQuoteStatus(string $status): string
    {
        return match ($status) {
            'draft' => 'draft',
            'sent' => 'sent',
            'accepted' => 'sale',
            'rejected',
            'expired' => 'cancel',
            default => 'draft',
        };
    }

    /**
     * Mappe les statuts véhicule Fidelis Plus vers les libellés d'état fleet.vehicle.state d'Odoo.
     * Libellés exacts Odoo Mayelia (instance FR) :
     *   1 -> "Nouvelle demande"
     *   2 -> "À commander"
     *   3 -> "Inscrit"
     *   4 -> "Déclassé"
     */
    private function resolveVehicleStateName(?string $status): ?string
    {
        if ($status === null) {
            return null;
        }

        return match (mb_strtolower(trim($status))) {
            'nouveau', 'new', 'disponible', 'nouvelle_demande' => 'Nouvelle demande',
            'a_commander', 'a commander', 'commande' => 'À commander',
            'en_service', 'actif', 'active', 'en_contrat',
            'loué', 'loue', 'inscrit', 'registered' => 'Inscrit',
            'fin_de_vie', 'archivé', 'archive',
            'déclassé', 'declasse', 'hors_flotte' => 'Déclassé',
            default => 'Inscrit',
        };
    }

    /**
     * Mappe les statuts véhicule Fidelis Plus vers les IDs d'état fleet.vehicle.state d'Odoo.
     */
    private function resolveVehicleStateId(?string $status): ?int
    {
        if ($status === null) {
            return null;
        }

        return match (mb_strtolower(trim($status))) {
            'nouveau', 'new', 'disponible', 'nouvelle_demande' => 1,
            'a_commander', 'a commander', 'commande' => 2,
            'en_service', 'actif', 'active', 'en_contrat',
            'loué', 'loue', 'inscrit', 'registered' => 3,
            'fin_de_vie', 'archivé', 'archive',
            'déclassé', 'declasse', 'hors_flotte' => 4,
            default => 3,
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Pull entrant (Odoo → FidelisPlus) — appelé par le cron SyncFromOdoo
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Récupère toutes les pages de partenaires Odoo modifiés depuis $since.
     *
     * @return array[]|null  null si Odoo est indisponible.
     */
    public function fetchUpdatedCompanies(?string $since): ?array
    {
        return $this->fetchAllPages('/api/sale_odoo/v1/partners', $since, 'fetchUpdatedCompanies');
    }

    /** @return array[]|null */
    public function fetchUpdatedVehicles(?string $since): ?array
    {
        return $this->fetchAllPages('/api/sale_odoo/v1/vehicles', $since, 'fetchUpdatedVehicles');
    }

    /** @return array[]|null */
    public function fetchUpdatedQuotes(?string $since): ?array
    {
        return $this->fetchAllPages('/api/sale_odoo/v1/sale_orders', $since, 'fetchUpdatedQuotes');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Bootstrap & Référentiels Odoo (Endpoints GET en lecture)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Récupère la liste des pays depuis Odoo (GET /api/sale_odoo/v1/countries).
     * @return array[]|null
     */
    public function fetchCountries(?string $code = null, ?string $search = null): ?array
    {
        try {
            $params = array_filter(['code' => $code, 'search' => $search]);
            return $this->extractData(
                $this->http()->get('/api/sale_odoo/v1/countries', $params),
                'fetchCountries'
            );
        } catch (\Throwable $e) {
            Log::warning('OdooClient::fetchCountries exception', ['message' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Récupère les détails d'un pays par son code ISO-2 (GET /api/sale_odoo/v1/countries/{code}).
     */
    public function fetchCountryByCode(string $code): ?array
    {
        try {
            return $this->extractData(
                $this->http()->get("/api/sale_odoo/v1/countries/{$code}"),
                'fetchCountryByCode'
            );
        } catch (\Throwable $e) {
            Log::warning('OdooClient::fetchCountryByCode exception', ['message' => $e->getMessage(), 'code' => $code]);
            return null;
        }
    }

    /**
     * Récupère la liste des états véhicules depuis Odoo (GET /api/sale_odoo/v1/vehicle-states).
     * @return array[]|null
     */
    public function fetchVehicleStates(): ?array
    {
        try {
            return $this->extractData(
                $this->http()->get('/api/sale_odoo/v1/vehicle-states'),
                'fetchVehicleStates'
            );
        } catch (\Throwable $e) {
            Log::warning('OdooClient::fetchVehicleStates exception', ['message' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Pagination transparente : appelle autant de pages que nécessaire.
     * Paramètre delta : `modified_since` (ISO 8601) — nom réel côté Odoo.
     * Limite par page : 200 (max autorisé par l'API).
     *
     * @return array[]|null
     */
    private function fetchAllPages(string $path, ?string $since, string $label): ?array
    {
        $limit = 200;
        $page = 1;
        $all = [];

        $params = array_filter(['modified_since' => $since, 'limit' => $limit]);

        try {
            do {
                $params['page'] = $page;
                $response = $this->http()->get($path, $params);

                if (!$response->successful()) {
                    Log::warning("OdooClient::{$label} — HTTP {$response->status()}", [
                        'page' => $page,
                        'since' => $since,
                    ]);
                    return $page === 1 ? null : $all;
                }

                $json = $response->json();
                if (!($json['success'] ?? false)) {
                    Log::warning("OdooClient::{$label} — success=false", ['page' => $page]);
                    return $page === 1 ? null : $all;
                }

                // L'API peut renvoyer data sous forme de liste directe ou de { records, total }.
                $data = $json['data'] ?? [];
                $records = is_array($data) && array_key_exists('records', $data)
                    ? (array) ($data['records'] ?? [])
                    : (array) $data;

                // Cas d'un objet unique retourné à la place d'un tableau.
                if (isset($records['id'])) {
                    $records = [$records];
                }

                if (empty($records)) {
                    break;
                }

                $all = array_merge($all, $records);
                $page++;

                // Fin de pagination : réponse incomplète = dernière page.
                if (count($records) < $limit) {
                    break;
                }
            } while (true);

            return $all;
        } catch (\Throwable $e) {
            Log::warning("OdooClient::{$label} exception", [
                'message' => $e->getMessage(),
                'since' => $since,
            ]);
            return null;
        }
    }

    public function syncQuoteAttachments(int $odooQuoteId, string $url): bool
    {
        try {
            $response = $this->http()->post("/api/sale_odoo/v1/sale_orders/{$odooQuoteId}/attachments", [
                'url' => $url,
            ]);
            if (!$response->successful()) {
                Log::warning('OdooClient::syncQuoteAttachments a échoué', [
                    'odoo_quote_id' => $odooQuoteId,
                    'url' => $url,
                    'status' => $response->status(),
                ]);
                return false;
            }
            return $response->json()['success'] ?? false;
        } catch (\Throwable $e) {
            Log::warning('OdooClient::syncQuoteAttachments exception', [
                'message' => $e->getMessage(),
                'odoo_quote_id' => $odooQuoteId,
                'url' => $url,
            ]);
            return false;
        }
    }

    private function resolveProductId(string $description): int
    {
        $desc = mb_strtolower($description);

        if (str_contains($desc, 'révisite') || str_contains($desc, 'revisite')) {
            if (str_contains($desc, 'pl')) {
                return 337; // Revisite PL
            }
            return 336; // Revisite VL
        }

        if (str_contains($desc, 'vignette')) {
            if (str_contains($desc, 'moto')) {
                return 311; // Vignette Moto
            }
        }

        if (str_contains($desc, 'visite pl')) {
            if (str_contains($desc, 'pl2'))
                return 334;
            return 332; // Visite PL1
        }

        if (str_contains($desc, 'visite tp')) {
            if (str_contains($desc, 'tp4'))
                return 335;
            return 333; // Visite TP3
        }

        if (str_contains($desc, 'visite vl2')) {
            return 331; // Visite VL2-TP2
        }

        return 330; // Visite VL1-TP1 (Default Fallback)
    }
}
