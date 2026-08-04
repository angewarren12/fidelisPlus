<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            $table->foreignId('payment_term_id')->nullable()->after('valid_until')->constrained('payment_terms')->nullOnDelete();
            $table->string('currency', 3)->default('XOF')->after('total_amount');
        });
    }

    public function down(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('payment_term_id');
            $table->dropColumn('currency');
        });
    }
};
