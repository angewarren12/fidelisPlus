<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Modèles visuels de carte fidélité (Studio Carte) : un visuel de fond + un positionnement
 * (en %) du QR et des champs texte, pour générer/prévisualiser/imprimer la carte physique
 * ou virtuelle d'un client.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loyalty_card_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type', 20); // particulier | entreprise
            $table->string('background_path');
            $table->json('layout_json'); // positions/couleurs (%) des éléments (QR, nom, carte n°...)
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_card_templates');
    }
};
