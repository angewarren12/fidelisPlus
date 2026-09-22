<?php

namespace App\Services\Immat;

use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Client HTTP sortant de Fidelis Plus vers l'API d'immatriculation (lecture seule).
 *
 * Endpoint : GET {base_url}/api/immat/getVisite?Immatriculation={PLATE}
 * Auth     : Aucune (API publique).
 * Reponse  : Tableau d'objets - une entrée par visite technique enregistrée.
 *            Le champ "isCurrent: true" désigne la visite en cours.
 *
 * Contraintes réseau :
 *  - Timeout 5s connexion / 15s total.
 *  - HTTP (pas HTTPS) - pas de redirection activée.
 *
 * @see config/services.php  clé "immat"
 * @see app/Http/Controllers/Api/VehicleController.php  lookupImmat / refreshImmat
 */
class ImmatClient
{
    public function __construct(
        private readonly ?string $baseUrl = null,
    ) {}

    private function http()
    {
        return Http::baseUrl($this->baseUrl ?? (string) config('services.immat.base_url'))
            ->acceptJson()
            ->connectTimeout(5)
            ->timeout(15)
            ->withOptions(['allow_redirects' => false]);
    }

    // -------------------------------------------------------------------------
    // Méthodes publiques
    // -------------------------------------------------------------------------

    /**
     * Retourne la visite technique en cours (isCurrent = true) pour une plaque donnée.
     *
     * @return array|null  null si la plaque est introuvable ou si l'API est indisponible.
     */
    public function getVisite(string $plate): ?array
    {
        $plate = strtoupper(trim($plate));

        try {
            $response = $this->http()->get('/api/immat/getVisite', [
                'Immatriculation' => $plate,
            ]);

            if (! $response->successful()) {
                Log::warning('ImmatClient::getVisite échec HTTP', [
                    'plate'  => $plate,
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);

                return null;
            }

            $items = $response->json();

            if (! is_array($items) || empty($items)) {
                return null;
            }

            // Cherche la visite courante ; à défaut prend la première
            $current = collect($items)->firstWhere('isCurrent', true) ?? $items[0];

            return $this->normalize($current);
        } catch (\Throwable $e) {
            Log::warning('ImmatClient::getVisite exception', [
                'plate'   => $plate,
                'message' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Retourne l'historique complet des visites pour une plaque donnée,
     * du plus récent au plus ancien.
     *
     * @return array<int, array>  tableau vide si introuvable ou API indisponible.
     */
    public function getVisiteHistory(string $plate): array
    {
        $plate = strtoupper(trim($plate));

        try {
            $response = $this->http()->get('/api/immat/getVisite', [
                'Immatriculation' => $plate,
            ]);

            if (! $response->successful()) {
                Log::warning('ImmatClient::getVisiteHistory échec HTTP', [
                    'plate'  => $plate,
                    'status' => $response->status(),
                ]);

                return [];
            }

            $items = $response->json();

            if (! is_array($items)) {
                return [];
            }

            return array_map(fn ($item) => $this->normalize($item), $items);
        } catch (\Throwable $e) {
            Log::warning('ImmatClient::getVisiteHistory exception', [
                'plate'   => $plate,
                'message' => $e->getMessage(),
            ]);

            return [];
        }
    }

    // -------------------------------------------------------------------------
    // Helpers privés
    // -------------------------------------------------------------------------

    /**
     * Normalise un enregistrement brut de l'API en tableau homogène exploitable
     * par les contrôleurs et le modèle Vehicle.
     */
    private function normalize(array $raw): array
    {
        $dateFin = $this->parseDate($raw['dateValiditeFin'] ?? null);

        return [
            'immatriculation'          => $raw['immatriculation'] ?? null,
            'nom_proprietaire'         => $raw['nomProprietaire'] ?? null,
            'marque'                   => $raw['marque'] ?? null,
            'type_vehicule'            => $raw['typeVehicule'] ?? null,
            'numero_serie'             => $raw['numeroSerie'] ?? null,
            'carrosserie'              => $raw['carrosserie'] ?? null,
            'nombre_place'             => (int) ($raw['nombrePlace'] ?? 0),
            'date_mise_en_circulation' => $this->parseDate($raw['dateMiseEnCirculation'] ?? null),
            'energie'                  => $raw['energie'] ?? null,
            'puissance_fiscale'        => (int) ($raw['puissanceFiscale'] ?? 0),
            'couleur'                  => $raw['couleur'] ?? null,
            'ptac'                     => (int) ($raw['ptac'] ?? 0),
            'numero_certificat_visite' => $raw['numeroCertificatVisite'] ?? null,
            'date_validite_debut'      => $this->parseDate($raw['dateValiditeDebut'] ?? null),
            'date_validite_fin'        => $dateFin,
            'montant_visite'           => (float) ($raw['montantVisite'] ?? 0),
            'montant_securisation'     => (float) ($raw['montantSecurisation'] ?? 0),
            'montant_vignette'         => (float) ($raw['montantVignette'] ?? 0),
            'is_current'               => (bool) ($raw['isCurrent'] ?? false),
            'ct_status'                => $this->derivCtStatus($dateFin),
        ];
    }

    /**
     * Extrait la partie date (Y-m-d) d'une chaîne ISO 8601 de l'API.
     * Retourne null si la valeur est vide ou invalide.
     */
    private function parseDate(?string $value): ?string
    {
        if (empty($value)) {
            return null;
        }

        try {
            return Carbon::parse($value)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Déduit le statut CT depuis la date d'expiration :
     *  - en_retard  : expirée
     *  - bientot    : expire dans <= 14 jours
     *  - a_jour     : valide
     */
    private function derivCtStatus(?string $dateFinStr): string
    {
        if (! $dateFinStr) {
            return 'jamais_controle';
        }

        try {
            $days = Carbon::today()->diffInDays(Carbon::parse($dateFinStr), false);

            if ($days < 0) {
                return 'en_retard';
            }
            if ($days <= 14) {
                return 'bientot';
            }

            return 'a_jour';
        } catch (\Throwable) {
            return 'jamais_controle';
        }
    }
}
