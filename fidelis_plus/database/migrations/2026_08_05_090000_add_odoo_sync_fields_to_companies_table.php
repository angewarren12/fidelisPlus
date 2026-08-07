<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Traçabilité de la synchronisation sortante Fidelis -> Odoo (service commercial).
 * Voir app/Services/Odoo/OdooClient.php et app/Jobs/SyncCompanyToOdoo.php.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->string('odoo_partner_id')->nullable()->after('referrer_company_id');
            $table->string('odoo_sync_status')->nullable()->after('odoo_partner_id');
            $table->timestamp('odoo_synced_at')->nullable()->after('odoo_sync_status');
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn(['odoo_partner_id', 'odoo_sync_status', 'odoo_synced_at']);
        });
    }
};
