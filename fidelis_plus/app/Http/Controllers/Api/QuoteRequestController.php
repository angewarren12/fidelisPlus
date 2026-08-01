<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\QuoteRequest;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

use App\Traits\ScopesByRole;
use App\Services\NotificationService;

class QuoteRequestController extends Controller
{
    use ScopesByRole;

    public function __construct(private readonly NotificationService $notifs)
    {
    }

    /**
     * Liste des demandes de devis (Vue Commercial/Admin).
     */
    public function index(Request $request)
    {
        $query = QuoteRequest::with(['user', 'company', 'vehicles']);

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
            'vehicle_ids' => 'required|array',
            'vehicle_ids.*' => 'exists:vehicles,id',
            // Mobile peut envoyer une demande sans pièces jointes.
            'registration_image' => 'nullable|image|mimes:jpeg,png,jpg|max:5120',
            'vignette_image' => 'nullable|image|mimes:jpeg,png,jpg|max:5120',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $user = $request->user();
        
        $vehicles = Vehicle::whereIn('id', $request->vehicle_ids)->get();

        // Sécurité : Vérifier que les véhicules appartiennent à l'entreprise de l'utilisateur
        foreach ($vehicles as $vehicle) {
            if ($vehicle->company_id !== $user->company_id && $user->role !== 'admin') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Le véhicule avec l\'ID ' . $vehicle->id . ' ne vous appartient pas.'
                ], 403);
            }
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
            'vehicle_id' => $vehicles->first()->id, // Keep the first one to avoid null constraint issue
            'registration_image' => $regPath,
            'vignette_image' => $vigPath,
            'status' => 'pending',
            'notes' => $request->notes,
        ]);

        $quoteRequest->vehicles()->attach($request->vehicle_ids);

        // Recharger avec la relation pour le retour
        $quoteRequest->load('vehicles');

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
        $quoteRequest = QuoteRequest::with(['user', 'company', 'vehicles'])->findOrFail($id);

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

        $oldStatus = $quoteRequest->status;
        $quoteRequest->update(['status' => $request->status]);

        if ($request->status === 'rejected' && $oldStatus !== 'rejected') {
            $contact = $quoteRequest->company?->contacts()->first()
                ?? \App\Models\User::where('company_id', $quoteRequest->company_id)->first();

            if ($contact) {
                // S'il y a plusieurs véhicules, on affiche le nombre ou on join
                $vehicleLabels = $quoteRequest->vehicles->pluck('license_plate')->implode(', ');
                $vehicleLabel = $vehicleLabels ?: 'inconnu';
                $this->notifs->notifyUser(
                    $contact,
                    'Demande de devis refusée',
                    "Votre demande de devis pour le véhicule {$vehicleLabel} a été refusée.",
                    type: 'quote_request_rejected',
                    data: ['quote_request_id' => $quoteRequest->id],
                    action: 'quote_request_list',
                    channel: 'in_app'
                );
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Statut de la demande mis à jour.',
            'data' => $quoteRequest
        ]);
    }
}
