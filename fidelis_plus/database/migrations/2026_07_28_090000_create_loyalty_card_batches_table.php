<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loyalty_card_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('loyalty_card_template_id')->constrained('loyalty_card_templates')->cascadeOnDelete();
            $table->unsignedInteger('quantity');
            $table->string('card_number_from', 10)->nullable();
            $table->string('card_number_to', 10)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_card_batches');
    }
};
