<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tariff;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PricingController extends Controller
{
    /**
     * Liste des tarifs, optionnellement filtrés par type.
     * GET /api/v1/tariffs?type=vignette
     */
    public function index(Request $request)
    {
        $query = Tariff::query();

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        $tariffs = $query->orderBy('type')->orderBy('name')->get();

        // Regrouper par type pour faciliter la lecture côté frontend
        $grouped = $tariffs->groupBy('type')->map(function ($group) {
            return $group->values();
        });

        return response()->json([
            'status' => 'success',
            'data'   => $grouped,
        ]);
    }

    /**
     * Détail d'un tarif.
     * GET /api/v1/tariffs/{id}
     */
    public function show($id)
    {
        $tariff = Tariff::findOrFail($id);
        return response()->json(['status' => 'success', 'data' => $tariff]);
    }

    /**
     * Créer un nouveau tarif.
     * POST /api/v1/tariffs
     */
    public function store(Request $request)
    {
        $request->validate([
            'type'   => 'required|in:visite_technique,vignette',
            'code'   => 'required|string|unique:tariffs,code',
            'name'   => 'required|string|max:100',
            'prices' => 'required|array',
            'prices.*' => 'nullable|numeric|min:0',
        ]);

        $tariff = Tariff::create($request->only('type', 'code', 'name', 'prices'));

        return response()->json([
            'status'  => 'success',
            'message' => 'Tarif créé avec succès.',
            'data'    => $tariff,
        ], 201);
    }

    /**
     * Mettre à jour un tarif (nom et/ou prix).
     * PUT /api/v1/tariffs/{id}
     */
    public function update(Request $request, $id)
    {
        $tariff = Tariff::findOrFail($id);

        $request->validate([
            'name'   => 'sometimes|required|string|max:100',
            'prices' => 'sometimes|required|array',
            'prices.*' => 'nullable|numeric|min:0',
            'code'   => ['sometimes', 'required', 'string', Rule::unique('tariffs', 'code')->ignore($tariff->id)],
        ]);

        $tariff->update($request->only('name', 'code', 'prices'));

        return response()->json([
            'status'  => 'success',
            'message' => 'Tarif mis à jour.',
            'data'    => $tariff->fresh(),
        ]);
    }

    /**
     * Supprimer un tarif.
     * DELETE /api/v1/tariffs/{id}
     */
    public function destroy($id)
    {
        $tariff = Tariff::findOrFail($id);
        $tariff->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Tarif supprimé.',
        ]);
    }
}
