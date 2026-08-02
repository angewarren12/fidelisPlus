<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loyalty_accounts', function (Blueprint $table) {
            // Type (particulier|entreprise) du visuel imprimé sur une carte vierge générée en
            // masse — permet de refuser l'association d'une carte au mauvais type de client.
            // Nullable : sans objet pour les comptes déjà associés/CRM.
            $table->string('blank_card_type', 20)->nullable()->after('holder_type');
        });
    }

    public function down(): void
    {
        Schema::table('loyalty_accounts', function (Blueprint $table) {
            $table->dropColumn('blank_card_type');
        });
    }
};
