<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Station;
use Illuminate\Http\JsonResponse;

class StationController extends Controller
{
    /**
     * Liste des stations (pour réservation mobile / web).
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => Station::query()->orderBy('name')->get(),
        ]);
    }

    /**
     * Création d'une nouvelle station (Admin).
     */
    public function store(Request $request): JsonResponse
    {
        if (!in_array($request->user()->role, ['admin_commercial', 'admin_marketing', 'super_admin'], true)) {
            abort(403, 'Action réservée aux administrateurs.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'location' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $station = Station::create($validated);

        return response()->json([
            'status' => 'success',
            'data' => $station,
        ], 201);
    }

    /**
     * Mise à jour d'une station (Admin).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        if (!in_array($request->user()->role, ['admin_commercial', 'admin_marketing', 'super_admin'], true)) {
            abort(403, 'Action réservée aux administrateurs.');
        }

        $station = Station::findOrFail($id);

        $validated = $request->validate([
            'name' => 'string|max:255',
            'location' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $station->update($validated);

        return response()->json([
            'status' => 'success',
            'data' => $station,
        ]);
    }

    /**
     * Suppression d'une station (Admin).
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        if (!in_array($request->user()->role, ['admin_commercial', 'admin_marketing', 'super_admin'], true)) {
            abort(403, 'Action réservée aux administrateurs.');
        }

        $station = Station::findOrFail($id);
        $station->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Station supprimée.',
        ]);
    }
}
