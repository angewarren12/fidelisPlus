<?php

namespace App\Services\Sira;

use App\Models\LoyaltyMember;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Client HTTP sortant vers l'API de SIRA (sens inverse de l'intégration habituelle :
 * ici c'est Fidelis qui appelle SIRA, pour provisionner un compte client quand celui-ci
 * a été créé d'abord côté marketing/guichet).
 *
 * Contrat attendu côté SIRA (à valider avec leur équipe) :
 * - GET  {base}/partners/fidelis/users/lookup?phone=... -> { exists: bool, sira_client_id?: string }
 * - POST {base}/partners/fidelis/users -> { sira_client_id, login, temporary_password }
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
            ->timeout(8);
    }

    /**
     * @return array{exists: bool, sira_client_id: ?string}|null null si l'appel échoue (SIRA indisponible).
     */
    public function lookupUser(string $contact): ?array
    {
        try {
            $response = $this->http()->get('/partners/fidelis/users/lookup', ['phone' => $contact]);

            if (! $response->successful()) {
                Log::warning('SiraClient::lookupUser a échoué', ['status' => $response->status(), 'contact' => $contact]);

                return null;
            }

            return [
                'exists' => (bool) $response->json('exists'),
                'sira_client_id' => $response->json('sira_client_id'),
            ];
        } catch (\Throwable $e) {
            Log::warning('SiraClient::lookupUser exception', ['message' => $e->getMessage(), 'contact' => $contact]);

            return null;
        }
    }

    /**
     * @return array{sira_client_id: string, login: ?string, temporary_password: ?string}|null null si l'appel échoue.
     */
    public function createUser(LoyaltyMember $member): ?array
    {
        try {
            $response = $this->http()->post('/partners/fidelis/users', [
                'type' => $member->type,
                'nom' => $member->nom,
                'prenom' => $member->prenom,
                'nom_entreprise' => $member->nom_entreprise,
                'contact' => $member->contact,
                'email' => $member->email,
            ]);

            if (! $response->successful()) {
                Log::warning('SiraClient::createUser a échoué', ['status' => $response->status(), 'member_id' => $member->id]);

                return null;
            }

            return [
                'sira_client_id' => (string) $response->json('sira_client_id'),
                'login' => $response->json('login'),
                'temporary_password' => $response->json('temporary_password'),
            ];
        } catch (\Throwable $e) {
            Log::warning('SiraClient::createUser exception', ['message' => $e->getMessage(), 'member_id' => $member->id]);

            return null;
        }
    }
}
