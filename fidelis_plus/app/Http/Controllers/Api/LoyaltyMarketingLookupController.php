<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\LoyaltyAccount;
use App\Models\LoyaltyCardBatch;
use App\Models\LoyaltyMember;
use App\Models\LoyaltyPosScanEvent;
use App\Models\LoyaltyRedemption;
use App\Models\LoyaltyReward;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

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

        $rows = $q->limit($limit)->get(['id', 'name', 'phone', 'company_type', 'category', 'created_via_marketing']);

        return response()->json([
            'status' => 'success',
            'data' => $rows,
        ]);
    }

    /**
     * Crée une nouvelle société cliente directement depuis le flux fidélité
     * (visible ensuite dans le CRM commercial, type=client, marquée created_via_marketing).
     */
    public function createCompany(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:30',
        ]);

        $company = Company::create([
            'name' => $request->input('name'),
            'phone' => $request->input('phone'),
            'category' => 'entreprise',
            'type' => 'client',
            'is_active' => true,
            'created_via_marketing' => true,
        ]);

        return response()->json([
            'status' => 'success',
            'data' => $company->only(['id', 'name', 'phone', 'company_type', 'category', 'created_via_marketing']),
        ]);
    }

    /**
     * Crée un nouveau client particulier (rôle "client") depuis le flux fidélité.
     */
    public function createClientUser(Request $request): JsonResponse
    {
        $request->validate([
            'first_name' => 'required|string|max:80',
            'last_name' => 'required|string|max:80',
            'phone' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:160|unique:users,email',
        ]);

        $providedEmail = $request->input('email');
        $email = $providedEmail ?: 'loyalty-'.Str::random(10).'@mayelia.local';
        $plainPassword = Str::random(16);

        $user = User::create([
            'role' => 'client',
            'first_name' => $request->input('first_name'),
            'last_name' => $request->input('last_name'),
            'phone' => $request->input('phone'),
            'email' => $email,
            'password' => Hash::make($plainPassword),
            'must_change_password' => true,
        ]);

        if ($providedEmail) {
            try {
                \Illuminate\Support\Facades\Mail::to($user->email)->send(
                    new \App\Mail\ClientAccountCreated($user, $plainPassword)
                );
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Erreur envoi mail client fidélité: ' . $e->getMessage());
            }
        }

        return response()->json([
            'status' => 'success',
            'data' => $user->only(['id', 'first_name', 'last_name', 'email', 'phone']),
        ]);
    }

    /**
     * Vue d'ensemble marketing (dashboard) : un seul appel qui agrège les compteurs déjà
     * disponibles séparément (comptes, scans, demandes en attente, stock de cartes) — sur
     * le même principe que StatsController::getDashboardStats côté commercial.
     */
    public function dashboardStats(Request $request): JsonResponse
    {
        $weekStart = now()->subDays(6)->startOfDay();

        // Segmentation particulier/entreprise par la vraie logique métier (holder_type / type de
        // membre) plutôt que le préfixe du numéro de carte — les comptes créés avant l'introduction
        // du format ENT-/FID- n'ont pas ce préfixe et seraient sinon ignorés du décompte.
        $accountsQuery = LoyaltyAccount::query()->where('holder_type', '!=', 'unassigned');
        $accountsTotal = (clone $accountsQuery)->count();
        $accountsEntreprise = (clone $accountsQuery)->where('holder_type', 'company')->count()
            + (clone $accountsQuery)->where('holder_type', 'member')
                ->whereHas('member', fn ($q) => $q->where('type', 'entreprise'))
                ->count();
        $accountsParticulier = $accountsTotal - $accountsEntreprise;
        $pointsInCirculation = (int) (clone $accountsQuery)->sum('points_balance');

        $weekScansQuery = LoyaltyPosScanEvent::query()->where('loyalty_pos_scan_events.created_at', '>=', $weekStart);
        $weekScansCount = (clone $weekScansQuery)->count();
        $weekPointsCredited = (int) (clone $weekScansQuery)->sum('points_credited');

        $dayExpr = DB::getDriverName() === 'sqlite'
            ? "strftime('%Y-%m-%d', loyalty_pos_scan_events.created_at)"
            : 'DATE(loyalty_pos_scan_events.created_at)';
        $byDay = (clone $weekScansQuery)
            ->selectRaw("{$dayExpr} as day, COUNT(*) as scans_count")
            ->groupBy(DB::raw($dayExpr))
            ->orderBy('day')
            ->get();

        $topStations = (clone $weekScansQuery)
            ->join('stations', 'stations.id', '=', 'loyalty_pos_scan_events.station_id')
            ->selectRaw('stations.name as station_name, COUNT(*) as scans_count')
            ->groupBy('stations.id', 'stations.name')
            ->orderByDesc('scans_count')
            ->limit(3)
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'accounts' => [
                    'total' => $accountsTotal,
                    'particulier' => $accountsParticulier,
                    'entreprise' => $accountsEntreprise,
                ],
                'points_in_circulation' => $pointsInCirculation,
                'week' => [
                    'scans_count' => $weekScansCount,
                    'points_credited' => $weekPointsCredited,
                    'by_day' => $byDay,
                ],
                'top_stations' => $topStations,
                'pending' => [
                    'member_requests' => LoyaltyMember::query()->where('status', 'pending')->count(),
                    'redemptions' => LoyaltyRedemption::query()->where('status', 'pending')->count(),
                    'sira_failed' => LoyaltyMember::query()->where('sira_provisioning_status', 'failed')->count(),
                ],
                'card_stock' => [
                    'blank_available' => LoyaltyAccount::query()->where('holder_type', 'unassigned')->count(),
                    'batches_to_print' => LoyaltyCardBatch::query()->where('status', 'generated')->count(),
                ],
                'active_rewards' => LoyaltyReward::query()->where('is_active', true)->count(),
            ],
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
