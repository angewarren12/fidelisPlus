<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LoyaltyMember;
use App\Services\Loyalty\LoyaltyAccountFactory;
use App\Services\Loyalty\LoyaltyRulesService;
use App\Services\Loyalty\SignedLoyaltyQrService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Liste de clients propre au marketing (indépendante du CRM commercial) : aucune ligne
 * `companies`/`users` n'est créée pour ces clients. La création d'un membre émet
 * immédiatement son compte fidélité + QR chiffré (carte "client d'abord").
 */
class LoyaltyMemberController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min(100, max(5, (int) $request->get('per_page', 20)));

        $q = LoyaltyMember::query()
            ->with(['loyaltyAccount'])
            // La liste "Mes Clients" ne montre que les clients validés par défaut ; les
            // demandes en attente/refusées ont leur propre écran (voir requests()).
            ->where('status', 'validated')
            ->when($request->filled('type'), fn ($qq) => $qq->where('type', $request->input('type')))
            ->when($request->filled('search'), function ($qq) use ($request) {
                $s = trim((string) $request->input('search'));
                $qq->where(function ($w) use ($s) {
                    $w->where('nom', 'like', "%{$s}%")
                        ->orWhere('prenom', 'like', "%{$s}%")
                        ->orWhere('nom_entreprise', 'like', "%{$s}%")
                        ->orWhere('nom_abonne', 'like', "%{$s}%")
                        ->orWhere('contact', 'like', "%{$s}%")
                        ->orWhere('email', 'like', "%{$s}%");
                });
            })
            ->orderByDesc('id');

        $paginator = $q->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $member = LoyaltyMember::query()->with(['loyaltyAccount'])->findOrFail($id);

        return response()->json(['status' => 'success', 'data' => $member]);
    }

    /**
     * Crée un client fidélité SANS carte : les cartes sont pré-imprimées en masse (voir
     * LoyaltyCardBatchController) et associées après coup en scannant une carte vierge
     * (voir assignCard()) — soit immédiatement après cette création, soit plus tard.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['particulier', 'entreprise'])],
            'contact' => 'required|string|max:40',
            'email' => 'nullable|email|max:190',
            // Particulier
            'nom' => 'required_if:type,particulier|nullable|string|max:120',
            'prenom' => 'required_if:type,particulier|nullable|string|max:120',
            // Entreprise
            'nom_entreprise' => 'required_if:type,entreprise|nullable|string|max:190',
            'registre_commerce' => 'nullable|string|max:80',
            'nom_abonne' => 'nullable|string|max:190',
            'fonction' => 'nullable|string|max:80',
        ]);

        $member = LoyaltyMember::query()->create([
            ...$data,
            'source' => 'guichet',
            'sira_provisioning_status' => 'pending',
        ]);

        \App\Jobs\ProvisionSiraAccountForMember::dispatch($member->id);

        return response()->json([
            'status' => 'success',
            'message' => 'Client fidélité créé. Associez-lui une carte physique.',
            'data' => [
                'member' => $member->fresh(),
            ],
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $member = LoyaltyMember::query()->findOrFail($id);

        $data = $request->validate([
            'contact' => 'sometimes|string|max:40',
            'email' => 'nullable|email|max:190',
            'nom' => 'sometimes|nullable|string|max:120',
            'prenom' => 'sometimes|nullable|string|max:120',
            'nom_entreprise' => 'sometimes|nullable|string|max:190',
            'registre_commerce' => 'sometimes|nullable|string|max:80',
            'nom_abonne' => 'sometimes|nullable|string|max:190',
            'fonction' => 'sometimes|nullable|string|max:80',
        ]);

        $member->update($data);

        return response()->json(['status' => 'success', 'data' => $member->fresh(['loyaltyAccount'])]);
    }

    /**
     * Demandes de carte fidélité soumises depuis SIRA, en attente de validation marketing.
     */
    public function requests(): JsonResponse
    {
        $members = LoyaltyMember::query()
            ->where('status', 'pending')
            ->orderByDesc('requested_at')
            ->get();

        return response()->json(['status' => 'success', 'data' => $members]);
    }

    /**
     * Valide une demande : crée le compte fidélité + émet le QR, comme pour une création directe.
     */
    public function validateRequest(int $id, LoyaltyAccountFactory $factory): JsonResponse
    {
        $member = LoyaltyMember::query()->findOrFail($id);

        if ($member->status !== 'pending') {
            return response()->json([
                'status' => 'error',
                'message' => 'Cette demande n\'est plus en attente.',
            ], 422);
        }

        $member->status = 'validated';
        $member->save();

        $account = $factory->firstOrCreateForMember($member);

        $qr = app(SignedLoyaltyQrService::class)->encode([
            'account_uuid' => $account->public_uuid,
            'jti' => bin2hex(random_bytes(8)),
            'exp' => 0,
            'points_per_scan' => app(LoyaltyRulesService::class)->getPointsPerScan($account),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Demande validée, carte fidélité créée.',
            'data' => [
                'member' => $member->fresh(),
                'loyalty_account' => $account->fresh(),
                'qr_payload' => $qr,
            ],
        ]);
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $member = LoyaltyMember::query()->findOrFail($id);

        if ($member->status !== 'pending') {
            return response()->json([
                'status' => 'error',
                'message' => 'Cette demande n\'est plus en attente.',
            ], 422);
        }

        $data = $request->validate([
            'reason' => 'nullable|string|max:255',
        ]);

        $member->status = 'rejected';
        $member->rejection_reason = $data['reason'] ?? null;
        $member->save();

        return response()->json(['status' => 'success', 'data' => $member->fresh()]);
    }

    /**
     * Relance manuelle du provisioning SIRA après un échec (SIRA indisponible, timeout, etc.).
     */
    public function retryProvisioning(int $id): JsonResponse
    {
        $member = LoyaltyMember::query()->findOrFail($id);

        if ($member->sira_client_id !== null) {
            return response()->json([
                'status' => 'error',
                'message' => 'Ce client est déjà rattaché à un compte SIRA.',
            ], 422);
        }

        $member->sira_provisioning_status = 'pending';
        $member->save();

        \App\Jobs\ProvisionSiraAccountForMember::dispatch($member->id);

        return response()->json(['status' => 'success', 'data' => $member->fresh()]);
    }

    /**
     * Associe une carte physique déjà imprimée (générée en masse, sans client — voir
     * LoyaltyCardBatchController) à ce membre : on scanne le QR de la carte physique, on
     * transfère son identité (public_uuid + card_number) sur le compte du membre, puis on
     * supprime la ligne "vierge" devenue redondante.
     */
    public function assignCard(Request $request, int $id, \App\Services\Loyalty\LoyaltyCardAssignmentService $assignmentService): JsonResponse
    {
        $member = LoyaltyMember::query()->with('loyaltyAccount')->findOrFail($id);

        $data = $request->validate([
            'qr_payload' => 'required|string|max:8192',
        ]);

        try {
            if ($member->loyaltyAccount !== null) {
                $assignmentService->assignBlankCard($member->loyaltyAccount, $data['qr_payload']);
            } else {
                $assignmentService->claimBlankCardForNewMember($data['qr_payload'], $member->id);
            }
        } catch (\InvalidArgumentException $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }

        $fresh = $member->fresh(['loyaltyAccount']);

        return response()->json([
            'status' => 'success',
            'message' => 'Carte physique associée au client.',
            'data' => [
                'member' => $fresh,
                'loyalty_account' => $fresh->loyaltyAccount,
            ],
        ]);
    }
}
