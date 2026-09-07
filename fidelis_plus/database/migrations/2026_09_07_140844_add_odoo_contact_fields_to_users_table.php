<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ajout des colonnes nécessaires à la gestion des contacts enfants Odoo v0.0.20.
 *
 * function          : poste / fonction du contact (champ Odoo natif sur res.partner).
 * odoo_external_ref : external_ref Odoo du contact enfant (idempotence lors de la
 *                     synchronisation Pull via GET /partners/{id} → contacts:[...]).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Poste / fonction (ex: "Directeur Commercial", "Responsable Achats").
            $table->string('function')->nullable()->after('phone');

            // Référence externe Odoo du contact (ex: "fidelis-contact-42").
            // Indexé pour accélérer la résolution d'idempotence dans syncChildContact().
            $table->string('odoo_external_ref')->nullable()->index()->after('function');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['odoo_external_ref']);
            $table->dropColumn(['function', 'odoo_external_ref']);
        });
    }
};
