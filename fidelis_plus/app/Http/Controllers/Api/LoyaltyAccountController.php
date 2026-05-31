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
            ->with(['company:id,name,type,category', 'user:id,first_name,last_name,email,company_id'])
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
            $qrPayload = trim($request->input('qr_payload'));
            
            if (str_contains($qrPayload, '.')) {
                // Code QR signé
                try {
                    $claims = app(SignedLoyaltyQrService::class)->decodeAndVerify($qrPayload);
                    $publicUuid = $claims['account_uuid'];
                    $qr = $qrPayload;
                } catch (\Exception $e) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Code QR signé invalide ou signature corrompue : ' . $e->getMessage(),
                    ], 422);
                }
            } else {
                // Code QR brut
                if (!preg_match('/^[a-zA-Z0-9\-]{6,100}$/', $qrPayload)) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Format de code QR physique brut invalide (doit être alphanumérique, entre 6 et 100 caractères).',
                    ], 422);
                }
                $publicUuid = $qrPayload;
                $qr = $qrPayload;
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
