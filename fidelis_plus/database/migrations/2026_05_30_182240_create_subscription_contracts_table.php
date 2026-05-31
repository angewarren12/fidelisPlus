<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('subscription_contracts')) {
            Schema::create('subscription_contracts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
                $table->string('subscriber_name');
                $table->string('address_zone')->nullable();
                $table->string('card_number')->nullable();
                $table->date('subscription_date');
                $table->date('start_date');
                $table->date('end_date');
                $table->date('annual_evaluation_date');
                $table->integer('min_vehicles_daily')->default(10);
                $table->integer('min_vehicles_monthly')->default(50);
                $table->string('reward_frequency')->default('monthly'); // 'monthly', 'quarterly'
                $table->string('status')->default('signed'); // 'draft', 'signed', 'expired'
                $table->timestamp('signed_at')->nullable();
                $table->timestamps();
            });
        }

        // Migration des anciens types d'entreprise
        DB::table('companies')->where('company_type', 'Grande Flotte')->update(['company_type' => 'flotte']);
        DB::table('companies')->where('company_type', 'PME')->update(['company_type' => 'garage']);
        DB::table('companies')->where('company_type', 'TPE')->update(['company_type' => 'apporteur']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscription_contracts');

        // Note: On ne revient pas sur les types d'entreprise dans le down car ce serait de la perte de précision métier
    }
};
