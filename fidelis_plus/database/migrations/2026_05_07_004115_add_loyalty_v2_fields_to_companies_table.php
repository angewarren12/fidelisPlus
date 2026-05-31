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
        Schema::table('companies', function (Blueprint $table) {
            $table->foreignId('referrer_company_id')->nullable()->constrained('companies')->nullOnDelete();
            $table->timestamp('bonus_fleet_awarded_at')->nullable();
            $table->timestamp('bonus_profile_completed_awarded_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropForeign(['referrer_company_id']);
            $table->dropColumn([
                'referrer_company_id',
                'bonus_fleet_awarded_at',
                'bonus_profile_completed_awarded_at',
            ]);
        });
    }
};
