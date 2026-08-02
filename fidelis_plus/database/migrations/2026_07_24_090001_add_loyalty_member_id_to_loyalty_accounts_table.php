<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loyalty_accounts', function (Blueprint $table) {
            $table->foreignId('loyalty_member_id')->nullable()->after('user_id')
                ->constrained('loyalty_members')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('loyalty_accounts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('loyalty_member_id');
        });
    }
};
