<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LoyaltyRedemption;
use App\Models\LoyaltyAccount;
use App\Models\LoyaltyReward;
use App\Services\Loyalty\LoyaltyPointsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

        if (!$reward->is_active) {
            return response()->json(['status' => 'error', 'message' => 'Cette récompense n\'est plus active.'], 400);
        }

        if ($account->points_balance < $reward->points_cost) {
            return response()->json(['status' => 'error', 'message' => 'Solde de points insuffisant.'], 400);
        }

        $user = $request->user();

        // Transaction
        return DB::transaction(function () use ($account, $reward, $user) {
            $service = app(LoyaltyPointsService::class);
            $result = $service->adjust($account, -$reward->points_cost, 'Échange: ' . $reward->name, $user);

            if (!$result['success']) {
                return response()->json($result, 400);
            }

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
        });
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

        $redemption = LoyaltyRedemption::findOrFail($id);
        
        $redemption->update([
            'status' => $request->status,
            'notes' => $request->notes ?? $redemption->notes,
            'handled_by' => $request->user()->id,
        ]);

        return response()->json([
            'status' => 'success',
            'data' => $redemption->fresh(['account.company', 'account.user', 'reward', 'handler'])
        ]);
    }
}
