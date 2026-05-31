<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            // CHARGE CLIENT (Relation avec un utilisateur de rôle commercial)
            $table->foreignId('commercial_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
            
            // Statut ACTIF/INACTIF
            $table->boolean('is_active')->default(true)->after('temperature');
            
            // OBSERVATIONS
            $table->text('observations')->nullable()->after('address');
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropConstrainedForeignId('commercial_id');
            $table->dropColumn(['is_active', 'observations']);
        });
    }
};
