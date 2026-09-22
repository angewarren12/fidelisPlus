<?php

namespace App\Console\Commands;

use App\Models\LoyaltyMember;
use App\Services\Sira\SiraClient;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Interroge l'API SIRA pour chaque membre dont le provisioning est `pending`
 * afin de détecter les passages à `active` (→ provisioned) ou `rejected`.
 *
 * Fréquence recommandée par la spec v2.1 §6 : 1 fois par jour par demande en
 * attente. On fixe toutes les 6h pour avoir une réactivité raisonnable tout
 * en respectant le plafond de 60 appels/minute de SIRA.
 *
 * Planifié dans routes/console.php → Schedule::command('sira:sync-pending-statuses')->everySixHours()
 */
class SyncSiraPendingStatuses extends Command
{
    protected $signature   = 'sira:sync-pending-statuses {--dry-run : Affiche les changements sans les enregistrer}';
    protected $description = 'Interroge SIRA pour les membres en statut pending et met à jour sira_provisioning_status.';

    public function handle(SiraClient $sira): int
    {
        $dryRun = (bool) $this->option('dry-run');

        // Seuls les membres avec sira_client_id (donc déjà déposés chez SIRA) et
        // sira_provisioning_status = 'pending' sont à interroger.
        // On exclut 'failed' : ils doivent être relancés manuellement via le backoffice.
        $pending = LoyaltyMember::query()
            ->whereNotNull('sira_client_id')
            ->where('sira_provisioning_status', 'pending')
            ->get(['id', 'sira_client_id', 'contact', 'nom', 'prenom', 'nom_entreprise']);

        if ($pending->isEmpty()) {
            $this->info('Aucun membre en attente de provisioning SIRA.');
            return self::SUCCESS;
        }

        $this->info("Vérification de {$pending->count()} membre(s) en statut pending...");

        $updated    = 0;
        $stillPending = 0;
        $errors     = 0;

        foreach ($pending as $member) {
            $result = $sira->getUserStatus($member->sira_client_id);

            if ($result === null) {
                $this->warn("  ✗ [{$member->id}] Impossible de joindre SIRA pour {$member->sira_client_id}");
                $errors++;
                continue;
            }

            $newStatus = match ($result['status']) {
                'active'   => 'provisioned',
                'rejected' => 'rejected',
                default    => 'pending',
            };

            if ($newStatus === 'pending') {
                $this->line("  ○ [{$member->id}] Toujours en attente.");
                $stillPending++;
                continue;
            }

            $displayName = $member->nom_entreprise
                ?? trim(($member->prenom ?? '') . ' ' . ($member->nom ?? ''))
                ?: "Membre #{$member->id}";

            $this->info("  ✓ [{$member->id}] {$displayName} → {$newStatus}");

            if (! $dryRun) {
                $member->sira_provisioning_status = $newStatus;
                $member->sira_status_changed_at   = $result['status_changed_at'] ?? now()->toIso8601String();
                $member->save();

                Log::info('SyncSiraPendingStatuses: statut mis à jour', [
                    'member_id'    => $member->id,
                    'sira_client_id' => $member->sira_client_id,
                    'new_status'   => $newStatus,
                ]);
            }

            $updated++;
        }

        $this->newLine();
        $this->table(
            ['Mis à jour', 'Toujours pending', 'Erreurs SIRA'],
            [[$updated, $stillPending, $errors]]
        );

        if ($dryRun) {
            $this->warn('Mode --dry-run : aucune modification enregistrée.');
        }

        return self::SUCCESS;
    }
}
