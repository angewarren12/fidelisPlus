<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Permet la valeur `caissier` sans dépendre d'un ALTER ENUM spécifique au SGBD (SQLite tests inclus).
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 32)->default('client')->change();
        });
    }

    public function down(): void
    {
        // Rollback SGBD-spécifique évité (SQLite / MySQL) ; la colonne reste string.
    }
};
