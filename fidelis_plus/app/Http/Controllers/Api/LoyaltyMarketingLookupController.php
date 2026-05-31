<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Données de sélection pour le back-office marketing (carte fidélité particulier).
 */
class LoyaltyMarketingLookupController extends Controller
{
    /**
     * Utilisateurs rôle client (recherche par nom / email / téléphone).
     */
    public function clientUsers(Request $request): JsonResponse
    {
        $request->validate([
            'search' => 'nullable|string|max:120',
            'limit' => 'nullable|integer|min:1|max:100',
        ]);

        $limit = min(100, max(1, (int) $request->get('limit', 40)));
        $search = trim((string) $request->get('search', ''));

        $q = User::query()
            ->where('role', 'client')
            ->orderBy('last_name')
            ->orderBy('first_name');

        if ($search !== '') {
            $term = '%'.$search.'%';
            $q->where(function ($w) use ($term) {
                $w->where('email', 'like', $term)
                    ->orWhere('phone', 'like', $term)
                    ->orWhere('first_name', 'like', $term)
                    ->orWhere('last_name', 'like', $term);
            });
        }

        $rows = $q->limit($limit)->get(['id', 'first_name', 'last_name', 'email', 'phone', 'company_id']);

        return response()->json([
            'status' => 'success',
            'data' => $rows,
        ]);
    }

    /**
     * Sociétés clientes (émission carte société).
     */
    public function companies(Request $request): JsonResponse
    {
        $request->validate([
            'search' => 'nullable|string|max:120',
            'limit' => 'nullable|integer|min:1|max:100',
        ]);

        $limit = min(100, max(1, (int) $request->get('limit', 40)));
        $search = trim((string) $request->get('search', ''));

        $q = Company::query()
            ->where('type', 'client')
            ->orderBy('name');

        if ($search !== '') {
            $term = '%'.$search.'%';
            $q->where('name', 'like', $term);
        }

        $rows = $q->limit($limit)->get(['id', 'name', 'company_type', 'category']);

        return response()->json([
            'status' => 'success',
            'data' => $rows,
        ]);
    }

    /**
     * Statistiques de parrainage.
     */
    public function referralStats(Request $request): JsonResponse
    {
        $topReferrers = Company::has('referrals')
            ->withCount('referrals')
            ->orderBy('referrals_count', 'desc')
            ->limit(10)
            ->get(['id', 'name', 'referrals_count']);

        $totalReferrals = Company::whereNotNull('referrer_company_id')->count();

        return response()->json([
            'status' => 'success',
            'data' => [
                'total_referrals' => $totalReferrals,
                'top_referrers' => $topReferrers,
            ],
        ]);
    }
}
