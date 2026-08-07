<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Curseur de synchronisation par type de donnée pour le cron de pull Odoo -> Fidelis
 * (voir app/Console/Commands/SyncFromOdoo.php). `resource` vaut 'companies', 'vehicles'
 * ou 'quotes' ; `last_synced_at` retient la date de la dernière synchronisation réussie
 * pour ce type, transmise en paramètre `since` à l'appel suivant.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('odoo_sync_cursors', function (Blueprint $table) {
            $table->id();
            $table->string('resource')->unique();
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('odoo_sync_cursors');
    }
};
