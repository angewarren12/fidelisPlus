<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ajoute sira_status_changed_at à loyalty_members.
 * Ce champ trace la date à laquelle SIRA a basculé le statut du compte
 * (pending → active ou rejected), telle que renvoyée par GET /users/{id}.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loyalty_members', function (Blueprint $table) {
            $table->timestamp('sira_status_changed_at')->nullable()->after('sira_provisioning_status');
        });
    }

    public function down(): void
    {
        Schema::table('loyalty_members', function (Blueprint $table) {
            $table->dropColumn('sira_status_changed_at');
        });
    }
};
