<?php

namespace App\Services\Loyalty;

use App\Models\LoyaltyAccount;
use App\Models\LoyaltyLedgerEntry;
use App\Models\User;
use App\Services\Loyalty\Rules\LoyaltyRulesEngine;
use Illuminate\Support\Facades\DB;

class LoyaltyPointsService
{
    public function __construct(
        private readonly ?LoyaltyQrService $qr = null,
        private readonly ?LoyaltyRulesEngine $rulesEngine = null,
    ) {}

    private function qr(): LoyaltyQrService
    {
        return $this->qr ?? LoyaltyQrService::fromConfig();
    }

    private function engine(): LoyaltyRulesEngine
    {
        return $this->rulesEngine ?? LoyaltyRulesEngine::defaultEngine();
    }

    /**
     * Crédit POS — idempotent via idempotency_key.
     *
     * @return array{success: true, points_credited: int, new_balance: int, loyalty_account_id: int}|array{success: false, code: string, message: string}
     */
    public function creditFromPosScan(
        string $qrPayload,
        string $idempotencyKey,
        User $cashier,
        ?int $stationId = null,
    ): array {
        $verified = $this->qr()->verify($qrPayload);
        if ($verified === null) {
            return ['success' => false, 'code' => 'invalid_qr', 'message' => 'QR invalide ou expiré.'];
        }

        /** @var LoyaltyAccount $account */
        $account = $verified['account'];

        $existing = LoyaltyLedgerEntry::query()->where('idempotency_key', $idempotencyKey)->first();
        if ($existing) {
            $account->refresh();

            return [
                'success' => true,
                'points_credited' => $existing->delta_points,
                'new_balance' => $existing->balance_after,
                'loyalty_account_id' => $account->id,
                'replay' => true,
            ];
        }

        $points = $this->engine()->calculatePoints($account->company, [
            'action' => 'pos_scan',
            'station_id' => $stationId,
        ]);

        return DB::transaction(function () use ($account, $points, $idempotencyKey, $cashier, $stationId) {
            /** @var LoyaltyAccount $locked */
            $locked = LoyaltyAccount::query()->whereKey($account->id)->lockForUpdate()->firstOrFail();
            $newBalance = $locked->points_balance + $points;

            $locked->update(['points_balance' => $newBalance]);

            LoyaltyLedgerEntry::query()->create([
                'loyalty_account_id' => $locked->id,
                'type' => 'earn',
                'delta_points' => $points,
                'balance_after' => $newBalance,
                'source' => 'pos_scan',
                'idempotency_key' => $idempotencyKey,
                'meta' => [
                    'station_id' => $stationId,
                ],
                'created_by' => $cashier->id,
            ]);

            return [
                'success' => true,
                'points_credited' => $points,
                'new_balance' => $newBalance,
                'loyalty_account_id' => $locked->id,
                'replay' => false,
            ];
        });
    }

    /**
     * Remet le compteur de points à zéro (nouveau cycle de fidélité après attribution d'un lot,
     * conformément au cahier des charges). Calcule le delta exact sous verrou pour rester correct
     * en cas de crédit concurrent.
     *
     * @return array{success: true, points_delta: int, new_balance: int}
     */
    public function resetToZero(LoyaltyAccount $account, string $reason, User $actor): array
    {
        return DB::transaction(function () use ($account, $reason, $actor) {
            $locked = LoyaltyAccount::query()->whereKey($account->id)->lockForUpdate()->firstOrFail();
            $delta = -$locked->points_balance;

            $locked->update(['points_balance' => 0]);

            LoyaltyLedgerEntry::query()->create([
                'loyalty_account_id' => $locked->id,
                'type' => 'adjust',
                'delta_points' => $delta,
                'balance_after' => 0,
                'source' => 'reward_cycle_reset',
                'idempotency_key' => null,
                'meta' => ['reason' => $reason],
                'created_by' => $actor->id,
            ]);

            return ['success' => true, 'points_delta' => $delta, 'new_balance' => 0];
        });
    }

    /**
     * @return array{success: true, points_delta: int, new_balance: int}|array{success: false, message: string}
     */
    public function adjust(
        LoyaltyAccount $account,
        int $delta,
        string $reason,
        User $actor,
    ): array {
        return DB::transaction(function () use ($account, $delta, $reason, $actor) {
            $locked = LoyaltyAccount::query()->whereKey($account->id)->lockForUpdate()->firstOrFail();
            $next = $locked->points_balance + $delta;
            if ($next < 0) {
                return ['success' => false, 'message' => 'Solde points insuffisant pour cette opération.'];
            }

            $newBalance = $next;

            $locked->update(['points_balance' => $newBalance]);

            LoyaltyLedgerEntry::query()->create([
                'loyalty_account_id' => $locked->id,
                'type' => $delta >= 0 ? 'adjust' : 'adjust',
                'delta_points' => $delta,
                'balance_after' => $newBalance,
                'source' => 'manual',
                'idempotency_key' => null,
                'meta' => ['reason' => $reason],
                'created_by' => $actor->id,
            ]);

            return [
                'success' => true,
                'points_delta' => $delta,
                'new_balance' => $newBalance,
            ];
        });
    }
}
