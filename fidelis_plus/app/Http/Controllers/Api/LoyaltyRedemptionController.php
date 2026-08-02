<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LoyaltyRedemption;
use App\Models\LoyaltyAccount;
use App\Models\LoyaltyReward;
use App\Services\Loyalty\LoyaltyPointsService;
use Illuminate\Http\Request;

class LoyaltyRedemptionController extends Controller
{
    /**
     * Client/Admin claim a reward.
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
            return response()->json(['status' => 'error', 'message' => 'Solde de points insuffisant.'], 400);
        }

        // On ne débite rien à la réclamation : le compteur n'est remis à zéro qu'à la
        // livraison effective du lot (cf. update()), conformément au cahier des charges
        // ("après l'attribution du lot, le compteur est remis à zéro").
        $redemption = LoyaltyRedemption::create([
            'loyalty_account_id' => $account->id,
            'loyalty_reward_id' => $reward->id,
            'points_cost' => $reward->points_cost,
            'status' => 'pending',
            'handled_by' => null,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Récompense réclamée avec succès.',
            'data' => $redemption->load(['account', 'reward']),
        ]);
    }

    /**
     * Admin/Marketing list redemptions.
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
     * Update status (e.g., mark as delivered).
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:pending,delivered,cancelled',
            'notes' => 'nullable|string'
        ]);

        $redemption = LoyaltyRedemption::with('account', 'reward')->findOrFail($id);
        $wasDelivered = $redemption->status === 'delivered';

        $redemption->update([
            'status' => $request->status,
            'notes' => $request->notes ?? $redemption->notes,
            'handled_by' => $request->user()->id,
        ]);

        // Nouveau cycle de fidélité : le compteur de points repart à zéro dès que le lot
        // est effectivement livré (une seule fois, pas à chaque re-sauvegarde du statut).
        if ($request->status === 'delivered' && ! $wasDelivered && $redemption->account) {
            app(LoyaltyPointsService::class)->resetToZero(
                $redemption->account,
                'Nouveau cycle après attribution du lot : ' . ($redemption->reward->name ?? ''),
                $request->user(),
            );
        }

        return response()->json([
            'status' => 'success',
            'data' => $redemption->fresh(['account.company', 'account.user', 'reward', 'handler'])
        ]);
    }
}
