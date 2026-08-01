<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Quote;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Http\Resources\AppointmentResource;

class StatsController extends Controller
{
    /**
     * Calcule les indicateurs clés pour le Dashboard Commercial.
     */
    public function getDashboardStats(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Non authentifié.',
            ], 401);
        }
        $isClient = $user->role === 'client';
        $companyId = $user->company_id;

        // Filtrage par commercial : uniquement le connecté (commercial) ou paramètre explicite (admin).
        $filterCommercialId = null;
        if ($user->role === 'commercial') {
            $filterCommercialId = (int) $user->id;
        } elseif ($user->role === 'admin' && $request->filled('commercial_id')) {
            $filterCommercialId = (int) $request->input('commercial_id');
        }

        // 1. Chiffre d'Affaires / Devis
        $quotesQuery = Quote::query();
        if ($isClient) {
            $quotesQuery->where('company_id', $companyId);
        } elseif ($filterCommercialId !== null) {
            $quotesQuery->whereHas('company', function ($q) use ($filterCommercialId) {
                $q->where('commercial_id', $filterCommercialId);
            });
        }
        
        $totalRevenue = (clone $quotesQuery)->where('status', 'accepted')->sum('total_amount');
        $pipelineValue = (clone $quotesQuery)->whereIn('status', ['sent', 'draft'])->sum('total_amount');
        $newQuotesCount = (clone $quotesQuery)->where('status', 'sent')->count();

        // 3. Comptes (Clients vs Prospects)
        $companyQuery = Company::query();
        if ($filterCommercialId !== null) {
            $companyQuery->where('commercial_id', $filterCommercialId);
        }
        
        $prospectsCount = (clone $companyQuery)->where('type', 'prospect')->count();
        $clientsCount = (clone $companyQuery)->where('type', 'client')->count();
        
        $totalAcquired = $prospectsCount + $clientsCount;
        $conversionRate = $totalAcquired > 0 ? ($clientsCount / $totalAcquired) * 100 : 0;

        // 4. État de la flotte globale
        $fleetQuery = Vehicle::query();
        if ($isClient) {
            $fleetQuery->where('company_id', $companyId);
        } elseif ($filterCommercialId !== null) {
            $fleetQuery->whereHas('company', function ($q) use ($filterCommercialId) {
                $q->where('commercial_id', $filterCommercialId);
            });
        }

        $fleetStats = (clone $fleetQuery)->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        $overdueCount = (clone $fleetQuery)->where('status', 'en_retard')->count();

        // 5. Rendez-vous du jour
        $appointmentsQuery = \App\Models\Appointment::with(['company', 'vehicles', 'station'])
            ->whereDate('appointment_date', today());
            
        if ($isClient) {
            $appointmentsQuery->where('company_id', $companyId);
        } elseif ($filterCommercialId !== null) {
            $appointmentsQuery->whereHas('company', function ($q) use ($filterCommercialId) {
                $q->where('commercial_id', $filterCommercialId);
            });
        }

        $todayAppointments = $appointmentsQuery->orderBy('appointment_date', 'asc')->get();

        $quoteRequestsQuery = \App\Models\QuoteRequest::where('status', 'pending');
        if ($isClient) {
            $quoteRequestsQuery->where('company_id', $companyId);
        } elseif ($filterCommercialId !== null) {
            $quoteRequestsQuery->whereHas('company', function ($q) use ($filterCommercialId) {
                $q->where('commercial_id', $filterCommercialId);
            });
        }

        // Véhicules récents pour le carousel mobile
        $recentVehiclesQuery = Vehicle::query();
        if ($isClient) {
            $recentVehiclesQuery->where('company_id', $companyId);
        } elseif ($filterCommercialId !== null) {
            $recentVehiclesQuery->whereHas('company', function ($q) use ($filterCommercialId) {
                $q->where('commercial_id', $filterCommercialId);
            });
        }
        $recentVehicles = $recentVehiclesQuery->orderBy('created_at', 'desc')->take(10)->get();
        
        // Devis récents
        $recentQuotes = (clone $quotesQuery)->orderBy('created_at', 'desc')->take(5)->get();

        // Volume d'inspections sur la semaine en cours (Lundi à Dimanche)
        $visitsQuery = \App\Models\Visit::query();
        if ($isClient) {
            $visitsQuery->whereHas('vehicle', function ($q) use ($companyId) {
                $q->where('company_id', $companyId);
            });
        } elseif ($filterCommercialId !== null) {
            $visitsQuery->whereHas('vehicle.company', function ($q) use ($filterCommercialId) {
                $q->where('commercial_id', $filterCommercialId);
            });
        }

        $startOfWeek = now()->startOfWeek();
        $weeklyInspections = [];
        for ($i = 0; $i < 7; $i++) {
            $day = (clone $startOfWeek)->addDays($i);
            $weeklyInspections[] = (clone $visitsQuery)
                ->whereDate('visit_date', $day->toDateString())
                ->count();
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'user' => [
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'company' => [
                        'name' => $user->company ? $user->company->name : 'N/A'
                    ]
                ],
                'revenue' => [
                    'total_accepted' => (float) $totalRevenue,
                    'new_quotes_count' => $newQuotesCount
                ],
                'crm' => [
                    'total_prospects' => $prospectsCount,
                    'total_clients' => $clientsCount,
                    'conversion_rate' => round($conversionRate, 2),
                ],
                'fleet' => [
                    'a_jour' => $fleetStats['a_jour'] ?? 0,
                    'bientot' => $fleetStats['bientot'] ?? 0,
                    'en_retard' => $overdueCount,
                ],
                'agenda' => AppointmentResource::collection($todayAppointments),
                'alerts' => [
                    'overdue_vehicles' => $overdueCount,
                    'pending_quotes' => $newQuotesCount,
                    'pending_requests' => $quoteRequestsQuery->count()
                ],
                'recent_vehicles' => \App\Http\Resources\VehicleResource::collection($recentVehicles),
                'recent_quotes' => $recentQuotes,
                'inspections_weekly' => $weeklyInspections,
            ]
        ]);
    }
}
