<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ajoute les champs de synchronisation commerciale Odoo sur la table companies :
 *
 *   odoo_client_code        → le code client attribué par Odoo lors du promote-to-customer
 *                             (ex : "CLT-00001") — champ customer_code dans l'API Odoo.
 *   odoo_is_mayelia_customer→ booléen Odoo indiquant que le partenaire est un "client
 *                             officiel Mayelia" (is_mayelia_customer dans l'API Odoo).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            // Code client Odoo (ex: CLT-00001), attribué par Mayelia lors de la promotion
            $table->string('odoo_client_code', 50)->nullable()->after('odoo_partner_id');

            // Flag "client Mayelia officiel" renvoyé par l'API Odoo
            $table->boolean('odoo_is_mayelia_customer')->default(false)->after('odoo_client_code');
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn(['odoo_client_code', 'odoo_is_mayelia_customer']);
        });
    }
};
