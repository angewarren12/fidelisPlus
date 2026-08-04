<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\LoyaltyAccount;
use App\Models\User;
use App\Services\Loyalty\LoyaltyAccountFactory;
use App\Services\Loyalty\LoyaltyCommercialVisibility;
use App\Services\Loyalty\LoyaltyPointsService;
use App\Services\Loyalty\LoyaltyRulesService;
use App\Services\Loyalty\SignedLoyaltyQrService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class LoyaltyAccountController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min(100, max(5, (int) $request->get('per_page', 20)));

        $q = LoyaltyAccount::query()
            ->with(['company:id,name,type,category,created_via_marketing', 'user:id,first_name,last_name,email,company_id', 'member', 'batch:id,status'])
            ->orderByDesc('updated_at')
            // Par défaut, les cartes vierges (pas encore associées à un client) sont exclues
            // de la liste des comptes fidélité — elles ne sont visibles que via le stock du
            // Studio Carte (holder_type=unassigned explicitement demandé).
            ->when($request->filled('holder_type'), fn ($qq) => $qq->where('holder_type', $request->input('holder_type')))
            ->when(! $request->filled('holder_type'), fn ($qq) => $qq->where('holder_type', '!=', 'unassigned'))
            ->when($request->filled('batch_status'), fn ($qq) => $qq->whereHas('batch', fn ($b) => $b->where('status', $request->input('batch_status'))))
            ->when($request->filled('blank_card_type'), fn ($qq) => $qq->where('blank_card_type', $request->input('blank_card_type')))
            ->when($request->filled('search'), fn ($qq) => $qq->where('card_number', 'like', '%'.$request->input('search').'%'));
        LoyaltyCommercialVisibility::scopeLoyaltyAccounts($q, $request->user());
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

    public function show(Request $request, int $id): JsonResponse
    {
        $q = LoyaltyAccount::query()->with(['company', 'user', 'member', 'batch:id,status'])->whereKey($id);
        LoyaltyCommercialVisibility::scopeLoyaltyAccounts($q, $request->user());
        $account = $q->firstOrFail();

        return response()->json([
            'status' => 'success',
            'data' => $account,
        ]);
    }

    public function bootstrap(Request $request, LoyaltyAccountFactory $factory): JsonResponse
    {
        $request->validate([
            'company_id' => 'nullable|exists:companies,id',
            'user_id' => 'nullable|exists:users,id',
            'qr_payload' => 'nullable|string',
            'subscriber_name' => 'nullable|string|max:120',
            'trade_register' => 'nullable|string|max:80',
            'subscriber_function' => 'nullable|string|max:80',
        ]);

        if (! $request->filled('company_id') && ! $request->filled('user_id')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Fournir company_id ou user_id.',
            ], 422);
        }

        if ($request->filled('company_id') && $request->filled('user_id')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Un seul des deux : company_id ou user_id.',
            ], 422);
        }

        $publicUuid = null;
        $qr = null;

        if ($request->filled('qr_payload')) {
            try {
                [$publicUuid, $qr] = $this->parsePhysicalQrPayload(trim($request->input('qr_payload')));
            } catch (\InvalidArgumentException $e) {
                return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
            }

            // Vérifier si ce public_uuid est déjà lié à un autre compte
            $exists = LoyaltyAccount::where('public_uuid', $publicUuid)->exists();
            if ($exists) {
                // Si le compte existe déjà pour CE client, on peut continuer. Sinon c'est une collision.
                $queryExist = LoyaltyAccount::where('public_uuid', $publicUuid);
                if ($request->filled('company_id')) {
                    $queryExist->where('company_id', '!=', (int) $request->company_id);
                } else {
                    $queryExist->where('user_id', '!=', (int) $request->user_id);
                }
                if ($queryExist->exists()) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Ce code QR ou carte physique est déjà associé à un autre compte fidélité.',
                    ], 422);
                }
            }
        }

        if ($request->filled('company_id')) {
            $company = Company::query()->findOrFail((int) $request->company_id);
            $account = $factory->firstOrCreateForCompany($company);
        } else {
            $user = User::query()->findOrFail((int) $request->user_id);
            $account = $factory->firstOrCreateForClientUser($user);
        }

        if ($publicUuid !== null) {
            $account->update(['public_uuid' => $publicUuid]);
        }

        if ($request->filled('subscriber_name') || $request->filled('trade_register') || $request->filled('subscriber_function')) {
            $account->update(array_filter([
                'subscriber_name' => $request->input('subscriber_name'),
                'trade_register' => $request->input('trade_register'),
                'subscriber_function' => $request->input('subscriber_function'),
            ], fn ($v) => $v !== null));
        }

        if ($qr === null) {
            try {
                $qr = app(SignedLoyaltyQrService::class)->encode([
                    'account_uuid' => $account->public_uuid,
                    'jti' => bin2hex(random_bytes(8)),
                    'exp' => 0, // Permanent pour cartes physiques
                    'points_per_scan' => app(LoyaltyRulesService::class)->getPointsPerScan($account),
                ]);
            } catch (\Throwable $e) {
                return response()->json([
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ], 503);
            }
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'loyalty_account' => $account->fresh(),
                'qr_payload' => $qr,
            ],
        ]);
    }

    /**
     * Associe une carte physique vierge (générée en masse depuis le Studio Carte) à un
     * compte fidélité existant déjà créé. Logique déléguée à LoyaltyCardAssignmentService,
     * partagée avec le flux marketing "Mes Clients" — mêmes règles de sécurité partout
     * (carte vierge uniquement, pas de remplacement d'un compte qui a déjà un historique).
     */
    public function associateCard(Request $request, int $id, \App\Services\Loyalty\LoyaltyCardAssignmentService $assignmentService): JsonResponse
    {
        $request->validate([
            'qr_payload' => 'required|string',
        ]);

        $account = LoyaltyAccount::query()->findOrFail($id);

        try {
            $updated = $assignmentService->assignBlankCard($account, trim($request->input('qr_payload')));
        } catch (\InvalidArgumentException $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }

        $qr = app(SignedLoyaltyQrService::class)->encode([
            'account_uuid' => $updated->public_uuid,
            'jti' => bin2hex(random_bytes(8)),
            'exp' => 0,
            'points_per_scan' => app(LoyaltyRulesService::class)->getPointsPerScan($updated),
        ]);

        return response()->json([
            'status' => 'success',
            'data' => [
                'loyalty_account' => $updated->fresh(['company', 'user']),
                'qr_payload' => $qr,
            ],
        ]);
    }

    /**
     * Décode un payload QR chiffré (toute carte physique doit porter un QR généré par
     * SignedLoyaltyQrService — plus de mode "code brut" accepté sans vérification) et
     * retourne [public_uuid, qr_payload_a_renvoyer].
     *
     * @return array{0: string, 1: string}
     */
    private function parsePhysicalQrPayload(string $qrPayload): array
    {
        try {
            $claims = app(SignedLoyaltyQrService::class)->decodeAndVerify($qrPayload);
        } catch (\Exception $e) {
            throw new \InvalidArgumentException('Code QR invalide ou carte falsifiée : ' . $e->getMessage());
        }

        return [$claims['account_uuid'], $qrPayload];
    }

    /**
     * Export PDF (format carte bancaire imprimable) d'une carte déjà associée à un client,
     * sur le modèle choisi côté Studio Carte — même rendu que les lots générés en masse.
     */
    public function downloadCard(Request $request, int $id, \App\Services\Loyalty\LoyaltyCardPdfService $pdfService): Response
    {
        $request->validate([
            'template_id' => 'required|integer|exists:loyalty_card_templates,id',
        ]);

        $account = LoyaltyAccount::query()->findOrFail($id);
        $template = \App\Models\LoyaltyCardTemplate::query()->findOrFail($request->integer('template_id'));

        return $pdfService->forAccounts([$account], $template, 'carte-fidelite-'.$account->card_number.'.pdf');
    }

    public function qrPayload(Request $request, int $id): JsonResponse
    {
        $account = LoyaltyAccount::query()->findOrFail($id);

        if ($request->boolean('regenerate')) {
            $account->regenerateUuid();
            $account = $account->fresh();
        }

        try {
            $qr = app(SignedLoyaltyQrService::class)->encode([
                'account_uuid' => $account->public_uuid,
                'jti' => bin2hex(random_bytes(8)),
                'exp' => 0, // Permanent pour cartes physiques
                'points_per_scan' => app(LoyaltyRulesService::class)->getPointsPerScan($account),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 503);
        }

        return response()->json([
            'status' => 'success',
            'data' => ['qr_payload' => $qr],
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'subscriber_name' => 'nullable|string|max:120',
            'trade_register' => 'nullable|string|max:80',
            'subscriber_function' => 'nullable|string|max:80',
            'blocked' => 'nullable|boolean',
        ]);

        $account = LoyaltyAccount::query()->findOrFail($id);

        $account->fill($request->only(['subscriber_name', 'trade_register', 'subscriber_function']));

        if ($request->has('blocked')) {
            $account->blocked_at = $request->boolean('blocked') ? now() : null;
        }

        $account->save();

        return response()->json([
            'status' => 'success',
            'data' => $account->fresh(['company', 'user', 'member', 'batch:id,status']),
        ]);
    }

    public function scanHistory(Request $request, int $id): JsonResponse
    {
        $account = LoyaltyAccount::query()->findOrFail($id);

        $perPage = min(100, max(5, (int) $request->get('per_page', 20)));

        $history = $account->scanEvents()
            ->with(['station', 'cashier'])
            ->latest()
            ->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $history->items(),
            'meta' => [
                'current_page' => $history->currentPage(),
                'last_page' => $history->lastPage(),
                'total' => $history->total(),
            ],
        ]);
    }

    public function adjust(Request $request, int $id, LoyaltyPointsService $points): JsonResponse
    {
        $request->validate([
            'delta_points' => 'required|integer',
            'reason' => 'required|string|max:500',
        ]);

        $account = LoyaltyAccount::query()->findOrFail($id);

        $result = $points->adjust(
            $account,
            (int) $request->delta_points,
            $request->string('reason')->toString(),
            $request->user(),
        );

        if (! $result['success']) {
            return response()->json([
                'status' => 'error',
                'message' => $result['message'],
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'points_delta' => $result['points_delta'],
                'new_balance' => $result['new_balance'],
            ],
        ]);
    }
}
