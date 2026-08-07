<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Traçabilité de la synchronisation sortante Fidelis -> Odoo pour les devis
 * (création + acceptation / bon de commande). Voir app/Services/Odoo/OdooClient.php
 * et app/Jobs/SyncQuoteToOdoo.php.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            $table->string('odoo_quote_id')->nullable()->after('bon_de_commande_url');
            $table->string('odoo_sync_status')->nullable()->after('odoo_quote_id');
            $table->timestamp('odoo_synced_at')->nullable()->after('odoo_sync_status');
        });
    }

    public function down(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            $table->dropColumn(['odoo_quote_id', 'odoo_sync_status', 'odoo_synced_at']);
        });
    }
};
