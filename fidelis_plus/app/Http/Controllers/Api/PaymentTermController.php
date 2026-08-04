<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentTerm;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Conditions de paiement des devis (table de référence) — lecture ouverte à toute personne
 * pouvant créer/consulter un devis, écriture réservée aux admins du service commercial.
 */
class PaymentTermController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = PaymentTerm::query()->orderBy('sort_order')->orderBy('label');

        if (! $request->boolean('all')) {
            $query->where('is_active', true);
        }

        return response()->json([
            'status' => 'success',
            'data' => $query->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'label' => 'required|string|max:255',
            'description' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        $term = PaymentTerm::create([
            'label' => $data['label'],
            'description' => $data['description'] ?? null,
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
        ]);

        return response()->json(['status' => 'success', 'data' => $term], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $this->authorizeAdmin($request);

        $term = PaymentTerm::query()->findOrFail($id);

        $data = $request->validate([
            'label' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        $term->update($data);

        return response()->json(['status' => 'success', 'data' => $term->fresh()]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->authorizeAdmin($request);

        $term = PaymentTerm::query()->findOrFail($id);

        if ($term->quotes()->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Impossible de supprimer : cette condition de paiement est utilisée par des devis existants. Désactivez-la plutôt.',
            ], 422);
        }

        $term->delete();

        return response()->json(['status' => 'success', 'message' => 'Condition de paiement supprimée.']);
    }

    private function authorizeAdmin(Request $request): void
    {
        if (! in_array($request->user()?->role, ['admin_commercial', 'super_admin'], true)) {
            abort(403, 'Action réservée aux administrateurs du service commercial.');
        }
    }
}
