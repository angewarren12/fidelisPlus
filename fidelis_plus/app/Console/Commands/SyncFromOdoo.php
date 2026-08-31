<?php

namespace App\Console\Commands;

use App\Models\OdooSyncCursor;
use App\Models\OdooSyncLog;
use App\Services\Odoo\OdooClient;
use App\Services\Odoo\OdooIngestService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Cron de pull Odoo -> FidelisPlus amélioré :
 *   - Verrouillage atomique (Cache::lock) pour éviter les exécutions concurrentes.
 *   - Marge de sécurité temporelle (Safety Overlap Window) de 5 minutes.
 *   - Logs d'audit détaillés en base (odoo_sync_logs).
 *   - Options --full et --resource= pour des exécutions ciblées.
 */
class SyncFromOdoo extends Command
{
    protected $signature = 'odoo:sync 
                            {--full : Réinitialise le curseur et force un rapatriement complet} 
                            {--resource= : Cible une ressource spécifique (companies, vehicles, quotes)}';

    protected $description = 'Récupère depuis Odoo les prospects/clients, flottes et devis créés ou modifiés.';

    public function handle(OdooClient $odoo, OdooIngestService $ingest): int
    {
        // Protection contre les exécutions simultanées (Atomic Lock 5 min)
        $lock = Cache::lock('odoo_sync_lock', 300);

        if (! $lock->get()) {
            $this->warn('odoo:sync — Une synchronisation est déjà en cours. Opération ignorée.');
            return Command::SUCCESS;
        }

        try {
            $targetResource = $this->option('resource');
            $resources = $targetResource ? [$targetResource] : ['companies', 'vehicles', 'quotes'];

            foreach ($resources as $resource) {
                if (! in_array($resource, ['companies', 'vehicles', 'quotes'], true)) {
                    $this->error("Ressource inconnue [{$resource}]. Valeurs valides: companies, vehicles, quotes.");
                    continue;
                }
                $this->syncResource($resource, $odoo, $ingest);
            }

            return Command::SUCCESS;
        } finally {
            $lock->release();
        }
    }

    private function syncResource(string $resource, OdooClient $odoo, OdooIngestService $ingest): void
    {
        $startTime = microtime(true);
        $fetchMethod  = 'fetchUpdated' . ucfirst($resource);
        $ingestMethod = 'ingest' . rtrim(ucfirst($resource), 's');
        if ($resource === 'companies') {
            $ingestMethod = 'ingestCompany';
        }

        $cursor = OdooSyncCursor::firstOrCreate(['resource' => $resource]);

        // Option --full : réinitialiser le curseur
        if ($this->option('full')) {
            $cursor->update(['last_synced_at' => null]);
            $this->info("odoo:sync [{$resource}] : Curseur réinitialisé (--full).");
        }

        // Chevauchement de sécurité de 5 minutes pour éviter d'ignorer des enregistrements récents
        $syncedFrom = $cursor->last_synced_at
            ? $cursor->last_synced_at->subMinutes(5)
            : null;

        $sinceStr = $syncedFrom?->toIso8601String();
        $syncedTo = now();

        try {
            $records = $odoo->{$fetchMethod}($sinceStr);

            if ($records === null) {
                $duration = (int) round((microtime(true) - $startTime) * 1000);
                $this->warn("odoo:sync [{$resource}] indisponible, réessai au prochain passage.");

                OdooSyncLog::create([
                    'resource'        => $resource,
                    'status'          => 'failed',
                    'records_fetched' => 0,
                    'records_synced'  => 0,
                    'duration_ms'     => $duration,
                    'error_message'   => 'API Odoo indisponible ou erreur HTTP',
                    'synced_from'     => $syncedFrom,
                    'synced_to'       => $syncedTo,
                ]);

                return;
            }

            $fetchedCount = count($records);
            $syncedCount  = 0;

            foreach ($records as $record) {
                if (! is_array($record)) {
                    continue;
                }
                if ($ingest->{$ingestMethod}($record) !== null) {
                    $syncedCount++;
                }
            }

            // Mise à jour du curseur
            $cursor->update(['last_synced_at' => $syncedTo]);

            $duration = (int) round((microtime(true) - $startTime) * 1000);

            OdooSyncLog::create([
                'resource'        => $resource,
                'status'          => 'success',
                'records_fetched' => $fetchedCount,
                'records_synced'  => $syncedCount,
                'duration_ms'     => $duration,
                'synced_from'     => $syncedFrom,
                'synced_to'       => $syncedTo,
            ]);

            $this->info("odoo:sync [{$resource}] : {$syncedCount}/{$fetchedCount} enregistrement(s) synchronisé(s) en {$duration}ms.");
        } catch (\Throwable $e) {
            $duration = (int) round((microtime(true) - $startTime) * 1000);
            Log::warning("SyncFromOdoo::syncResource [{$resource}] exception", ['message' => $e->getMessage()]);

            OdooSyncLog::create([
                'resource'        => $resource,
                'status'          => 'failed',
                'records_fetched' => 0,
                'records_synced'  => 0,
                'duration_ms'     => $duration,
                'error_message'   => $e->getMessage(),
                'synced_from'     => $syncedFrom,
                'synced_to'       => $syncedTo,
            ]);

            $this->error("odoo:sync [{$resource}] a échoué : " . $e->getMessage());
        }
    }
}
