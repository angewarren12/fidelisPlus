<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loyalty_accounts', function (Blueprint $table) {
            $table->string('card_number', 10)->nullable()->unique()->after('holder_key');
            $table->string('subscriber_name', 120)->nullable()->after('card_number');
            $table->string('trade_register', 80)->nullable()->after('subscriber_name');
            $table->string('subscriber_function', 80)->nullable()->after('trade_register');
        });

        // Remplir les comptes existants avec un numéro de carte séquentiel
        $accounts = DB::table('loyalty_accounts')->orderBy('id')->pluck('id');
        foreach ($accounts as $idx => $id) {
            DB::table('loyalty_accounts')
                ->where('id', $id)
                ->update(['card_number' => str_pad($idx + 1, 4, '0', STR_PAD_LEFT)]);
        }
    }

    public function down(): void
    {
        Schema::table('loyalty_accounts', function (Blueprint $table) {
            $table->dropColumn(['card_number', 'subscriber_name', 'trade_register', 'subscriber_function']);
        });
    }
};
