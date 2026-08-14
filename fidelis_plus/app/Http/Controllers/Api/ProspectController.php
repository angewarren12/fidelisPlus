<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\User;
use App\Traits\ScopesByRole;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ProspectController extends Controller
{
    use ScopesByRole;
    /**
     * Liste des secteurs d'activité existants (distincts)
     */
    public function getSectors()
    {
        $sectors = Company::whereNotNull('sector')
            ->distinct()
            ->pluck('sector')
            ->sort()
            ->values();

        return response()->json([
            'status' => 'success',
            'data' => $sectors
        ]);
    }

    /**
     * Liste des sources de leads existantes (distinctes)
     */
    public function getLeadSources()
    {
        $sources = Company::whereNotNull('lead_source')
            ->distinct()
            ->pluck('lead_source')
            ->sort()
            ->values();

        return response()->json([
            'status' => 'success',
            'data' => $sources
        ]);
    }

    /**
     * Liste des prospects (filtrés par commercial si nécessaire)
     */
    public function index(Request $request)
    {
        $query = Company::where('type', 'prospect');
        $this->scopeForUser($query);

        if (in_array($request->user()->role, ['admin_commercial', 'super_admin'], true) && $request->filled('commercial_id')) {
            $query->where('commercial_id', $request->commercial_id);
        }

        if ($request->filled('temperature')) {
            $query->where('temperature', $request->temperature);
        }

        if ($request->filled('sector')) {
            $query->where('sector', $request->sector);
        }

        if ($request->filled('lead_source')) {
            $query->where('lead_source', $request->lead_source);
        }

        if ($request->filled('company_type')) {
            $query->where('company_type', $request->company_type);
        }

        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('name', 'LIKE', "%{$s}%")
                    ->orWhere('sector', 'LIKE', "%{$s}%")
                    ->orWhere('lead_source', 'LIKE', "%{$s}%")
                    ->orWhereHas('contacts', function ($c) use ($s) {
                        $c->where('first_name', 'LIKE', "%{$s}%")
                            ->orWhere('last_name', 'LIKE', "%{$s}%")
                            ->orWhere('phone', 'LIKE', "%{$s}%")
                            ->orWhere('email', 'LIKE', "%{$s}%");
                    });
            });
        }

        $perPage = min(100, max(1, (int) $request->get('per_page', 15)));

        // Calcul dynamique du délai moyen de closing (jours entre création et conversion)
        $closingQuery = Company::where('type', 'client')->whereNotNull('converted_at');
        $this->scopeForUser($closingQuery);
        if (in_array($request->user()->role, ['admin_commercial', 'super_admin'], true) && $request->filled('commercial_id')) {
            $closingQuery->where('commercial_id', $request->commercial_id);
        }
        $avgDays = $closingQuery->select(DB::raw('AVG(DATEDIFF(converted_at, created_at)) as avg_days'))->first()->avg_days;
        $avgClosingDays = $avgDays !== null ? round($avgDays, 1) : null;

        // Calcul dynamique de l'objectif trimestriel (Quarterly Target)
        $commercialId = $request->user()->id;
        if (in_array($request->user()->role, ['admin_commercial', 'super_admin'], true)) {
            $commercialId = $request->filled('commercial_id') ? (int) $request->commercial_id : null;
        }

        $quarterTarget = null;
        if ($commercialId) {
            $year = now()->year;
            $quarter = (int) ceil(now()->month / 3);

            $target = \App\Models\CommercialKpiTarget::where([
                'commercial_id' => $commercialId,
                'period_type' => 'quarter',
                'period_year' => $year,
                'period_quarter' => $quarter,
            ])->first();

            $startMonth = ($quarter - 1) * 3 + 1;
            $start = now()->setDate($year, $startMonth, 1)->startOfDay();
            $end = (clone $start)->addMonths(2)->endOfMonth()->endOfDay();

            $actualClients = Company::where('commercial_id', $commercialId)
                ->where('type', 'client')
                ->whereNotNull('converted_at')
                ->whereBetween('converted_at', [$start, $end])
                ->count();

            $targetClients = $target ? $target->target_clients : 0;
            $progressPct = $targetClients > 0 ? round(($actualClients / $targetClients) * 100, 1) : null;

            $quarterTarget = [
                'target' => $targetClients,
                'actual' => $actualClients,
                'progress_pct' => $progressPct,
                'year' => $year,
                'quarter' => $quarter,
            ];
        }

        $summary = [
            'pipeline_total' => (float) $query->clone()->sum('estimated_potential'),
            'hot_count' => $query->clone()->where('temperature', 'chaud')->count(),
            'avg_closing_days' => $avgClosingDays,
            'quarter_target' => $quarterTarget,
        ];

        $paginator = $query->with('contacts')->latest()->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
            'summary' => $summary,
        ]);
    }

    /**
     * Enregistrement d'un nouveau prospect
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'rccm' => 'nullable|string|max:20',
            'sector' => 'nullable|string',
            'address' => 'nullable|string',
            'city' => 'nullable|string',
            'zip_code' => 'nullable|string',
            'phone' => 'nullable|string',
            'email' => 'required|email|unique:companies,email',
            'temperature' => 'required|in:froid,tiede,chaud',
            'commercial_id' => 'nullable|exists:users,id',
            'estimated_potential' => 'nullable|numeric',
            'estimated_decision_date' => 'nullable|date',
            'needs' => 'nullable|string',
            'lead_source' => 'nullable|string',
            'category' => 'required|in:entreprise,particulier',
            'company_type' => 'nullable|in:flotte,apporteur,garage',
            
            // Infos Correspondant
            'contact_first_name' => 'required|string|max:100',
            'contact_last_name' => 'required|string|max:100',
            'contact_position' => 'nullable|string|max:100',
            'contact_phone' => 'nullable|string',
            'contact_email' => 'required|email|unique:users,email',
        ]);

        try {
            return DB::transaction(function () use ($validated) {
                $requestUser = request()->user();

                // Règle d'assignation:
                // - si commercial: il ne peut assigner que lui-même
                // - si admin: il peut choisir (admin ou commercial). Si non fourni, défaut = lui-même
                $commercialId = $validated['commercial_id'] ?? null;
                if ($requestUser && $requestUser->role === 'commercial') {
                    $commercialId = $requestUser->id;
                } elseif ($requestUser && in_array($requestUser->role, ['admin_commercial', 'super_admin'], true) && !$commercialId) {
                    $commercialId = $requestUser->id;
                }

                if ($commercialId) {
                    $assignee = \App\Models\User::find($commercialId);
                    if (!$assignee || !in_array($assignee->role, ['admin_commercial', 'super_admin', 'commercial'], true)) {
                        abort(422, "commercial_id invalide: l'utilisateur assigné doit être admin ou commercial.");
                    }
                }

                // 1. Créer l'entreprise (Prospect)
                $company = Company::create([
                    'type' => 'prospect',
                    'name' => $validated['name'],
                    'rccm' => $validated['rccm'] ?? null,
                    'sector' => $validated['sector'] ?? null,
                    'address' => $validated['address'] ?? null,
                    'city' => $validated['city'] ?? null,
                    'zip_code' => $validated['zip_code'] ?? null,
                    'phone' => $validated['phone'] ?? null,
                    'email' => $validated['email'] ?? null,
                    'commercial_id' => $commercialId,
                    'category' => $validated['category'],
                    'company_type' => $validated['company_type'] ?? null,
                    'temperature' => $validated['temperature'],
                    'estimated_potential' => $validated['estimated_potential'] ?? 0,
                    'estimated_decision_date' => $validated['estimated_decision_date'] ?? null,
                    'needs' => $validated['needs'] ?? null,
                    'lead_source' => $validated['lead_source'] ?? null,
                    'kanban_stage' => 'nouveau_lead'
                ]);

                // 2. Créer la fiche du correspondant (rôle client).
                // Tant que l'entreprise reste un prospect, aucun accès de connexion n'est
                // activé : le mot de passe est un placeholder inutilisable et aucun email
                // n'est envoyé. Les vrais identifiants ne sont générés et envoyés qu'à la
                // conversion en client (cf. convertToClient()).
                $user = User::create([
                    'company_id' => $company->id,
                    'role' => 'client',
                    'first_name' => $validated['contact_first_name'],
                    'last_name' => $validated['contact_last_name'],
                    'email' => $validated['contact_email'],
                    'phone' => $validated['contact_phone'] ?? ($validated['phone'] ?? null),
                    'password' => Hash::make(Str::random(40)),
                    'is_main_contact' => true,
                    'must_change_password' => true,
                ]);

                \App\Jobs\SyncCompanyToOdoo::dispatch($company->id, 'prospect_created');

                return response()->json([
                    'status' => 'success',
                    'message' => 'Prospect enregistré avec succès',
                    'data' => $company->load('contacts')
                ], 201);
            });
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la création : ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Détail d'un prospect (pour préremplir le formulaire d'édition)
     */
    public function show($id)
    {
        $company = Company::where('id', $id)->where('type', 'prospect')->with('contacts')->firstOrFail();

        return response()->json([
            'status' => 'success',
            'data' => $company
        ]);
    }

    /**
     * Mise à jour d'un prospect existant
     */
    public function update(Request $request, $id)
    {
        $company = Company::where('id', $id)->where('type', 'prospect')->firstOrFail();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'rccm' => 'nullable|string|max:20',
            'sector' => 'nullable|string',
            'address' => 'nullable|string',
            'city' => 'nullable|string',
            'zip_code' => 'nullable|string',
            'phone' => 'nullable|string',
            'email' => 'required|email|unique:companies,email,' . $id,
            'temperature' => 'required|in:froid,tiede,chaud',
            'commercial_id' => 'nullable|exists:users,id',
            'estimated_potential' => 'nullable|numeric',
            'estimated_decision_date' => 'nullable|date',
            'needs' => 'nullable|string',
            'lead_source' => 'nullable|string',
            'category' => 'required|in:entreprise,particulier',
            'company_type' => 'nullable|in:flotte,apporteur,garage',

            // Infos Correspondant
            'contact_first_name' => 'required|string|max:100',
            'contact_last_name' => 'required|string|max:100',
            'contact_position' => 'nullable|string|max:100',
            'contact_phone' => 'nullable|string',
        ]);

        try {
            return DB::transaction(function () use ($validated, $company) {
                $requestUser = request()->user();

                $commercialId = $validated['commercial_id'] ?? $company->commercial_id;
                if ($requestUser && $requestUser->role === 'commercial') {
                    $commercialId = $requestUser->id;
                }

                if ($commercialId) {
                    $assignee = User::find($commercialId);
                    if (!$assignee || !in_array($assignee->role, ['admin_commercial', 'super_admin', 'commercial'], true)) {
                        abort(422, "commercial_id invalide: l'utilisateur assigné doit être admin ou commercial.");
                    }
                }

                $company->update([
                    'name' => $validated['name'],
                    'rccm' => $validated['rccm'] ?? null,
                    'sector' => $validated['sector'] ?? null,
                    'address' => $validated['address'] ?? null,
                    'city' => $validated['city'] ?? null,
                    'zip_code' => $validated['zip_code'] ?? null,
                    'phone' => $validated['phone'] ?? null,
                    'email' => $validated['email'] ?? null,
                    'commercial_id' => $commercialId,
                    'category' => $validated['category'],
                    'company_type' => $validated['company_type'] ?? null,
                    'temperature' => $validated['temperature'],
                    'estimated_potential' => $validated['estimated_potential'] ?? 0,
                    'estimated_decision_date' => $validated['estimated_decision_date'] ?? null,
                    'needs' => $validated['needs'] ?? null,
                    'lead_source' => $validated['lead_source'] ?? null,
                ]);

                $mainContact = $company->contacts()->where('is_main_contact', true)->first();
                if ($mainContact) {
                    $mainContact->update([
                        'first_name' => $validated['contact_first_name'],
                        'last_name' => $validated['contact_last_name'],
                        'phone' => $validated['contact_phone'] ?? null,
                    ]);
                }

                return response()->json([
                    'status' => 'success',
                    'message' => 'Prospect mis à jour avec succès',
                    'data' => $company->fresh()->load('contacts')
                ]);
            });
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la mise à jour : ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Conversion d'un prospect en client
     */
    public function convertToClient($id)
    {
        $company = Company::where('id', $id)->where('type', 'prospect')->firstOrFail();

        // Vérifier qu'il y a au moins un correspondant avant de convertir
        $allContacts = $company->contacts()->get();
        if ($allContacts->isEmpty()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Impossible de convertir : ce prospect n\'a aucun correspondant. Veuillez ajouter au moins un contact avant la conversion.'
            ], 422);
        }

        $company->update([
            'type' => 'client',
            'is_active' => true,
            'kanban_stage' => 'client_actif',
            'converted_at' => now(),
        ]);

        \App\Jobs\SyncCompanyToOdoo::dispatch($company->id, 'converted_to_client');

        // Envoyer un email à TOUS les correspondants de l'entreprise
        foreach ($allContacts as $contact) {
            $plainPassword = Str::random(10);
            $contact->update(['password' => Hash::make($plainPassword), 'must_change_password' => true]);
            try {
                \Illuminate\Support\Facades\Mail::to($contact->email)->send(
                    new \App\Mail\ClientAccountCreated($contact, $plainPassword, true)
                );
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Erreur envoi mail conversion client (ProspectController) pour ' . $contact->email . ': ' . $e->getMessage());
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Prospect converti en client avec succès',
            'data' => $company
        ]);
    }

    public function updateTemperature(Request $request, $id)
    {
        $request->validate([
            'temperature' => 'required|in:froid,tiede,chaud'
        ]);

        $prospect = \App\Models\Company::where('id', $id)->where('type', 'prospect')->firstOrFail();
        $prospect->update(['temperature' => $request->temperature]);

        return response()->json([
            'status' => 'success', 
            'message' => 'Température mise à jour avec succès.',
            'data' => $prospect
        ]);
    }
}
