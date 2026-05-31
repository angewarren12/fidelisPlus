<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LoyaltyPosScanEvent;
use App\Services\Loyalty\LoyaltyCommercialVisibility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LoyaltyActivityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $limit = min(100, max(1, (int) $request->get('limit', 20)));

        $query = LoyaltyPosScanEvent::query()
            ->with(['loyaltyAccount.company', 'loyaltyAccount.user', 'station', 'cashier']);

        if ($request->user()?->role === 'commercial') {
            $query->whereHas('loyaltyAccount', function ($q) use ($request) {
                LoyaltyCommercialVisibility::scopeLoyaltyAccounts($q, $request->user());
            });
        }

        $scans = $query
            ->latest()
            ->limit($limit)
            ->get()
            ->map(function ($s) {
                return [
                    'type' => 'scan',
                    'id' => $s->id,
                    'title' => 'Scan Carte',
                    'description' => 'Scan effectué à la station ' . ($s->station->name ?? '#'.$s->station_id),
                    'points' => $s->points_credited,
                    'holder_name' => $s->loyaltyAccount->holder_name ?? 'Client',
                    'caissier' => $s->cashier ? ($s->cashier->first_name . ' ' . $s->cashier->last_name) : 'Auto',
                    'created_at' => $s->created_at,
                ];
            });

        // On pourrait aussi ajouter les ajustements manuels ici si on avait une table dédiée ou si on filtrait les logs
        
        return response()->json([
            'status' => 'success',
            'data' => $scans,
        ]);
    }
}
