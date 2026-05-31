<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->date('next_ct_date')->nullable()->after('last_visit_date');
            $table->date('next_pollution_date')->nullable()->after('next_ct_date');
        });
    }

    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropColumn(['next_ct_date', 'next_pollution_date']);
        });
    }
};
