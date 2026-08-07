<?php

namespace App\Console\Commands;

use App\Models\OdooSyncCursor;
use App\Services\Odoo\OdooClient;
use App\Services\Odoo\OdooIngestService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Cron de pull Odoo -> FidelisPlus (remplace l'ancien webhook entrant suite au
 * compte-rendu de la séance de travail avec l'équipe Odoo : Odoo n'appelle jamais
 * FidelisPlus, c'est FidelisPlus qui va chercher les nouveautés).
 *
 * Trois ressources indépendantes (companies, vehicles, quotes), chacune isolée
 * dans son propre try/catch pour qu'un échec sur l'une n'empêche pas les autres.
 * Planifié dans routes/console.php.
 */
#[Signature('odoo:sync')]
#[Description('Récupère depuis Odoo les prospects/clients, flottes et devis créés ou modifiés depuis la dernière synchronisation.')]
class SyncFromOdoo extends Command
{
    public function handle(OdooClient $odoo, OdooIngestService $ingest)
    {
        $this->syncResource('companies', $odoo, $ingest, 'fetchUpdatedCompanies', 'ingestCompany');
        $this->syncResource('vehicles', $odoo, $ingest, 'fetchUpdatedVehicles', 'ingestVehicle');
        $this->syncResource('quotes', $odoo, $ingest, 'fetchUpdatedQuotes', 'ingestQuote');
    }

    private function syncResource(string $resource, OdooClient $odoo, OdooIngestService $ingest, string $fetchMethod, string $ingestMethod): void
    {
        try {
            $cursor = OdooSyncCursor::firstOrCreate(['resource' => $resource]);
            $since = $cursor->last_synced_at?->toIso8601String();

            $records = $odoo->{$fetchMethod}($since);

            if ($records === null) {
                // Odoo indisponible ou erreur réseau — déjà journalisé par OdooClient.
                // On ne bouge pas le curseur pour retenter au prochain passage.
                $this->warn("odoo:sync [{$resource}] indisponible, réessai au prochain passage.");

                return;
            }

            $count = 0;
            foreach ($records as $record) {
                if (!is_array($record)) {
                    continue;
                }
                if ($ingest->{$ingestMethod}($record) !== null) {
                    $count++;
                }
            }

            $cursor->update(['last_synced_at' => now()]);
            $this->info("odoo:sync [{$resource}] : {$count}/" . count($records) . ' enregistrement(s) synchronisé(s).');
        } catch (\Throwable $e) {
            Log::warning("SyncFromOdoo::syncResource [{$resource}] exception", ['message' => $e->getMessage()]);
            $this->error("odoo:sync [{$resource}] a échoué : " . $e->getMessage());
        }
    }
}
