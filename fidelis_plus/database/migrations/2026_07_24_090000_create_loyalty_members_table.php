<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Clients fidélité propres au marketing : indépendants du CRM commercial
 * (pas de ligne `companies`/`users` créée pour eux). Alimenté soit au guichet,
 * soit par l'app SIRA via l'intégration API (chantier D).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loyalty_members', function (Blueprint $table) {
            $table->id();
            $table->string('type', 20); // particulier | entreprise
            $table->string('nom')->nullable();
            $table->string('prenom')->nullable();
            $table->string('nom_entreprise')->nullable();
            $table->string('registre_commerce', 80)->nullable();
            $table->string('nom_abonne')->nullable();
            $table->string('fonction', 80)->nullable();
            $table->string('contact', 40);
            $table->string('email')->nullable();
            $table->string('sira_client_id', 100)->nullable()->unique();
            $table->string('source', 20)->default('guichet'); // sira | guichet | marketing
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_members');
    }
};
