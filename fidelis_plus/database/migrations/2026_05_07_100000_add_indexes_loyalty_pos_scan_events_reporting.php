<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('loyalty_pos_scan_events')) {
            return;
        }
        Schema::table('loyalty_pos_scan_events', function (Blueprint $table) {
            $table->index('created_at', 'loyalty_pos_scan_events_created_at_index');
            $table->index(['station_id', 'created_at'], 'loyalty_pos_scan_events_station_created_index');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('loyalty_pos_scan_events')) {
            return;
        }
        Schema::table('loyalty_pos_scan_events', function (Blueprint $table) {
            $table->dropIndex('loyalty_pos_scan_events_station_created_index');
            $table->dropIndex('loyalty_pos_scan_events_created_at_index');
        });
    }
};
