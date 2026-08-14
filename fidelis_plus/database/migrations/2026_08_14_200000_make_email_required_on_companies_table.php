<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Rendre le champ email obligatoire (NOT NULL) pour les prospects
     * et les clients, afin de faciliter la synchronisation avec Odoo.
     */
    public function up(): void
    {
        // Étape 1 : Générer des emails placeholder pour les fiches sans email
        DB::table('companies')
            ->whereNull('email')
            ->update([
                'email' => DB::raw("CONCAT('prospect-', id, '@fidelis.local')")
            ]);

        // Étape 2 : Modifier la colonne pour la rendre NOT NULL
        Schema::table('companies', function (Blueprint $table) {
            $table->string('email')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->string('email')->nullable()->change();
        });
    }
};
