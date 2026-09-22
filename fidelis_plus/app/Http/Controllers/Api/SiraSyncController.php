<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProvisionSiraAccountForMember;
use App\Models\LoyaltyMember;
use App\Services\Sira\SiraClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

/**
 * Contrôleur de supervision et d'administration de la synchro SIRA ↔ Fidelis Plus.
 * Accessible via l'espace Marketing Backoffice.
 */
class SiraSyncController extends Controller
{
    /**
     * Liste des membres avec filtrage et statistiques globales de provisioning SIRA.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = min(100, max(5, (int) $request->get('per_page', 25)));
        $statusFilter = $request->get('sira_status');

        $query = LoyaltyMember::query()->with(['loyaltyAccount']);

        // Statistiques globales
        $stats = [
            'total'       => (clone $query)->count(),
            'provisioned' => (clone $query)->where('sira_provisioning_status', 'provisioned')->count(),
            'pending'     => (clone $query)->where('sira_provisioning_status', 'pending')->count(),
            'failed'      => (clone $query)->where('sira_provisioning_status', 'failed')->count(),
            'rejected'    => (clone $query)->where('sira_provisioning_status', 'rejected')->count(),
            'none'        => (clone $query)->where(function ($q) {
                $q->whereNull('sira_provisioning_status')
                  ->orWhere('sira_provisioning_status', 'none')
                  ->orWhere('sira_provisioning_status', '');
            })->count(),
        ];

        // Filtre par statut SIRA
        if ($statusFilter && $statusFilter !== 'all') {
            if ($statusFilter === 'none') {
                $query->where(function ($q) {
                    $q->whereNull('sira_provisioning_status')
                      ->orWhere('sira_provisioning_status', 'none')
                      ->orWhere('sira_provisioning_status', '');
                });
            } else {
                $query->where('sira_provisioning_status', $statusFilter);
            }
        }

        // Filtre de recherche texte
        if ($request->filled('search')) {
            $s = trim((string) $request->input('search'));
            $query->where(function ($q) use ($s) {
                $q->where('nom', 'like', "%{$s}%")
                  ->orWhere('prenom', 'like', "%{$s}%")
                  ->orWhere('nom_entreprise', 'like', "%{$s}%")
                  ->orWhere('contact', 'like', "%{$s}%")
                  ->orWhere('email', 'like', "%{$s}%")
                  ->orWhere('sira_client_id', 'like', "%{$s}%");
            });
        }

        $paginator = $query->orderByDesc('id')->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'stats'  => $stats,
            'data'   => $paginator->items(),
            'meta'   => [
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
            ],
        ]);
    }

    /**
     * Interroge SIRA immédiatement pour un membre spécifique en attente (pending).
     */
    public function syncOne(int $id, SiraClient $sira): JsonResponse
    {
        $member = LoyaltyMember::findOrFail($id);

        if (empty($member->sira_client_id)) {
            return response()->json([
                'status'  => 'error',
                'message' => "Le membre #{$id} n'a pas encore de sira_client_id.",
            ], 422);
        }

        $result = $sira->getUserStatus($member->sira_client_id);

        if ($result === null) {
            return response()->json([
                'status'  => 'error',
                'message' => "Impossible de contacter l'API SIRA pour vérifier le membre {$member->sira_client_id}.",
            ], 502);
        }

        $newStatus = match ($result['status']) {
            'active'   => 'provisioned',
            'rejected' => 'rejected',
            default    => 'pending',
        };

        $member->sira_provisioning_status = $newStatus;
        $member->sira_status_changed_at   = $result['status_changed_at'] ?? now()->toIso8601String();
        $member->save();

        Log::info('SiraSyncController@syncOne: Statut membre SIRA mis à jour', [
            'member_id'      => $member->id,
            'sira_client_id' => $member->sira_client_id,
            'new_status'     => $newStatus,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => "Statut SIRA vérifié avec succès: {$newStatus}",
            'member'  => $member->fresh(['loyaltyAccount']),
        ]);
    }

    /**
     * Relance le job de provisioning SIRA pour un membre en statut `failed` ou `none`.
     */
    public function retryProvisioning(int $id): JsonResponse
    {
        $member = LoyaltyMember::findOrFail($id);

        $member->sira_provisioning_status = 'pending';
        $member->save();

        ProvisionSiraAccountForMember::dispatch($member);

        Log::info('SiraSyncController@retryProvisioning: Job de provisioning SIRA réémis', [
            'member_id' => $member->id,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => "Demande de synchronisation SIRA réémise pour le membre #{$id}.",
            'member'  => $member->fresh(['loyaltyAccount']),
        ]);
    }

    /**
     * Exécute manuellement la vérification globale de tous les membres pending via l'Artisan command.
     */
    public function syncAllPending(): JsonResponse
    {
        Artisan::call('sira:sync-pending-statuses');
        $output = Artisan::output();

        return response()->json([
            'status'  => 'success',
            'message' => 'Synchronisation globale des statuts SIRA terminée.',
            'output'  => $output,
        ]);
    }
}
