<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LoyaltyAccount;
use App\Models\LoyaltyPosScanEvent;
use App\Models\Station;
use App\Services\Loyalty\LoyaltyCommercialVisitNotifier;
use App\Services\Loyalty\SignedLoyaltyQrService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class LoyaltyPosScanController extends Controller
{
    public function __construct(
        private readonly SignedLoyaltyQrService $qrService,
        private readonly LoyaltyCommercialVisitNotifier $visitNotifier,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $history = LoyaltyPosScanEvent::query()
            ->with(['loyaltyAccount.company', 'loyaltyAccount.user', 'station'])
            ->where('cashier_user_id', $request->user()->id)
            ->latest()
            ->paginate(20);

        return response()->json([
            'status' => 'success',
            'data' => $history->items(),
            'meta' => [
                'current_page' => $history->currentPage(),
                'last_page' => $history->lastPage(),
                'total' => $history->total(),
            ]
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $idempotencyKey = trim((string) $request->header('Idempotency-Key', ''));
        if ($idempotencyKey === '' || strlen($idempotencyKey) > 80) {
            return response()->json([
                'status' => 'error',
                'message' => 'L\'en-tête Idempotency-Key est obligatoire (max 80 caractères).',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'qr_payload' => 'required|string|max:8192',
            'station_id' => 'required|integer|exists:stations,id',
            'device_id' => 'nullable|string|max:128',
            'occurred_at' => 'required|date',
            'vehicle_registration' => 'nullable|string|max:30',
            'vehicle_brand' => 'nullable|string|max:60',
            'vehicle_color' => 'nullable|string|max:40',
            'visit_type' => 'nullable|string|max:40',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $existingByKey = LoyaltyPosScanEvent::query()->where('idempotency_key', $idempotencyKey)->first();
        if ($existingByKey !== null) {
            return $this->duplicateIdempotencyResponse($existingByKey);
        }

        try {
            $claims = $this->qrService->decodeAndVerify($request->string('qr_payload')->toString());
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        } catch (\RuntimeException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }

        if ($this->qrService->isExpired($claims['exp'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Carte ou QR expiré.',
            ], 422);
        }

        $user = $request->user();

        try {
            $result = DB::transaction(function () use ($request, $claims, $idempotencyKey, $user) {
                $vehicleRegistration = $request->input('vehicle_registration');
                $vehicleBrand = $request->input('vehicle_brand');
                $vehicleColor = $request->input('vehicle_color');
                $visitType = $request->input('visit_type', 'visite_technique');
                if (LoyaltyPosScanEvent::query()->where('qr_jti', $claims['jti'])->lockForUpdate()->exists()) {
                    return ['conflict' => 'jti'];
                }

                /** @var LoyaltyAccount|null $account */
                $account = LoyaltyAccount::query()->where('public_uuid', $claims['account_uuid'])->lockForUpdate()->first();
                if ($account === null) {
                    return ['error' => 'Carte invalide ou révoquée.'];
                }
                if ($account->holder_type === 'unassigned') {
                    return ['error' => 'Cette carte est encore vierge (pas encore remise à un client).'];
                }
                if ($account->isBlocked()) {
                    return ['error' => 'Compte fidélité bloqué.'];
                }

                $cooldown = (int) config('loyalty.scan_cooldown_seconds', 180);
                if ($cooldown > 0) {
                    $recentScan = LoyaltyPosScanEvent::query()
                        ->where('loyalty_account_id', $account->id)
                        ->where('created_at', '>=', now()->subSeconds($cooldown))
                        ->exists();
                    if ($recentScan) {
                        return ['error' => 'Cette carte vient déjà d\'être scannée, veuillez patienter avant de rescanner.'];
                    }
                }

                $points = $claims['points_per_scan'];

                // Traitement dynamique pour les paliers et modificateurs de points (Ex: 500 points pour Apporteur, et déblocage de packages)
                app(\App\Services\Loyalty\LoyaltyMilestoneService::class)->processScan($account, $points);

                $account->points_balance += $points;
                $account->save();

                LoyaltyPosScanEvent::query()->create([
                    'idempotency_key' => $idempotencyKey,
                    'qr_jti' => $claims['jti'],
                    'loyalty_account_id' => $account->id,
                    'cashier_user_id' => $user->id,
                    'station_id' => (int) $request->input('station_id'),
                    'points_credited' => $points,
                    'payload_hash' => $this->qrService->payloadHash($request->string('qr_payload')->toString()),
                    'device_id' => $request->input('device_id'),
                    'vehicle_registration' => $vehicleRegistration,
                    'vehicle_brand' => $vehicleBrand,
                    'vehicle_color' => $vehicleColor,
                    'visit_type' => $visitType,
                ]);

                return [
                    'success' => true,
                    'account' => $account->fresh(),
                    'points_credited' => $points,
                ];
            });
        } catch (QueryException $e) {
            if ($this->isDuplicateKey($e, 'idempotency_key')) {
                $dup = LoyaltyPosScanEvent::query()->where('idempotency_key', $idempotencyKey)->first();
                if ($dup !== null) {
                    return $this->duplicateIdempotencyResponse($dup);
                }
            }
            if ($this->isDuplicateKey($e, 'qr_jti')) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Ce QR a déjà été utilisé.',
                ], 422);
            }

            throw $e;
        }

        if (isset($result['conflict']) && $result['conflict'] === 'jti') {
            return response()->json([
                'status' => 'error',
                'message' => 'Ce QR a déjà été utilisé.',
            ], 422);
        }
        if (isset($result['error'])) {
            return response()->json([
                'status' => 'error',
                'message' => $result['error'],
            ], 422);
        }

        /** @var LoyaltyAccount $acc */
        $acc = $result['account'];

        $station = Station::query()->find((int) $request->input('station_id'));
        $this->visitNotifier->notifyVisitValidated($acc, $station, (int) $result['points_credited']);

        return response()->json([
            'status' => 'success',
            'data' => [
                'success' => true,
                'points_credited' => $result['points_credited'],
                'new_balance' => $acc->points_balance,
                'loyalty_account_id' => $acc->id,
            ],
        ]);
    }

    public function verify(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'qr_payload' => 'required|string|max:8192',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $claims = $this->qrService->decodeAndVerify($request->string('qr_payload')->toString());
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }

        if ($this->qrService->isExpired($claims['exp'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Carte ou QR expiré.',
            ], 422);
        }

        /** @var LoyaltyAccount|null $account */
        $account = LoyaltyAccount::query()
            ->with(['company', 'user', 'member.vehicles'])
            ->where('public_uuid', $claims['account_uuid'])
            ->first();

        if ($account === null) {
            return response()->json([
                'status' => 'error',
                'message' => 'Carte invalide ou révoquée.',
            ], 422);
        }

        if ($account->holder_type === 'unassigned') {
            return response()->json([
                'status' => 'error',
                'message' => 'Cette carte est encore vierge (pas encore remise à un client).',
            ], 422);
        }

        $holderName = match ($account->holder_type) {
            'company' => $account->company->name ?? 'Société',
            'member' => $account->member?->displayName() ?? 'Client',
            default => $account->user ? $account->user->first_name.' '.$account->user->last_name : 'Particulier',
        };

        // Véhicules à proposer à la caissière (sélection au lieu de ressaisie) :
        // en priorité ceux déclarés par le client dans SIRA, sinon ceux déjà vus
        // lors de précédents passages sur cette carte.
        $memberVehicles = $account->member?->vehicles;
        if ($memberVehicles !== null && $memberVehicles->isNotEmpty()) {
            $knownVehicles = $memberVehicles
                ->map(fn ($v) => [
                    'vehicle_registration' => $v->registration,
                    'vehicle_brand' => $v->brand,
                    'vehicle_color' => $v->color,
                ])
                ->values();
            $vehiclesSource = 'sira';
        } else {
            $knownVehicles = $account->scanEvents()
                ->whereNotNull('vehicle_registration')
                ->latest()
                ->limit(20)
                ->get(['vehicle_registration', 'vehicle_brand', 'vehicle_color'])
                ->unique('vehicle_registration')
                ->values()
                ->take(5);
            $vehiclesSource = 'historique';
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'account_id' => $account->id,
                'public_uuid' => $account->public_uuid,
                'holder_name' => $holderName,
                'holder_type' => $account->holder_type,
                'points_balance' => $account->points_balance,
                'points_per_scan' => $claims['points_per_scan'],
                'is_blocked' => $account->isBlocked(),
                'company_type' => $account->company->company_type ?? 'N/A',
                'known_vehicles' => $knownVehicles,
                'known_vehicles_source' => $vehiclesSource,
            ],
        ]);
    }

    private function duplicateIdempotencyResponse(LoyaltyPosScanEvent $duplicate): JsonResponse
    {
        $account = $duplicate->loyaltyAccount;

        return response()->json([
            'status' => 'success',
            'data' => [
                'success' => true,
                'duplicate' => true,
                'points_credited' => $duplicate->points_credited,
                'new_balance' => $account !== null ? $account->points_balance : null,
                'loyalty_account_id' => $duplicate->loyalty_account_id,
            ],
        ], 409);
    }

    private function isDuplicateKey(QueryException $e, string $columnHint): bool
    {
        $msg = $e->getMessage();

        return str_contains($msg, $columnHint)
            || str_contains($msg, 'UNIQUE constraint failed')
            || (int) ($e->errorInfo[1] ?? 0) === 1062;
    }
}
