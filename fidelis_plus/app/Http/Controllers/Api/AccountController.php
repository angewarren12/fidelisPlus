<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\User;
use App\Http\Resources\CompanyResource;
use App\Traits\ScopesByRole;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class AccountController extends Controller
{
    use ScopesByRole;

    /**
     * Liste des comptes (Clients et Prospects).
     */
    public function index(Request $request)
    {
        $query = Company::query();
        
        // Sécurité automatique par rôle
        $this->scopeForUser($query);

        // Filtres
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        if ($request->has('commercial_id')) {
            $query->where('commercial_id', $request->commercial_id);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('rccm', 'LIKE', "%{$search}%");
            });
        }

        // Gestion du Soft Delete (Voir les archivés)
        if ($request->has('only_deleted')) {
            $query->onlyTrashed();
        }

        $accounts = $query->with('contacts')->withCount('vehicles')->paginate($request->get('limit', 15));

        return CompanyResource::collection($accounts);
    }

    /**
     * Création d'un nouveau compte (Prospect ou Client direct).
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'category' => 'required|in:entreprise,particulier',
            'type' => 'required|in:prospect,client',
            'company_type' => 'nullable|in:flotte,apporteur,garage',
            'email' => 'required|email|unique:users,email|unique:companies,email',
            'first_name' => 'required|string',
            'last_name' => 'required|string',
            'phone' => 'nullable|string',
            'commercial_id' => 'nullable|exists:users,id',
            'observations' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        return DB::transaction(function () use ($request) {
            // 1. Création de l'entité Compte/Entreprise
            // Sécurité : Un commercial ne peut créer qu'un compte pour lui-même
            $data = $request->only([
                'type', 'category', 'company_type', 'name', 'email', 'phone', 'rccm', 'address', 'city', 'zip_code', 'sector',
                'commercial_id', 'observations', 'is_active'
            ]);

            if (auth()->user() && auth()->user()->role === 'commercial') {
                $data['commercial_id'] = auth()->id();
            }

            $company = Company::create($data);

            // 2. Création du premier contact associé (User client).
            // Un accès de connexion (mot de passe réel + email) n'est activé que si le
            // compte est créé directement en tant que client. S'il est créé en tant que
            // prospect, l'activation se fera à la conversion (cf. convert()).
            $isClient = $company->type === 'client';
            $plainPassword = $isClient ? Str::random(10) : Str::random(40);
            $user = User::create([
                'company_id' => $company->id,
                'role' => 'client',
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'email' => $request->email,
                'phone' => $request->phone,
                'password' => Hash::make($plainPassword),
                'is_main_contact' => true,
                'must_change_password' => true,
            ]);

            if ($isClient) {
                try {
                    \Illuminate\Support\Facades\Mail::to($user->email)->send(
                        new \App\Mail\ClientAccountCreated($user, $plainPassword)
                    );
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error('Erreur envoi mail client direct: ' . $e->getMessage());
                }
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Compte créé avec succès.',
                'data' => $company->load('contacts')
            ], 201);
        });
    }

    /**
     * Détail d'un compte.
     */
    public function show($id)
    {
        $account = Company::with(['contacts', 'vehicles', 'notes.author'])->findOrFail($id);

        $user = request()->user();
        if ($user) {
            if ($user->role === 'client' && (int) $account->id !== (int) $user->company_id) {
                return response()->json(['status' => 'error', 'message' => 'Accès refusé.'], 403);
            }
            if ($user->role === 'commercial' && (int) $account->commercial_id !== (int) $user->id) {
                return response()->json(['status' => 'error', 'message' => 'Accès refusé : Ce compte appartient à un autre commercial.'], 403);
            }
        }

        return new CompanyResource($account);
    }

    /**
     * Modification d'un compte.
     */
    public function update(Request $request, $id)
    {
        $account = Company::findOrFail($id);

        $user = request()->user();
        if ($user && $user->role === 'commercial' && (int) $account->commercial_id !== (int) $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Modification refusée : Ce compte appartient à un autre commercial.'], 403);
        }

        $validated = $request->validate([
            'commercial_id' => 'sometimes|nullable|exists:users,id',
            'type' => 'sometimes|in:prospect,client',
            'category' => 'sometimes|in:entreprise,particulier',
            'company_type' => 'sometimes|nullable|in:flotte,apporteur,garage',
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|required|email|unique:companies,email,' . $id . '|unique:users,email',
            'phone' => 'sometimes|nullable|string',
            'rccm' => 'sometimes|nullable|string|max:255',
            'address' => 'sometimes|nullable|string',
            'observations' => 'sometimes|nullable|string',
            'sector' => 'sometimes|nullable|string|max:255',
            'kanban_stage' => 'sometimes|nullable|string|max:255',
            'temperature' => 'sometimes|nullable|string|max:255',
            'is_active' => 'sometimes|boolean',
            'account_balance' => 'sometimes|numeric',
            'last_contact_date' => 'sometimes|nullable|date',
        ]);

        if ($user && $user->role === 'commercial') {
            unset($validated['commercial_id']); // Block commercial from re-assigning their accounts
        }

        $account->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Compte mis à jour.',
            'data' => $account->fresh()
        ]);
    }

    /**
     * Suppression logique (Soft Delete).
     */
    public function destroy($id)
    {
        $account = Company::findOrFail($id);

        $user = request()->user();
        if ($user && $user->role === 'commercial' && (int) $account->commercial_id !== (int) $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Action refusée : Ce compte appartient à un autre commercial.'], 403);
        }

        $account->delete();

        \App\Jobs\SyncCompanyToOdoo::dispatch($account->id, 'company_archived');

        return response()->json([
            'status' => 'success',
            'message' => 'Compte archivé avec succès.'
        ]);
    }

    /**
     * Restaurer un compte supprimé.
     */
    public function restore($id)
    {
        $account = Company::withTrashed()->findOrFail($id);

        $user = request()->user();
        if ($user && $user->role === 'commercial' && (int) $account->commercial_id !== (int) $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Action refusée.'], 403);
        }

        $account->restore();

        \App\Jobs\SyncCompanyToOdoo::dispatch($account->id, 'company_restored');

        return response()->json([
            'status' => 'success',
            'message' => 'Compte restauré.'
        ]);
    }

    /**
     * Recharger le solde (Commercial).
     */
    public function updateBalance(Request $request, $id)
    {
        $request->validate(['amount' => 'required|numeric']);
        
        $account = Company::findOrFail($id);

        $user = request()->user();
        if ($user && $user->role === 'commercial' && (int) $account->commercial_id !== (int) $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Action refusée.'], 403);
        }

        $account->account_balance += $request->amount;
        $account->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Solde mis à jour.',
            'new_balance' => $account->account_balance
        ]);
    }

    /**
     * Conversion d'un Prospect en Client.
     */
    public function convert($id)
    {
        $account = Company::findOrFail($id);

        $user = request()->user();
        if ($user && $user->role === 'commercial' && (int) $account->commercial_id !== (int) $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Conversion refusée : Ce prospect appartient à un autre commercial.'], 403);
        }
        
        if ($account->type === 'client') {
            return response()->json(['status' => 'error', 'message' => 'Déjà un client.'], 400);
        }

        // Vérifier qu'il y a au moins un correspondant avant de convertir
        $allContacts = $account->contacts()->get();
        if ($allContacts->isEmpty()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Impossible de convertir : ce prospect n\'a aucun correspondant. Veuillez ajouter au moins un contact avant la conversion.'
            ], 422);
        }

        $account->update([
            'type' => 'client',
            'kanban_stage' => 'converti',
            'converted_at' => now(),
        ]);

        // Envoyer un email à TOUS les correspondants de l'entreprise
        foreach ($allContacts as $contact) {
            $plainPassword = Str::random(10);
            $contact->update(['password' => Hash::make($plainPassword), 'must_change_password' => true]);
            try {
                \Illuminate\Support\Facades\Mail::to($contact->email)->send(
                    new \App\Mail\ClientAccountCreated($contact, $plainPassword, true)
                );
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Erreur envoi mail conversion client (AccountController) pour ' . $contact->email . ': ' . $e->getMessage());
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Prospect converti en client avec succès.'
        ]);
    }

    /**
     * Ajouter un correspondant (contact) à un compte.
     */
    public function addContact(Request $request, $id)
    {
        $account = Company::findOrFail($id);

        $user = request()->user();
        if ($user && $user->role === 'commercial' && (int) $account->commercial_id !== (int) $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Action refusée : Ce compte appartient à un autre commercial.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'nullable|string|max:255',
            'position' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        // Un correspondant de compte est toujours un client : ce endpoint ne doit
        // jamais permettre de créer un admin/commercial/marketing (voir TeamController).
        // L'accès de connexion n'est activé (mot de passe réel + email) que si
        // l'entreprise est déjà cliente ; pour un prospect, l'activation aura lieu à la conversion.
        $isClient = $account->type === 'client';
        $plainPassword = $isClient ? Str::random(10) : Str::random(40);
        $user = User::create([
            'company_id' => $account->id,
            'role' => 'client',
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'phone' => $request->phone,
            'position' => $request->position,
            'password' => Hash::make($plainPassword),
            'is_main_contact' => false,
            'must_change_password' => true,
        ]);

        if ($isClient) {
            try {
                \Illuminate\Support\Facades\Mail::to($user->email)->send(
                    new \App\Mail\ClientAccountCreated($user, $plainPassword)
                );
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Erreur envoi mail correspondant client: ' . $e->getMessage());
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Correspondant ajouté avec succès.',
            'data' => $user
        ], 201);
    }
}

