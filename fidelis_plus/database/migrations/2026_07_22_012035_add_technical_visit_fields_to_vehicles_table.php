<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->string('vehicle_type')->nullable()->after('model');
            $table->unsignedInteger('ptac_kg')->nullable()->after('vehicle_type');
            $table->unsignedSmallInteger('seats')->nullable()->after('ptac_kg');
            $table->date('registration_date')->nullable()->after('seats');
            $table->unsignedSmallInteger('fiscal_power_cv')->nullable()->after('registration_date');
            $table->decimal('ct_amount_ht', 12, 2)->nullable()->after('fiscal_power_cv');
            $table->decimal('ct_vat_amount', 12, 2)->nullable()->after('ct_amount_ht');
            $table->decimal('ct_amount_ttc', 12, 2)->nullable()->after('ct_vat_amount');
            $table->decimal('vignette_amount', 12, 2)->nullable()->after('ct_amount_ttc');
            $table->decimal('penalty_amount', 12, 2)->nullable()->after('vignette_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropColumn([
                'vehicle_type', 'ptac_kg', 'seats', 'registration_date', 'fiscal_power_cv',
                'ct_amount_ht', 'ct_vat_amount', 'ct_amount_ttc', 'vignette_amount', 'penalty_amount',
            ]);
        });
    }
};
