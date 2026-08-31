<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('odoo_sync_logs', function (Blueprint $table) {
            $table->id();
            $table->string('resource', 50); // companies, vehicles, quotes
            $table->string('status', 20);   // success, partial, failed, skipped
            $table->integer('records_fetched')->default(0);
            $table->integer('records_synced')->default(0);
            $table->integer('duration_ms')->default(0);
            $table->text('error_message')->nullable();
            $table->dateTime('synced_from')->nullable();
            $table->dateTime('synced_to')->nullable();
            $table->timestamps();

            $table->index(['resource', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('odoo_sync_logs');
    }
};
