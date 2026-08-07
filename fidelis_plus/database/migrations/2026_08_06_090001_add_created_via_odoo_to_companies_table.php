<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Distingue les prospects/clients créés depuis FidelisPlus de ceux reçus depuis
 * l'ERP Odoo (webhook entrant, voir OdooIntegrationController::companySync).
 * Même logique que `created_via_marketing` déjà en place. Affiché comme colonne
 * "Provenance" dans les listes Prospection et Clients & Contacts côté frontend.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->boolean('created_via_odoo')->default(false)->after('created_via_marketing');
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn('created_via_odoo');
        });
    }
};
