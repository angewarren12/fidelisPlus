<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LoyaltyRedemption;
use App\Models\LoyaltyAccount;
use App\Models\LoyaltyReward;
use App\Services\Loyalty\LoyaltyPointsService;
use App\Support\UserRoles;
use Illuminate\Http\Request;

class LoyaltyRedemptionController extends Controller
{
    /**
     * Client / Staff attribution d'un lot (déduit le nombre exact de points du lot).
     */
    public function store(Request $request)
    {
        $request->validate([
            'loyalty_account_id' => 'required|exists:loyalty_accounts,id',
            'loyalty_reward_id' => 'required|exists:loyalty_rewards,id',
        ]);

        $account = LoyaltyAccount::findOrFail($request->loyalty_account_id);
        $reward = LoyaltyReward::findOrFail($request->loyalty_reward_id);
        $requester = $request->user();

        if ($requester && $requester->role === 'client') {
            $ownsAccount = ((int) $account->user_id === (int) $requester->id)
                || ($requester->company_id !== null && (int) $account->company_id === (int) $requester->company_id);

            if (!$ownsAccount) {
                return response()->json(['status' => 'error', 'message' => 'Ce compte fidélité ne vous appartient pas.'], 403);
            }
        }

        if (!$reward->is_active) {
            return response()->json(['status' => 'error', 'message' => 'Cette récompense n\'est plus active.'], 400);
        }

        if ($account->points_balance < $reward->points_cost) {
            return response()->json(['status' => 'error', 'message' => "Solde insuffisant ({$account->points_balance} pts disponibles, {$reward->points_cost} pts requis)."], 400);
        }

        // Débit exact des points du lot
        $pointsResult = app(LoyaltyPointsService::class)->adjust(
            $account,
            -$reward->points_cost,
            'Attribution du lot : ' . $reward->name,
            $requester
        );

        if (!($pointsResult['success'] ?? false)) {
            return response()->json([
                'status' => 'error',
                'message' => $pointsResult['message'] ?? 'Échec lors du décompte des points.'
            ], 400);
        }

        $isStaff = $requester && in_array($requester->role, UserRoles::marketing(), true);
        $status = $isStaff ? 'delivered' : 'pending';
        $handledBy = $isStaff ? $requester->id : null;

        $redemption = LoyaltyRedemption::create([
            'loyalty_account_id' => $account->id,
            'loyalty_reward_id' => $reward->id,
            'points_cost' => $reward->points_cost,
            'status' => $status,
            'handled_by' => $handledBy,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => $isStaff
                ? "Lot \"{$reward->name}\" attribué. {$reward->points_cost} points déduits du solde."
                : "Demande du lot \"{$reward->name}\" enregistrée.",
            'data' => $redemption->load(['account', 'reward']),
        ], 201);
    }

    /**
     * Liste des réclamations / livraisons de lots (Admin / Marketing).
     */
    public function index(Request $request)
    {
        $query = LoyaltyRedemption::with(['account.company', 'account.user', 'reward', 'handler']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $redemptions = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json([
            'status' => 'success',
            'data' => $redemptions->items(),
            'meta' => [
                'current_page' => $redemptions->currentPage(),
                'last_page' => $redemptions->lastPage(),
                'total' => $redemptions->total(),
            ]
        ]);
    }

    /**
     * Mise à jour du statut (ex: valider la livraison ou annuler et rembourser les points).
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:pending,delivered,cancelled',
            'notes' => 'nullable|string'
        ]);

        $redemption = LoyaltyRedemption::with('account', 'reward')->findOrFail($id);
        $oldStatus = $redemption->status;
        $newStatus = $request->status;

        $redemption->update([
            'status' => $newStatus,
            'notes' => $request->notes ?? $redemption->notes,
            'handled_by' => $request->user()->id,
        ]);

        // Si la réclamation est annulée par l'admin, on rembourse les points au client
        if ($newStatus === 'cancelled' && $oldStatus !== 'cancelled' && $redemption->account) {
            app(LoyaltyPointsService::class)->adjust(
                $redemption->account,
                +$redemption->points_cost,
                'Remboursement points suite à l\'annulation du lot : ' . ($redemption->reward->name ?? ''),
                $request->user()
            );
        }

        return response()->json([
            'status' => 'success',
            'message' => $newStatus === 'cancelled'
                ? "Demande annulée. {$redemption->points_cost} points recrédités."
                : 'Statut du lot mis à jour.',
            'data' => $redemption->fresh(['account.company', 'account.user', 'reward', 'handler'])
        ]);
    }
}

