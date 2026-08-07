<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Traçabilité de la synchronisation Fidelis <-> Odoo pour les véhicules de flotte.
 * Même patron que pour companies/quotes. Voir app/Services/Odoo/OdooClient.php,
 * app/Jobs/SyncVehicleToOdoo.php.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->string('odoo_vehicle_id')->nullable()->after('status');
            $table->string('odoo_sync_status')->nullable()->after('odoo_vehicle_id');
            $table->timestamp('odoo_synced_at')->nullable()->after('odoo_sync_status');
            $table->boolean('created_via_odoo')->default(false)->after('odoo_synced_at');
        });
    }

    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropColumn(['odoo_vehicle_id', 'odoo_sync_status', 'odoo_synced_at', 'created_via_odoo']);
        });
    }
};
