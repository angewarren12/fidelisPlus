<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LoyaltyMember;
use App\Services\Loyalty\LoyaltyAccountFactory;
use App\Services\Loyalty\LoyaltyRulesService;
use App\Services\Loyalty\SignedLoyaltyQrService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Intégration API avec l'app mobile client SIRA :
 * - SIRA appelle `register` quand un client clique "Demande de carte" dans SIRA.
 * - SIRA appelle `show`/`history` pour afficher la carte virtuelle, le solde et
 *   l'historique de points dans l'espace fidélité de l'app.
 * - SIRA appelle `syncVehicles` à chaque ajout/modification/suppression d'un véhicule
 *   dans son propre espace client, pour que la caissière puisse ensuite le proposer
 *   au scan en station (immatriculation connue, pas de ressaisie).
 *
 * Toutes les routes de ce contrôleur sont protégées par le middleware `sira.token`
 * (jeton de service partagé, pas une session utilisateur Fidelis).
 */
class LoyaltySiraIntegrationController extends Controller
{
    public function register(Request $request, LoyaltyAccountFactory $factory): JsonResponse
    {
        $data = $request->validate([
            'sira_client_id' => 'required|string|max:100',
            'type' => ['required', Rule::in(['particulier', 'entreprise'])],
            'contact' => 'required|string|max:40',
            'email' => 'nullable|email|max:190',
            'nom' => 'required_if:type,particulier|nullable|string|max:120',
            'prenom' => 'required_if:type,particulier|nullable|string|max:120',
            'nom_entreprise' => 'required_if:type,entreprise|nullable|string|max:190',
            'registre_commerce' => 'nullable|string|max:80',
            'nom_abonne' => 'nullable|string|max:190',
            'fonction' => 'nullable|string|max:80',
            // Véhicules déjà déclarés dans SIRA au moment de l'inscription (optionnel).
            'vehicles' => 'nullable|array',
            'vehicles.*.sira_vehicle_id' => 'nullable|string|max:100',
            'vehicles.*.registration' => 'required_with:vehicles|string|max:30',
            'vehicles.*.brand' => 'nullable|string|max:60',
            'vehicles.*.model' => 'nullable|string|max:60',
            'vehicles.*.color' => 'nullable|string|max:40',
        ]);

        $memberData = collect($data)->except('vehicles')->all();

        $member = LoyaltyMember::query()->where('sira_client_id', $data['sira_client_id'])->first();

        if ($member === null) {
            // Le client a peut-être déjà une carte créée au guichet/marketing, pas encore
            // liée à SIRA (sira_client_id vide). On la rattache via le numéro de contact
            // plutôt que de créer un deuxième compte fidélité en doublon.
            $member = $this->findUnclaimedMemberByContact($data['contact']);
        }

        // Un membre déjà validé (créé au guichet, ou dont une précédente demande SIRA a été
        // approuvée) obtient sa carte immédiatement. Un tout nouveau demandeur SIRA passe par
        // une validation manuelle du marketing avant que le compte fidélité ne soit créé.
        if ($member !== null && $member->status === 'validated') {
            $member->fill(collect($memberData)->except('sira_client_id')->all());
            $member->sira_client_id = $data['sira_client_id'];
            $member->save();

            $account = $factory->firstOrCreateForMember($member);

            if (! empty($data['vehicles'])) {
                $this->replaceVehicles($member, $data['vehicles']);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Carte fidélité créée.',
                'data' => $this->cardPayload($member, $account),
            ], 201);
        }

        if ($member !== null && $member->status === 'pending') {
            // Nouvel appel pour une demande déjà en attente (ex: SIRA relance à l'ouverture
            // de l'app) : on met à jour les infos mais on ne recrée rien.
            $member->fill(collect($memberData)->except('sira_client_id')->all());
            $member->sira_client_id = $data['sira_client_id'];
            $member->save();

            return response()->json([
                'status' => 'pending',
                'message' => 'Demande reçue, en attente de validation.',
            ], 202);
        }

        // Nouvelle demande : le compte fidélité n'est créé qu'après validation par le marketing.
        $member = LoyaltyMember::query()->create([
            ...$memberData,
            'source' => 'sira',
            'status' => 'pending',
            'requested_at' => now(),
        ]);

        if (! empty($data['vehicles'])) {
            $this->replaceVehicles($member, $data['vehicles']);
        }

