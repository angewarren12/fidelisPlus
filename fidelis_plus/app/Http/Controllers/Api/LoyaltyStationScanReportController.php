<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LoyaltyPosScanEvent;
use App\Services\Loyalty\LoyaltyCommercialVisibility;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LoyaltyStationScanReportController extends Controller
{
    /**
     * Rapports passages en station (scans fidélité POS).
     *
     * Query :
     * - `date` = un jour civil (YYYY-MM-DD), ou
     * - `from` et `to` = plage inclusive (jours civils)
     *
     * Filtre optionnel : `station_id`
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'date' => 'nullable|date_format:Y-m-d',
            'from' => 'nullable|date_format:Y-m-d',
            'to' => 'nullable|date_format:Y-m-d',
            'station_id' => 'nullable|integer|exists:stations,id',
        ]);

        $tz = (string) config('app.timezone', 'UTC');

        $t = (new LoyaltyPosScanEvent)->getTable();

        $filter = function ($q) use ($request, $tz, $t) {
            if ($request->filled('date')) {
                $d = $request->string('date')->toString();
                $start = Carbon::parse($d, $tz)->startOfDay();
                $end = Carbon::parse($d, $tz)->endOfDay();
                $q->whereBetween("{$t}.created_at", [$start, $end]);

                return [$start, $end];
            }

            if (! $request->filled('from') || ! $request->filled('to')) {
                return null;
            }

            $fromStr = $request->string('from')->toString();
            $toStr = $request->string('to')->toString();

            $start = Carbon::parse($fromStr, $tz)->startOfDay();
            $end = Carbon::parse($toStr, $tz)->endOfDay();
            $q->whereBetween("{$t}.created_at", [$start, $end]);

            return [$start, $end];
        };

        $base = LoyaltyPosScanEvent::query();
        LoyaltyCommercialVisibility::scopePosScanEvents($base, $request->user(), $t);
        $periodEnds = $filter($base);
        if ($periodEnds === null) {
            return response()->json([
                'status' => 'error',
                'message' => 'Indiquez soit le paramètre date (un jour), soit from et to (plage).',
            ], 422);
        }

        [$from, $to] = $periodEnds;

        if ($from->gt($to)) {
            return response()->json([
                'status' => 'error',
                'message' => 'La date de début doit être antérieure ou égale à la date de fin.',
            ], 422);
        }

        $stationFilter = $request->filled('station_id') ? (int) $request->station_id : null;
        if ($stationFilter !== null) {
            $base->where("{$t}.station_id", $stationFilter);
        }

        $totalsRow = (clone $base)
            ->selectRaw('COUNT(*) as scans_count, COALESCE(SUM('.$t.'.points_credited), 0) as points_credited')
            ->first();

        $byStation = (clone $base)
            ->join('stations', 'stations.id', '=', $t.'.station_id')
            ->selectRaw('stations.id as station_id, stations.name as station_name, COUNT(*) as scans_count, COALESCE(SUM('.$t.'.points_credited), 0) as points_credited')
            ->groupBy('stations.id', 'stations.name')
            ->orderBy('stations.name')
            ->get();

        $dayExpr = $this->dayExpressionSql($t.'.created_at');

        $byDay = (clone $base)
            ->selectRaw("{$dayExpr} as day, COUNT(*) as scans_count, COALESCE(SUM(".$t.'.points_credited), 0) as points_credited')
            ->groupBy(DB::raw($dayExpr))
            ->orderBy('day')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'period' => [
                    'from' => $from->toIso8601String(),
                    'to' => $to->toIso8601String(),
                    'timezone' => $tz,
                ],
                'totals' => [
                    'scans_count' => (int) ($totalsRow->scans_count ?? 0),
                    'points_credited' => (int) ($totalsRow->points_credited ?? 0),
                ],
                'by_station' => $byStation,
                'by_day' => $byDay,
            ],
        ]);
    }

    /**
     * Export des scans au format CSV.
     */
    public function export(Request $request)
    {
        $request->validate([
            'date' => 'nullable|date_format:Y-m-d',
            'from' => 'nullable|date_format:Y-m-d',
            'to' => 'nullable|date_format:Y-m-d',
            'station_id' => 'nullable|integer|exists:stations,id',
        ]);

        $tz = (string) config('app.timezone', 'UTC');
        $t = (new LoyaltyPosScanEvent)->getTable();

        $query = LoyaltyPosScanEvent::query()
            ->with(['company', 'user', 'station']);

        LoyaltyCommercialVisibility::scopePosScanEvents($query, $request->user(), $t);

        if ($request->filled('date')) {
            $d = $request->string('date')->toString();
            $query->whereBetween("{$t}.created_at", [
                Carbon::parse($d, $tz)->startOfDay(),
                Carbon::parse($d, $tz)->endOfDay()
            ]);
        } elseif ($request->filled('from') && $request->filled('to')) {
            $query->whereBetween("{$t}.created_at", [
                Carbon::parse($request->from, $tz)->startOfDay(),
                Carbon::parse($request->to, $tz)->endOfDay()
            ]);
        }

        if ($request->filled('station_id')) {
            $query->where("{$t}.station_id", $request->station_id);
        }

        $scans = $query->orderBy("{$t}.created_at", 'desc')->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="export_fidelite_'.now()->format('Y-m-d').'.csv"',
        ];

        $callback = function() use ($scans) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['ID', 'Date', 'Station', 'Entreprise', 'Contact', 'Points Crédités', 'Référence']);

            foreach ($scans as $scan) {
                fputcsv($file, [
                    $scan->id,
                    $scan->created_at->format('Y-m-d H:i:s'),
                    $scan->station?->name ?? 'N/A',
                    $scan->company?->name ?? 'N/A',
                    $scan->user ? ($scan->user->first_name . ' ' . $scan->user->last_name) : 'N/A',
                    $scan->points_credited,
                    $scan->reference ?? '',
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    private function dayExpressionSql(string $column): string
    {
        return match (DB::getDriverName()) {
            'sqlite' => "strftime('%Y-%m-%d', {$column})",
            default => "DATE({$column})",
        };
    }
}
