<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loyalty_members', function (Blueprint $table) {
            $table->string('status', 20)->default('validated')->after('source');
            $table->timestamp('requested_at')->nullable()->after('status');
            $table->string('rejection_reason', 255)->nullable()->after('requested_at');
            $table->string('sira_provisioning_status', 20)->default('not_applicable')->after('rejection_reason');
        });
    }

    public function down(): void
    {
        Schema::table('loyalty_members', function (Blueprint $table) {
            $table->dropColumn(['status', 'requested_at', 'rejection_reason', 'sira_provisioning_status']);
        });
    }
};
