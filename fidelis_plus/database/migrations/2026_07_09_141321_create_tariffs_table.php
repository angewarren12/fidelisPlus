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
        Schema::create('tariffs', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // 'visite_technique', 'vignette'
            $table->string('code')->unique(); // 'auto_2_4cv'
            $table->string('name'); // 'Auto (2-4 CV)'
            $table->json('prices'); // {"recent": 19000, "medium": 14250, "old": 13500}
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tariffs');
    }
};
