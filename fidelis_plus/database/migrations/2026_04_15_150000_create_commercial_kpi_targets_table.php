<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commercial_kpi_targets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('commercial_id')->constrained('users')->cascadeOnDelete();
            $table->enum('period_type', ['month', 'quarter', 'year']);
            $table->unsignedSmallInteger('period_year');
            $table->unsignedTinyInteger('period_month')->nullable();   // 1-12 si month
            $table->unsignedTinyInteger('period_quarter')->nullable(); // 1-4 si quarter

            $table->unsignedInteger('target_clients')->default(0);
            $table->decimal('target_revenue_signed', 12, 2)->default(0);

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['commercial_id', 'period_type', 'period_year', 'period_month', 'period_quarter'], 'kpi_targets_unique_period');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commercial_kpi_targets');
    }
};

