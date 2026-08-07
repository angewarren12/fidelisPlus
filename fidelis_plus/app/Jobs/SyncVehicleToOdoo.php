<?php

namespace App\Jobs;

use App\Models\Vehicle;
use App\Services\Odoo\OdooClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Pousse un véhicule de flotte créé, modifié ou archivé vers Odoo (service commercial
 * uniquement). Ne bloque jamais l'action côté Fidelis en cas d'échec — le statut reste
 * "failed" et un réessai manuel reste possible.
 */
class SyncVehicleToOdoo implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct(public int $vehicleId, public string $event) {}

    public function handle(OdooClient $odoo): void
    {
        $vehicle = Vehicle::with('company')->find($this->vehicleId);
        if ($vehicle === null || $vehicle->company?->created_via_marketing) {
            return;
        }

        $result = $odoo->syncVehicle($vehicle, $this->event);

        if ($result === null) {
            $vehicle->odoo_sync_status = 'failed';
            $vehicle->save();

            return;
        }

        if (! empty($result['odoo_vehicle_id'])) {
            $vehicle->odoo_vehicle_id = $result['odoo_vehicle_id'];
        }
        $vehicle->odoo_sync_status = 'synced';
        $vehicle->odoo_synced_at = now();
        $vehicle->save();
    }
}
