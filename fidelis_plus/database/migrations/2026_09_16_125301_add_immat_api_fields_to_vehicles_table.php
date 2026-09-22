<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    /**
     * Ajoute les champs complementaires issus de l'API d'immatriculation.
     * Alimentes automatiquement par ImmatClient::getVisite() (lookup creation
     * ou refresh manuel/cron sur un vehicule existant).
     */
    public function up(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            // Numero de serie / chassis (VIN)
            $table->string('numero_serie', 50)->nullable()->after('model');

            // Couleur declaree a la registration
            $table->string('couleur', 60)->nullable()->after('numero_serie');

            // Numero du certificat de visite technique en cours
            $table->string('numero_certificat_visite', 30)->nullable()->after('couleur');

            // Timestamp de la derniere synchro avec l'API immatriculation
            $table->timestamp('immat_api_synced_at')->nullable()->after('odoo_vehicle_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropColumn([
                'numero_serie',
                'couleur',
                'numero_certificat_visite',
                'immat_api_synced_at',
            ]);
        });
    }
};
