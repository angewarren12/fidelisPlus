<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loyalty_accounts', function (Blueprint $table) {
            $table->integer('total_vehicles_referred')->default(0)->after('points_balance');
            $table->timestamp('milestone_apporteur_50_reached_at')->nullable();
            $table->timestamp('milestone_flotte_20_reached_at')->nullable();
            $table->timestamp('milestone_flotte_50_reached_at')->nullable();
            $table->timestamp('milestone_flotte_100_reached_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('loyalty_accounts', function (Blueprint $table) {
            $table->dropColumn([
                'total_vehicles_referred',
                'milestone_apporteur_50_reached_at',
                'milestone_flotte_20_reached_at',
                'milestone_flotte_50_reached_at',
                'milestone_flotte_100_reached_at'
            ]);
        });
    }
};
