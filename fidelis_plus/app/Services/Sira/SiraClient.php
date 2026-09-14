<?php

namespace App\Services\Sira;

use App\Models\LoyaltyMember;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Client HTTP sortant de Fidelis Plus vers l'API de SIRA — Provisioning v2.1
 *
 * Spécifications de l'API SIRA v2.1 (Partenaire Fidelis) :
 * - URL Base Préprod / Prod : https://sira.immat-express.com/api/partners/fidelis
 * - Auth : Authorization: Bearer {SIRA_OUTBOUND_TOKEN}
 * - Constraints (§8) : Timeout 5s connexion / 15s total, allow_redirects = false, HTTPS obligatoire.
 * - Endpoints exposés par SIRA :
 *   1. GET  /partners/fidelis/users/lookup?phone=... -> { exists: bool, sira_client_id: ?string, status: ?string }
 *   2. POST /partners/fidelis/users -> 202 Accepted { sira_client_id, status: 'pending', message, login, already_existed }
 *   3. GET  /partners/fidelis/users/{sira_client_id} -> { sira_client_id, status: 'pending'|'active'|'rejected', login, status_changed_at }
 */
class SiraClient
{
    public function __construct(
        private readonly ?string $baseUrl = null,
        private readonly ?string $token = null,
    ) {}

    private function http()
    {
        return Http::baseUrl($this->baseUrl ?? (string) config('services.sira.outbound_base_url'))
            ->withToken($this->token ?? (string) config('services.sira.outbound_token'))
            ->acceptJson()
            ->connectTimeout(5)
            ->timeout(15)
            ->withOptions(['allow_redirects' => false]);
    }

    /**
     * Vérifier si un numéro possède déjà un compte SIRA (§7).
     *
     * @return array{exists: bool, sira_client_id: ?string, status: ?string}|null
     */
    public function lookupUser(string $contact): ?array
    {
        try {
            $response = $this->http()->get('/partners/fidelis/users/lookup', ['phone' => $contact]);

            if (! $response->successful()) {
                Log::warning('SiraClient::lookupUser a échoué', [
                    'status' => $response->status(),
                    'contact' => $contact,
                    'body' => $response->json(),
                ]);

                return null;
            }

            return [
                'exists' => (bool) $response->json('exists'),
                'sira_client_id' => $response->json('sira_client_id'),
                'status' => $response->json('status'),
            ];
        } catch (\Throwable $e) {
            Log::warning('SiraClient::lookupUser exception', ['message' => $e->getMessage(), 'contact' => $contact]);

            return null;
        }
    }

    /**
     * Déposer une demande de création de compte SIRA (§5).
     *
     * SIRA v2.0+ répond 202 Accepted ("status": "pending") si nouvelle demande,
     * ou 200 OK ("status": "active", "already_existed": true) si le compte existe déjà.
     * SIRA gère l'envoi des accès au client lors de la validation admin.
     *
     * @return array{sira_client_id: string, status: string, message: ?string, already_existed: bool, login: ?string}|null
     */
    public function createUser(LoyaltyMember $member): ?array
    {
        try {
            $payload = array_filter([
                'type' => $member->type ?: 'particulier',
                'nom' => $member->nom,
                'prenom' => $member->prenom,
                'nom_entreprise' => $member->nom_entreprise,
                'contact' => $member->contact,
                'email' => $member->email,
            ]);

            $response = $this->http()->post('/partners/fidelis/users', $payload);

            if (! $response->successful()) {
                Log::warning('SiraClient::createUser a échoué', [
                    'status' => $response->status(),
                    'member_id' => $member->id,
                    'body' => $response->json(),
                ]);

                return null;
            }

            return [
                'sira_client_id' => (string) $response->json('sira_client_id'),
                'status' => (string) ($response->json('status') ?? 'pending'),
                'message' => $response->json('message'),
                'already_existed' => (bool) $response->json('already_existed'),
                'login' => $response->json('login'),
            ];
        } catch (\Throwable $e) {
            Log::warning('SiraClient::createUser exception', ['message' => $e->getMessage(), 'member_id' => $member->id]);

            return null;
        }
    }

    /**
     * Suivre l'état d'une demande de compte SIRA (§6).
     *
     * @return array{sira_client_id: string, status: string, message: ?string, login: ?string, status_changed_at: ?string}|null
     */
    public function getUserStatus(string $siraClientId): ?array
    {
        try {
            $response = $this->http()->get("/partners/fidelis/users/{$siraClientId}");

            if (! $response->successful()) {
                Log::warning('SiraClient::getUserStatus a échoué', [
                    'status' => $response->status(),
                    'sira_client_id' => $siraClientId,
                ]);

                return null;
            }

            return [
                'sira_client_id' => (string) $response->json('sira_client_id'),
                'status' => (string) ($response->json('status') ?? 'pending'),
                'message' => $response->json('message'),
                'login' => $response->json('login'),
                'status_changed_at' => $response->json('status_changed_at'),
            ];
        } catch (\Throwable $e) {
            Log::warning('SiraClient::getUserStatus exception', ['message' => $e->getMessage(), 'sira_client_id' => $siraClientId]);

            return null;
        }
    }
}
