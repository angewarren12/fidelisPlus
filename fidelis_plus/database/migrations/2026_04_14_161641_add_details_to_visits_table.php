<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('visits', function (Blueprint $table) {
            $table->date('visit_date')->nullable()->after('vehicle_id');
            $table->text('notes')->nullable()->after('diagnostics_summary');
            $table->string('status')->default('complete')->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('visits', function (Blueprint $table) {
            $table->dropColumn(['visit_date', 'notes', 'status']);
        });
    }
};
