<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Véhicules déclarés par le client dans l'app SIRA, synchronisés vers Fidelis
 * pour que la caissière puisse les proposer (immatriculation) au scan en station,
 * au lieu de les ressaisir à la main.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loyalty_member_vehicles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('loyalty_member_id')->constrained('loyalty_members')->cascadeOnDelete();
            $table->string('sira_vehicle_id', 100)->nullable();
            $table->string('registration', 30);
            $table->string('brand', 60)->nullable();
            $table->string('model', 60)->nullable();
            $table->string('color', 40)->nullable();
            $table->timestamps();

            $table->unique(['loyalty_member_id', 'registration']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_member_vehicles');
    }
};
