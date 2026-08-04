<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Company;
use App\Support\UserRoles;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use App\Mail\CommercialAccountCreated;

class TeamController extends Controller
{
    private static function internalStaffRoles(): array
    {
        return UserRoles::internalStaff();
    }

    /**
     * Liste des membres de l'équipe interne (commerciaux & admins).
     */
    public function index(Request $request)
    {
        // Rôles staff uniquement (les clients ont role=client). Ne pas filtrer sur company_id :
        // certains commerciaux/admins peuvent avoir company_id renseigné (import, ancienne donnée)
        // et disparaissaient alors de la liste.
        $query = User::whereIn('role', self::internalStaffRoles());

        // Chacun ne voit que son propre périmètre : un commercial (ou l'admin commercial) ne
        // voit que l'équipe commerciale, un admin marketing que l'équipe marketing/caisse.
        // Le super_admin voit tout le monde (pas de filtre supplémentaire).
        $viewer = $request->user();
        $scopedRoles = match ($viewer?->role) {
            UserRoles::COMMERCIAL, UserRoles::ADMIN_COMMERCIAL => [UserRoles::COMMERCIAL, UserRoles::ADMIN_COMMERCIAL],
            UserRoles::MARKETING, UserRoles::ADMIN_MARKETING => [UserRoles::MARKETING, UserRoles::ADMIN_MARKETING, UserRoles::CAISSIER],
            default => null,
        };
        if ($scopedRoles !== null) {
            $query->whereIn('role', $scopedRoles);
        }

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('first_name', 'LIKE', "%{$s}%")
                    ->orWhere('last_name', 'LIKE', "%{$s}%")
                    ->orWhere('email', 'LIKE', "%{$s}%");
            });
        }

        $perPage = min(100, max(1, (int) $request->get('per_page', 12)));

        $paginator = $query->withCount([
            // Service commercial : portefeuille clients/prospects.
            'managedCompanies as clients_count' => fn ($q) => $q->where('type', 'client'),
            'managedCompanies as prospects_count' => fn ($q) => $q->where('type', 'prospect'),
            // Caissier : scans effectués en station.
            'cashierScans as scans_count',
            // Service marketing : lots fidélité traités (livrés ou annulés).
            'handledRedemptions as redemptions_handled_count',
        ])
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    /**
     * Création d'un nouveau collaborateur.
     */
    public function store(Request $request)
    {
        $actor = $request->user();
        $allowedRoles = match ($actor?->role) {
            UserRoles::SUPER_ADMIN => UserRoles::internalStaff(),
            UserRoles::ADMIN_COMMERCIAL => [UserRoles::COMMERCIAL, UserRoles::ADMIN_COMMERCIAL],
            UserRoles::ADMIN_MARKETING => [UserRoles::MARKETING, UserRoles::ADMIN_MARKETING, UserRoles::CAISSIER],
            UserRoles::COMMERCIAL => [UserRoles::COMMERCIAL],
            default => [],
        };

        if ($allowedRoles === []) {
            abort(403, 'Création de collaborateur non autorisée.');
        }

        $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'nullable|string',
            'role' => 'required|in:'.implode(',', $allowedRoles),
        ]);

        $rawPassword = Str::random(10); // Génération d'un mot de passe sécurisé

        $user = User::create([
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'phone' => $request->phone,
            'role' => $request->role,
            'password' => Hash::make($rawPassword),
            'company_id' => null, // Utilisateur interne
            'is_main_contact' => false,
            'must_change_password' => true,
        ]);

        // Envoi de l'email avec le mot de passe généré
        try {
            Mail::to($user->email)->send(new CommercialAccountCreated($user, $rawPassword));
        } catch (\Exception $e) {
            \Log::error("Erreur lors de l'envoi de l'email au collaborateur: " . $e->getMessage());
            // On ne bloque pas la création si l'email échoue, mais on l'indique dans la trace
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Collaborateur créé avec succès. Un email contenant ses accès a été envoyé.',
            'data' => $user,
            'temporary_password' => $rawPassword,
        ], 201);
    }

    /**
     * Voir les infos d'un collaborateur spécifique.
     * Un commercial ne peut consulter que son propre profil (performances / fiche).
     */
    public function show(Request $request, $id)
    {
        $user = User::whereIn('role', self::internalStaffRoles())
                    ->withCount([
                        'managedCompanies as clients_count' => fn ($q) => $q->where('type', 'client'),
                        'managedCompanies as prospects_count' => fn ($q) => $q->where('type', 'prospect'),
                        'cashierScans as scans_count',
                        'handledRedemptions as redemptions_handled_count',
                    ])
                    ->findOrFail($id);

        $current = $request->user();
        if ($current && in_array($current->role, [UserRoles::COMMERCIAL, UserRoles::CAISSIER], true)
            && (int) $current->id !== (int) $id) {
            abort(403, 'Vous ne pouvez consulter que votre propre fiche équipe.');
        }

        $detail = [];

        if (in_array($user->role, [UserRoles::CAISSIER], true)) {
            $detail['cashier'] = [
                'points_credited' => (int) $user->cashierScans()->sum('points_credited'),
                'last_scan_at' => $user->cashierScans()->latest()->value('created_at'),
                'top_station' => $user->cashierScans()
                    ->join('stations', 'stations.id', '=', 'loyalty_pos_scan_events.station_id')
                    ->selectRaw('stations.name as station_name, COUNT(*) as scans_count')
                    ->groupBy('stations.id', 'stations.name')
                    ->orderByDesc('scans_count')
                    ->first(),
            ];
        }

        if (in_array($user->role, [UserRoles::MARKETING, UserRoles::ADMIN_MARKETING], true)) {
            $detail['marketing'] = [
                'redemptions_delivered' => (int) $user->handledRedemptions()->where('status', 'delivered')->count(),
                'redemptions_cancelled' => (int) $user->handledRedemptions()->where('status', 'cancelled')->count(),
            ];
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                ...$user->toArray(),
                'detail' => $detail,
            ]
        ]);
    }

    /**
     * Éditer un profil membre l'équipe.
     */
    public function update(Request $request, $id)
    {
        $user = User::whereIn('role', self::internalStaffRoles())->findOrFail($id);

        $current = $request->user();
        if ($current && in_array($current->role, [UserRoles::COMMERCIAL, UserRoles::CAISSIER], true)
            && (int) $current->id !== (int) $id) {
            abort(403, 'Vous ne pouvez modifier que votre propre profil.');
        }

        $allowedRoles = match ($current?->role) {
            UserRoles::SUPER_ADMIN => UserRoles::internalStaff(),
            UserRoles::ADMIN_COMMERCIAL => [UserRoles::COMMERCIAL, UserRoles::ADMIN_COMMERCIAL],
            UserRoles::ADMIN_MARKETING => [UserRoles::MARKETING, UserRoles::ADMIN_MARKETING, UserRoles::CAISSIER],
            UserRoles::COMMERCIAL => [UserRoles::COMMERCIAL],
            UserRoles::CAISSIER => [UserRoles::CAISSIER],
            default => [],
        };

        if ($allowedRoles === []) {
            abort(403, 'Modification du profil non autorisée.');
        }

        $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $user->id,
            'phone' => 'nullable|string',
            'role' => 'required|in:'.implode(',', $allowedRoles),
        ]);

        // Commercial / marketing / caissier ne peuvent pas s’auto-promouvoir admin.
        if ($current && ! in_array($current->role, UserRoles::anyAdmin(), true) && $request->role !== $user->role) {
            abort(403, 'Changement de rôle réservé à un administrateur.');
        }

        $user->update($request->only(['first_name', 'last_name', 'email', 'phone', 'role']));

        return response()->json([
            'status' => 'success',
            'message' => 'Profil mis à jour.',
            'data' => $user
        ]);
    }

    /**
     * Supprimer / Désactiver un compte.
     */
    public function destroy(Request $request, $id)
    {
        $user = User::whereIn('role', self::internalStaffRoles())->findOrFail($id);

        $current = $request->user();
        if ($current && ! in_array($current->role, UserRoles::anyAdmin(), true) && (int) $current->id !== (int) $id) {
            abort(403, 'Suppression réservée à un administrateur ou à votre propre compte.');
        }

        // Plutôt qu'une suppression dure, ou si destruction dure, vérifier les clients orphelins
        $hasClients = Company::where('commercial_id', $user->id)->exists();

        if ($hasClients && $user->role === 'commercial') {
            return response()->json([
                'status' => 'error',
                'message' => 'Impossible de supprimer ce commercial car il gère des clients actifs. Veuillez d\'abord réattribuer ses clients.'
            ], 422);
        }

        $user->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Utilisateur supprimé.'
        ]);
    }

    /**
     * Réattribution des clients d'un commercial à un autre.
     */
    public function reassignClients(Request $request, $id)
    {
        if (! in_array($request->user()?->role, [UserRoles::ADMIN_COMMERCIAL, UserRoles::SUPER_ADMIN], true)) {
            abort(403, 'Réattribution réservée à un administrateur commercial.');
        }

        $request->validate([
            'new_commercial_id' => 'required|exists:users,id'
        ]);

        $oldCommercial = clone \App\Models\User::findOrFail($id);
        $newCommercial = \App\Models\User::where('role', 'commercial')->findOrFail($request->new_commercial_id);

        $updatedCount = Company::where('commercial_id', $oldCommercial->id)
                               ->update(['commercial_id' => $newCommercial->id]);

        return response()->json([
            'status' => 'success',
            'message' => "$updatedCount clients ont été réattribués avec succès à {$newCommercial->first_name}.",
            'data' => ['reassigned_count' => $updatedCount]
        ]);
    }
}
