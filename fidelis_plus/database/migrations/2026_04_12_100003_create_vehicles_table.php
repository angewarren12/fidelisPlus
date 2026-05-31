<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->string('license_plate')->unique();
            $table->string('brand');
            $table->string('model');
            $table->integer('year')->nullable();
            $table->string('fuel_type')->nullable();
            $table->string('registration_doc_url')->nullable();
            $table->date('last_visit_date')->nullable();
            $table->enum('status', ['a_jour', 'bientot', 'en_retard'])->default('a_jour');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicles');
    }
};
