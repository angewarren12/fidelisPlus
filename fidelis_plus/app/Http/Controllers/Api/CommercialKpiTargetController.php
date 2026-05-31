<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CommercialKpiTarget;
use App\Models\Company;
use App\Models\Quote;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CommercialKpiTargetController extends Controller
{
    private function normalizePeriod(Request $request): array
    {
        $periodType = $request->input('period_type');
        $year = (int) $request->input('year', $request->input('period_year'));
        $month = $request->input('month', $request->input('period_month'));
        $quarter = $request->input('quarter', $request->input('period_quarter'));

        if (!in_array($periodType, ['month', 'quarter', 'year'], true)) {
            abort(422, 'period_type invalide.');
        }
        if ($year < 2000 || $year > 2100) {
            abort(422, 'Année invalide.');
        }
        $periodMonth = null;
        $periodQuarter = null;
        if ($periodType === 'month') {
            $m = (int) $month;
            if ($m < 1 || $m > 12) abort(422, 'Mois invalide.');
            $periodMonth = $m;
        } elseif ($periodType === 'quarter') {
            $q = (int) $quarter;
            if ($q < 1 || $q > 4) abort(422, 'Trimestre invalide.');
            $periodQuarter = $q;
        }

        return [$periodType, $year, $periodMonth, $periodQuarter];
    }

    private function periodRange(string $periodType, int $year, ?int $month, ?int $quarter): array
    {
        if ($periodType === 'year') {
            $start = now()->setDate($year, 1, 1)->startOfDay();
            $end = now()->setDate($year, 12, 31)->endOfDay();
            return [$start, $end];
        }
        if ($periodType === 'month') {
            $start = now()->setDate($year, $month ?? 1, 1)->startOfDay();
            $end = (clone $start)->endOfMonth()->endOfDay();
            return [$start, $end];
        }
        // quarter calendar
        $q = $quarter ?? 1;
        $startMonth = ($q - 1) * 3 + 1;
        $start = now()->setDate($year, $startMonth, 1)->startOfDay();
        $end = (clone $start)->addMonths(2)->endOfMonth()->endOfDay();
        return [$start, $end];
    }

    /** Liste (admin) */
    public function index(Request $request)
    {
        $query = CommercialKpiTarget::query()->with('commercial');

        if ($request->filled('commercial_id')) $query->where('commercial_id', (int) $request->commercial_id);
        if ($request->filled('period_type')) $query->where('period_type', $request->period_type);
        if ($request->filled('year')) $query->where('period_year', (int) $request->year);
        if ($request->filled('month')) $query->where('period_month', (int) $request->month);
        if ($request->filled('quarter')) $query->where('period_quarter', (int) $request->quarter);

        return response()->json([
            'status' => 'success',
            'data' => $query->orderByDesc('period_year')->orderByDesc(DB::raw("coalesce(period_quarter, 0)"))->orderByDesc(DB::raw("coalesce(period_month, 0)"))->get(),
        ]);
    }

    /** Créer ou mettre à jour (admin) */
    public function store(Request $request)
    {
        $request->validate([
            'commercial_id' => 'required|exists:users,id',
            'period_type' => 'required|in:month,quarter,year',
            'year' => 'required|integer',
            'month' => 'nullable|integer',
            'quarter' => 'nullable|integer',
            'target_clients' => 'nullable|integer|min:0',
            'target_revenue_signed' => 'nullable|numeric|min:0',
        ]);

        [$periodType, $year, $periodMonth, $periodQuarter] = $this->normalizePeriod($request);

        $payload = [
            'commercial_id' => (int) $request->commercial_id,
            'period_type' => $periodType,
            'period_year' => $year,
            'period_month' => $periodMonth,
            'period_quarter' => $periodQuarter,
            'target_clients' => (int) ($request->input('target_clients', 0)),
            'target_revenue_signed' => (float) ($request->input('target_revenue_signed', 0)),
            'created_by' => $request->user()?->id,
        ];

        $target = CommercialKpiTarget::updateOrCreate(
            [
                'commercial_id' => $payload['commercial_id'],
                'period_type' => $payload['period_type'],
                'period_year' => $payload['period_year'],
                'period_month' => $payload['period_month'],
                'period_quarter' => $payload['period_quarter'],
            ],
            $payload
        );

        return response()->json(['status' => 'success', 'data' => $target->fresh()]);
    }

    /** Modifier (admin) */
    public function update(Request $request, $id)
    {
        $target = CommercialKpiTarget::findOrFail($id);
        $request->validate([
            'target_clients' => 'nullable|integer|min:0',
            'target_revenue_signed' => 'nullable|numeric|min:0',
        ]);
        $target->update([
            'target_clients' => $request->input('target_clients', $target->target_clients),
            'target_revenue_signed' => $request->input('target_revenue_signed', $target->target_revenue_signed),
        ]);
        return response()->json(['status' => 'success', 'data' => $target->fresh()]);
    }

    /** Supprimer (admin) */
    public function destroy($id)
    {
        $target = CommercialKpiTarget::findOrFail($id);
        $target->delete();
        return response()->json(['status' => 'success']);
    }

    /** Progression (admin ou commercial sur lui-même) */
    public function progress(Request $request)
    {
        $request->validate([
            'commercial_id' => 'required|integer|exists:users,id',
            'period_type' => 'required|in:month,quarter,year',
            'year' => 'required|integer',
            'month' => 'nullable|integer',
            'quarter' => 'nullable|integer',
        ]);

        $commercialId = (int) $request->commercial_id;
        $user = $request->user();
        if ($user && $user->role === 'commercial' && (int) $user->id !== $commercialId) {
            return response()->json(['status' => 'error', 'message' => 'Accès refusé.'], 403);
        }

        [$periodType, $year, $periodMonth, $periodQuarter] = $this->normalizePeriod($request);
        [$start, $end] = $this->periodRange($periodType, $year, $periodMonth, $periodQuarter);

        $target = CommercialKpiTarget::where([
            'commercial_id' => $commercialId,
            'period_type' => $periodType,
            'period_year' => $year,
            'period_month' => $periodMonth,
            'period_quarter' => $periodQuarter,
        ])->first();

        // Réalisé clients : conversions prospect->client sur converted_at
        $actualClients = Company::where('commercial_id', $commercialId)
            ->where('type', 'client')
            ->whereNotNull('converted_at')
            ->whereBetween('converted_at', [$start, $end])
            ->count();

        // Réalisé CA signé : devis accepted, on prend updated_at (moment du passage à accepted)
        $actualRevenueSigned = (float) Quote::whereHas('company', function ($q) use ($commercialId) {
            $q->where('commercial_id', $commercialId);
        })
            ->where('status', 'accepted')
            ->whereBetween('updated_at', [$start, $end])
            ->sum('total_amount');

        $tClients = (int) ($target?->target_clients ?? 0);
        $tRevenue = (float) ($target?->target_revenue_signed ?? 0);

        return response()->json([
            'status' => 'success',
            'data' => [
                'period' => [
                    'type' => $periodType,
                    'year' => $year,
                    'month' => $periodMonth,
                    'quarter' => $periodQuarter,
                    'start' => $start->toIso8601String(),
                    'end' => $end->toIso8601String(),
                ],
                'target' => $target,
                'actuals' => [
                    'clients' => $actualClients,
                    'revenue_signed' => $actualRevenueSigned,
                ],
                'progress' => [
                    'clients_pct' => $tClients > 0 ? round(min(100, ($actualClients / $tClients) * 100), 2) : null,
                    'revenue_signed_pct' => $tRevenue > 0 ? round(min(100, ($actualRevenueSigned / $tRevenue) * 100), 2) : null,
                ],
            ],
        ]);
    }
}

