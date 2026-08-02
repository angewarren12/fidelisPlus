<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loyalty_card_batches', function (Blueprint $table) {
            $table->string('status', 20)->default('generated')->after('card_number_to');
            $table->timestamp('printed_at')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('loyalty_card_batches', function (Blueprint $table) {
            $table->dropColumn(['status', 'printed_at']);
        });
    }
};