        return response()->json([
            'status' => 'pending',
            'message' => 'Demande reçue, en attente de validation.',
        ], 202);
    }

    /**
     * Synchronisation complète des véhicules du client (SIRA envoie l'état courant
     * de sa liste à chaque changement — Fidelis remplace, pas de diff à calculer côté SIRA).
     */
    public function syncVehicles(Request $request, string $siraClientId): JsonResponse
    {
        $member = LoyaltyMember::query()->where('sira_client_id', $siraClientId)->firstOrFail();

        $data = $request->validate([
            'vehicles' => 'present|array',
            'vehicles.*.sira_vehicle_id' => 'nullable|string|max:100',
            'vehicles.*.registration' => 'required|string|max:30',
            'vehicles.*.brand' => 'nullable|string|max:60',
            'vehicles.*.model' => 'nullable|string|max:60',
            'vehicles.*.color' => 'nullable|string|max:40',
        ]);

        $this->replaceVehicles($member, $data['vehicles']);

        return response()->json([
            'status' => 'success',
            'message' => 'Véhicules synchronisés.',
            'data' => $member->vehicles()->get(['registration', 'brand', 'model', 'color']),
        ]);
    }

    /**
     * Retrouve une fiche client créée au guichet/marketing (jamais liée à SIRA) à partir
     * du numéro de contact, pour rattacher son compte fidélité existant plutôt que d'en
     * créer un doublon lors de son inscription dans SIRA.
     */
    private function findUnclaimedMemberByContact(string $contact): ?LoyaltyMember
    {
        $normalized = preg_replace('/\D+/', '', $contact);
        if ($normalized === '') {
            return null;
        }

        $candidate = LoyaltyMember::query()
            ->whereNull('sira_client_id')
            ->get(['id', 'contact'])
            ->first(fn (LoyaltyMember $m) => preg_replace('/\D+/', '', (string) $m->contact) === $normalized);

        return $candidate !== null ? LoyaltyMember::query()->find($candidate->id) : null;
    }

    private function replaceVehicles(LoyaltyMember $member, array $vehicles): void
    {
        DB::transaction(function () use ($member, $vehicles) {
            $member->vehicles()->delete();
            foreach ($vehicles as $v) {
                $member->vehicles()->create([
                    'sira_vehicle_id' => $v['sira_vehicle_id'] ?? null,
                    'registration' => $v['registration'],
                    'brand' => $v['brand'] ?? null,
                    'model' => $v['model'] ?? null,
                    'color' => $v['color'] ?? null,
                ]);
            }
        });
    }

    public function show(string $siraClientId): JsonResponse
    {
        $member = LoyaltyMember::query()->where('sira_client_id', $siraClientId)->with('loyaltyAccount')->firstOrFail();

        if ($member->status === 'pending') {
            return response()->json([
                'status' => 'pending',
                'message' => 'Demande reçue, en attente de validation.',
            ], 202);
        }

        if ($member->status === 'rejected') {
            return response()->json([
                'status' => 'rejected',
                'message' => $member->rejection_reason ?: 'Demande refusée.',
            ], 404);
        }

        $account = $member->loyaltyAccount;
        if ($account === null) {
            return response()->json(['status' => 'error', 'message' => 'Aucune carte fidélité pour ce client.'], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $this->cardPayload($member, $account),
        ]);
    }

    public function history(Request $request, string $siraClientId): JsonResponse
    {
        $member = LoyaltyMember::query()->where('sira_client_id', $siraClientId)->with('loyaltyAccount')->firstOrFail();
        $account = $member->loyaltyAccount;
        if ($account === null) {
            return response()->json(['status' => 'error', 'message' => 'Aucune carte fidélité pour ce client.'], 404);
        }

        $perPage = min(100, max(5, (int) $request->get('per_page', 20)));
        $history = $account->scanEvents()
            ->with('station:id,name')
            ->latest()
            ->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $history->getCollection()->map(fn ($e) => [
                'date' => $e->created_at?->toIso8601String(),
                'points' => $e->points_credited,
                'station' => $e->station->name ?? null,
                'vehicle_registration' => $e->vehicle_registration,
                'vehicle_brand' => $e->vehicle_brand,
                'vehicle_color' => $e->vehicle_color,
                'visit_type' => $e->visit_type,
            ]),
            'meta' => [
                'current_page' => $history->currentPage(),
                'last_page' => $history->lastPage(),
                'total' => $history->total(),
            ],
        ]);
    }

    private function cardPayload(LoyaltyMember $member, \App\Models\LoyaltyAccount $account): array
    {
        $qr = app(SignedLoyaltyQrService::class)->encode([
            'account_uuid' => $account->public_uuid,
            'jti' => bin2hex(random_bytes(8)),
            'exp' => 0,
            'points_per_scan' => app(LoyaltyRulesService::class)->getPointsPerScan($account),
        ]);

        return [
            'sira_client_id' => $member->sira_client_id,
            'display_name' => $member->displayName(),
            'card_number' => $account->card_number,
            'qr_payload' => $qr,
            'points_balance' => $account->points_balance,
        ];
    }
}
