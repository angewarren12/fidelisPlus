<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loyalty_pos_scan_events', function (Blueprint $table) {
            $table->string('vehicle_registration', 30)->nullable()->after('device_id');
            $table->string('vehicle_brand', 60)->nullable()->after('vehicle_registration');
            $table->string('vehicle_color', 40)->nullable()->after('vehicle_brand');
            $table->string('visit_type', 40)->default('visite_technique')->after('vehicle_color');
        });
    }

    public function down(): void
    {
        Schema::table('loyalty_pos_scan_events', function (Blueprint $table) {
            $table->dropColumn(['vehicle_registration', 'vehicle_brand', 'vehicle_color', 'visit_type']);
        });
    }
};
