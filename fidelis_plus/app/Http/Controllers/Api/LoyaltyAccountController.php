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

class LoyaltyAccountController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min(100, max(5, (int) $request->get('per_page', 20)));

        $q = LoyaltyAccount::query()
            ->with(['company:id,name,type,category,created_via_marketing', 'user:id,first_name,last_name,email,company_id'])
            ->orderByDesc('updated_at');
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
        $q = LoyaltyAccount::query()->with(['company', 'user'])->whereKey($id);
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
     * Associe un code QR / carte physique à un compte fidélité déjà créé.
     */
    public function associateCard(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'qr_payload' => 'required|string',
        ]);

        $account = LoyaltyAccount::query()->findOrFail($id);

        try {
            [$publicUuid, $qr] = $this->parsePhysicalQrPayload(trim($request->input('qr_payload')));
        } catch (\InvalidArgumentException $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }

        $collision = LoyaltyAccount::where('public_uuid', $publicUuid)
            ->where('id', '!=', $account->id)
            ->exists();
        if ($collision) {
            return response()->json([
                'status' => 'error',
                'message' => 'Ce code QR ou carte physique est déjà associé à un autre compte fidélité.',
            ], 422);
        }

        $account->update(['public_uuid' => $publicUuid]);

        return response()->json([
            'status' => 'success',
            'data' => [
                'loyalty_account' => $account->fresh(['company', 'user']),
                'qr_payload' => $qr,
            ],
        ]);
    }

    /**
     * Décode un payload QR (signé "x.y" ou code brut de carte physique imprimée)
     * et retourne [public_uuid, qr_payload_a_renvoyer].
     *
     * @return array{0: string, 1: string}
     */
    private function parsePhysicalQrPayload(string $qrPayload): array
    {
        if (str_contains($qrPayload, '.')) {
            try {
                $claims = app(SignedLoyaltyQrService::class)->decodeAndVerify($qrPayload);
            } catch (\Exception $e) {
                throw new \InvalidArgumentException('Code QR signé invalide ou signature corrompue : ' . $e->getMessage());
            }

            return [$claims['account_uuid'], $qrPayload];
        }

        if (!preg_match('/^[a-zA-Z0-9\-]{6,100}$/', $qrPayload)) {
            throw new \InvalidArgumentException('Format de code QR physique brut invalide (doit être alphanumérique, entre 6 et 100 caractères).');
        }

        return [$qrPayload, $qrPayload];
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
            'data' => $account->fresh(['company', 'user']),
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
