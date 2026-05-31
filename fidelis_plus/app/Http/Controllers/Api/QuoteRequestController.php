<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\QuoteRequest;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

use App\Traits\ScopesByRole;

class QuoteRequestController extends Controller
{
    use ScopesByRole;

    /**
     * Liste des demandes de devis (Vue Commercial/Admin).
     */
    public function index(Request $request)
    {
        $query = QuoteRequest::with(['user', 'company', 'vehicle']);
        
        $this->scopeForUser($query);

        return response()->json([
            'status' => 'success',
            'data' => $query->latest()->paginate(15)
        ]);
    }

    /**
     * Soumission d'une nouvelle demande de devis (Mobile/Client).
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'vehicle_id' => 'required|exists:vehicles,id',
            // Mobile peut envoyer une demande sans pièces jointes.
            'registration_image' => 'nullable|image|mimes:jpeg,png,jpg|max:5120',
            'vignette_image' => 'nullable|image|mimes:jpeg,png,jpg|max:5120',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $user = $request->user();
        $vehicle = Vehicle::findOrFail($request->vehicle_id);

        // Sécurité : Vérifier que le véhicule appartient à l'entreprise de l'utilisateur
        if ($vehicle->company_id !== $user->company_id && $user->role !== 'admin') {
            return response()->json([
                'status' => 'error',
                'message' => 'Ce véhicule ne vous appartient pas.'
            ], 403);
        }

        // Stockage optionnel des images
        $regPath = $request->hasFile('registration_image')
            ? $request->file('registration_image')->store('quote_requests', 'public')
            : null;
        $vigPath = $request->hasFile('vignette_image')
            ? $request->file('vignette_image')->store('quote_requests', 'public')
            : null;

        $quoteRequest = QuoteRequest::create([
            'user_id' => $user->id,
            'company_id' => $user->company_id,
            'vehicle_id' => $vehicle->id,
            'registration_image' => $regPath,
            'vignette_image' => $vigPath,
            'status' => 'pending',
            'notes' => $request->notes,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Demande de devis envoyée avec succès.',
            'data' => $quoteRequest
        ], 201);
    }

    /**
     * Détail d'une demande.
     */
    public function show($id)
    {
        $quoteRequest = QuoteRequest::with(['user', 'company', 'vehicle'])->findOrFail($id);

        $user = request()->user();
        if ($user) {
            if ($user->role === 'client' && (int) $quoteRequest->company_id !== (int) $user->company_id) {
                return response()->json(['status' => 'error', 'message' => 'Accès refusé.'], 403);
            }
            if ($user->role === 'commercial' && (int) $quoteRequest->company->commercial_id !== (int) $user->id) {
                return response()->json(['status' => 'error', 'message' => 'Accès refusé : Cette demande appartient à un client d\'un autre commercial.'], 403);
            }
        }

        // Transformation des chemins en URLs complètes (si pièces jointes présentes)
        $quoteRequest->registration_image_url = $quoteRequest->registration_image
            ? asset('storage/' . $quoteRequest->registration_image)
            : null;
        $quoteRequest->vignette_image_url = $quoteRequest->vignette_image
            ? asset('storage/' . $quoteRequest->vignette_image)
            : null;

        return response()->json([
            'status' => 'success',
            'data' => $quoteRequest
        ]);
    }

    /**
     * Mise à jour du statut par un commercial.
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate(['status' => 'required|in:pending,processed,rejected']);

        $quoteRequest = QuoteRequest::with('company')->findOrFail($id);

        $user = $request->user();
        if ($user && $user->role === 'commercial' && (int) $quoteRequest->company->commercial_id !== (int) $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Modification refusée.'], 403);
        }

        $quoteRequest->update(['status' => $request->status]);

        return response()->json([
            'status' => 'success',
            'message' => 'Statut de la demande mis à jour.',
            'data' => $quoteRequest
        ]);
    }
}
