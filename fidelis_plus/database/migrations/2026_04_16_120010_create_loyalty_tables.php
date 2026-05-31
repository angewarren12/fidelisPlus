<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('loyalty_accounts')) {
            Schema::create('loyalty_accounts', function (Blueprint $table) {
                $table->id();
                $table->string('holder_key', 64)->unique();
                $table->string('holder_type', 32);
                $table->foreignId('company_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
                $table->uuid('public_uuid')->unique();
                $table->unsignedInteger('points_balance')->default(0);
                $table->timestamp('blocked_at')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('loyalty_ledger_entries')) {
            Schema::create('loyalty_ledger_entries', function (Blueprint $table) {
                $table->id();
                $table->foreignId('loyalty_account_id')->constrained('loyalty_accounts')->cascadeOnDelete();
                $table->string('type', 24);
                $table->integer('delta_points');
                $table->unsignedInteger('balance_after');
                $table->string('source', 64)->default('unknown');
                $table->string('idempotency_key', 80)->nullable()->unique();
                $table->json('meta')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->index(['loyalty_account_id', 'created_at']);
            });
        }

        if (! Schema::hasTable('loyalty_rewards')) {
            Schema::create('loyalty_rewards', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->text('description')->nullable();
                $table->unsignedInteger('points_cost');
                $table->json('client_segments')->nullable();
                $table->boolean('is_active')->default(true);
                $table->unsignedSmallInteger('sort_order')->default(0);
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_rewards');
        Schema::dropIfExists('loyalty_ledger_entries');
        Schema::dropIfExists('loyalty_accounts');
    }
};
