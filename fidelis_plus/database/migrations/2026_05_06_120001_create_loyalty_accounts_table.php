<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ancienne version : création complète de loyalty_accounts (à éviter — table déjà créée par 2026_04_16_120010).
 * On ne fait qu’ajouter blocked_at si la base existait sans cette colonne.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('loyalty_accounts')) {
            return;
        }
        if (Schema::hasColumn('loyalty_accounts', 'blocked_at')) {
            return;
        }
        Schema::table('loyalty_accounts', function (Blueprint $table) {
            $table->timestamp('blocked_at')->nullable();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('loyalty_accounts') || ! Schema::hasColumn('loyalty_accounts', 'blocked_at')) {
            return;
        }
        Schema::table('loyalty_accounts', function (Blueprint $table) {
            $table->dropColumn('blocked_at');
        });
    }
};
