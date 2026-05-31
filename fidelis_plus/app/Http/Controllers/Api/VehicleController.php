<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Models\Document;
use App\Http\Resources\VehicleResource;
use App\Traits\ScopesByRole;
use App\Events\VehicleChanged;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;

class VehicleController extends Controller
{
    use ScopesByRole;

    /**
     * Requête flotte avec les mêmes filtres que la liste (hors pagination).
     */
    private function fleetListQuery(Request $request)
    {
        $query = Vehicle::query()
            // Permet d'obtenir la dernière visite sans charger toutes les visites (évite N+1)
            ->withMax('visits', 'visit_date');
        $this->scopeForUser($query);

        if ($request->has('company_id')) {
            $query->where('company_id', $request->company_id);
        }

        if ($request->filled('statuses')) {
            $raw = $request->input('statuses');
            $parts = is_array($raw) ? $raw : preg_split('/\s*,\s*/', (string) $raw, -1, PREG_SPLIT_NO_EMPTY);
            $allowed = ['a_jour', 'en_retard', 'bientot'];
            $statuses = array_values(array_intersect(array_map('strval', $parts), $allowed));
            if ($statuses !== []) {
                $query->whereIn('status', $statuses);
            }
        } elseif ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('fuel_type')) {
            $query->where('fuel_type', $request->fuel_type);
        }

        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('license_plate', 'LIKE', "%{$s}%")
                    ->orWhere('brand', 'LIKE', "%{$s}%")
                    ->orWhere('model', 'LIKE', "%{$s}%")
                    ->orWhereHas('company', function ($c) use ($s) {
                        $c->where('name', 'LIKE', "%{$s}%");
                    });
            });
        }

        return $query;
    }

    /**
     * Totaux flotte (hors pagination) pour les cartes KPI — alignés sur les filtres actifs.
     */
    public function fleetStats(Request $request)
    {
        $query = $this->fleetListQuery($request);

        return response()->json([
            'status' => 'success',
            'data' => [
                'total' => $query->clone()->count(),
                'by_status' => [
                    'a_jour' => $query->clone()->where('status', 'a_jour')->count(),
                    'en_retard' => $query->clone()->where('status', 'en_retard')->count(),
                    'bientot' => $query->clone()->where('status', 'bientot')->count(),
                ],
            ],
        ]);
    }

    /**
     * KPI flotte — format simplifié pour le mobile.
     * Retour: { data: { total, up_to_date, late } }
     */
    public function fleetStatsSimple(Request $request)
    {
        $query = $this->fleetListQuery($request);

        return response()->json([
            'status' => 'success',
            'data' => [
                'total' => $query->clone()->count(),
                'up_to_date' => $query->clone()->where('status', 'a_jour')->count(),
                'late' => $query->clone()->where('status', 'en_retard')->count(),
            ],
        ]);
    }

    /**
     * Liste de la flotte (Tous les véhicules ou filtré par client).
     */
    public function index(Request $request)
    {
        $query = $this->fleetListQuery($request);

        $perPage = (int) $request->get('per_page', $request->get('limit', 15));
        $perPage = min(100, max(1, $perPage));

        $vehicles = $query->with(['company', 'documents'])->orderByDesc('id')->paginate($perPage);

        return VehicleResource::collection($vehicles);
    }

    /**
     * Enregistrement d'un nouveau véhicule (Mobile/Web).
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'company_id' => 'required|exists:companies,id',
            'license_plate' => 'required|string|unique:vehicles,license_plate',
            'brand' => 'required|string',
            'model' => 'required|string',
            'year' => 'nullable|integer',
            'fuel_type' => 'nullable|string',
            'last_visit_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        if ($request->user()->role === 'client'
            && (int) $request->company_id !== (int) $request->user()->company_id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Accès refusé pour ce compte.',
            ], 403);
        }

        if ($request->user()->role === 'commercial') {
            $company = \App\Models\Company::find($request->company_id);
            if (!$company || (int) $company->commercial_id !== (int) $request->user()->id) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Accès refusé. Cette flotte appartient à un client d\'un autre commercial.',
                ], 403);
            }
        }

        $data = $request->all();
        if ($request->filled('last_visit_date')) {
            $data['status'] = 'a_jour';
        }

        $vehicle = Vehicle::create($data);

        // Création automatique de la visite initiale si une date est fournie
        if ($request->filled('last_visit_date')) {
            $vehicle->visits()->create([
                'visit_date' => $request->last_visit_date,
                'notes' => 'Entretien initial enregistré lors de la création du véhicule.',
                'status' => 'complete'
            ]);
        }

        try {
            event(new VehicleChanged(
                vehicleId: (int) $vehicle->id,
                companyId: (int) $vehicle->company_id,
                event: 'created',
            ));
        } catch (\Throwable $e) {
            // Le broadcast temps réel ne doit jamais empêcher la création.
            report($e);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Véhicule enregistré.',
            'data' => $vehicle
        ], 201);
    }

    /**
     * Détail d'un véhicule avec son historique de visites et ses documents.
     */
    public function show($id)
    {
        $query = Vehicle::with(['company', 'visits', 'documents', 'quotes']);
        
        // Sécurité automatique
        $this->scopeForUser($query);
        
        $vehicle = $query->findOrFail($id);

        return new VehicleResource($vehicle);
    }

    /**
     * Mise à jour des informations.
     */
    public function update(Request $request, $id)
    {
        $query = Vehicle::query();
        $this->scopeForUser($query);
        $vehicle = $query->findOrFail($id);
        $vehicle->update($request->all());

        try {
            event(new VehicleChanged(
                vehicleId: (int) $vehicle->id,
                companyId: (int) $vehicle->company_id,
                event: 'updated',
            ));
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Véhicule mis à jour.',
            'data' => $vehicle
        ]);
    }

    /**
     * Suppression d'un véhicule.
     */
    public function destroy($id)
    {
        $query = Vehicle::query();
        $this->scopeForUser($query);
        $vehicle = $query->findOrFail($id);
        $companyId = (int) $vehicle->company_id;
        $vehicleId = (int) $vehicle->id;
        $vehicle->delete();

        try {
            event(new VehicleChanged(
                vehicleId: $vehicleId,
                companyId: $companyId,
                event: 'deleted',
            ));
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Véhicule supprimé.'
        ]);
    }

    /**
     * Upload de documents (Carte grise, Vignette...).
     */
    public function uploadDocs(Request $request, $id)
    {
        $request->validate([
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'name' => 'required|string',
            'type' => 'nullable|string'
        ]);

        $query = Vehicle::query();
        $this->scopeForUser($query);
        $vehicle = $query->findOrFail($id);

        // Si c'est un document unique (carte grise ou vignette), on supprime l'ancien
        if (in_array($request->type, ['carte_grise', 'vignette'])) {
            $existing = $vehicle->documents()->where('type', $request->type)->first();
            if ($existing) {
                // Supprimer le fichier physique (on extrait le nom du fichier du path /storage/...)
                $fileName = str_replace('/storage/', '', $existing->path);
                Storage::disk('public')->delete($fileName);
                $existing->delete();
            }
        }

        // Simulation de stockage public
        $path = $request->file('file')->store('vehicles/documents', 'public');

        $document = $vehicle->documents()->create([
            'name' => $request->name,
            'path' => Storage::url($path),
            'type' => $request->type ?? 'other',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Document uploadé avec succès.',
            'data' => $document
        ]);
    }
    /**
     * Enregistre une visite manuelle pour mettre à jour l'entretien du véhicule.
     */
    public function recordVisit(Request $request, $id)
    {
        $request->validate([
            'date' => 'required|date',
            'notes' => 'nullable|string',
            'vignette_image' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        $query = Vehicle::query();
        $this->scopeForUser($query);
        $vehicle = $query->findOrFail($id);

        $visitDate = Carbon::parse($request->date);

        // Prochaine visite selon type véhicule
        $usage = (string) ($vehicle->usage_type ?? 'personnel');
        $nextCt = $usage === 'transport'
            ? $visitDate->copy()->addMonthsNoOverflow(6)
            : $visitDate->copy()->addMonthsNoOverflow(12);

        $today = Carbon::today();
        $status = 'a_jour';
        if ($nextCt->lt($today)) {
            $status = 'en_retard';
        } elseif ($nextCt->diffInDays($today) <= 14) {
            $status = 'bientot';
        }

        // Mise à jour du véhicule
        $vehicle->update([
            'last_visit_date' => $visitDate->toDateString(),
            'next_ct_date' => $nextCt->toDateString(),
            'status' => $status,
        ]);

        // Création de l'entrée d'historique
        $visit = $vehicle->visits()->create([
            'visit_date' => $visitDate,
            'kind' => 'technical',
            'notes' => $request->notes ?? 'Visite enregistrée manuellement.',
            'status' => 'complete'
        ]);

        // Upload optionnel de la nouvelle vignette (archivée sur la visite + mise à jour "courante" sur le véhicule)
        if ($request->hasFile('vignette_image')) {
            $file = $request->file('vignette_image');
            $path = $file->store('vehicles/documents', 'public');
            $publicUrl = Storage::url($path);

            // Archive sur la visite
            $visit->documents()->create([
                'name' => 'Vignette visite '.$visitDate->toDateString(),
                'path' => $publicUrl,
                'type' => 'vignette',
            ]);

            // Document "courant" sur le véhicule (unique)
            $existing = $vehicle->documents()->where('type', 'vignette')->first();
            if ($existing) {
                $fileName = str_replace('/storage/', '', $existing->path);
                Storage::disk('public')->delete($fileName);
                $existing->delete();
            }

            $vehicle->documents()->create([
                'name' => 'Vignette',
                'path' => $publicUrl,
                'type' => 'vignette',
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Entretien enregistré et statut mis à jour.',
            'data' => new VehicleResource($vehicle->load(['documents', 'visits']))
        ]);
    }
}
