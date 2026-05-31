<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->json('data')->nullable()->after('type');
            $table->string('action')->nullable()->after('data'); // vehicle_detail, quote_detail, etc.
            $table->string('priority')->default('normal')->after('action'); // low|normal|high
            $table->string('channel')->default('both')->after('priority'); // in_app|push|both

            $table->index(['user_id', 'read_at', 'created_at'], 'notifications_user_read_created_idx');
            $table->index(['user_id', 'created_at'], 'notifications_user_created_idx');
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex('notifications_user_read_created_idx');
            $table->dropIndex('notifications_user_created_idx');
            $table->dropColumn(['data', 'action', 'priority', 'channel']);
        });
    }
};

