<?php

namespace App\Jobs;

use App\Models\Company;
use App\Services\Odoo\OdooClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Pousse un prospect créé ou converti en client vers Odoo (service commercial uniquement).
 * Ne bloque jamais la création/conversion côté Fidelis en cas d'échec — le statut reste
 * "failed" et un réessai manuel reste possible.
 */
class SyncCompanyToOdoo implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct(public int $companyId, public string $event) {}

    public function handle(OdooClient $odoo): void
    {
        // withTrashed() : un archivage (soft delete) doit pouvoir être notifié à Odoo,
        // la fiche existe toujours en base au moment où le job s'exécute.
        $company = Company::withTrashed()->find($this->companyId);
        if ($company === null || $company->created_via_marketing) {
            return;
        }

        $result = $odoo->syncCompany($company, $this->event);

        if ($result === null) {
            $company->odoo_sync_status = 'failed';
            $company->save();

            return;
        }

        if (! empty($result['odoo_partner_id'])) {
            $company->odoo_partner_id = $result['odoo_partner_id'];
        }
        $company->odoo_sync_status = 'synced';
        $company->odoo_synced_at = now();
        $company->save();
    }
}
