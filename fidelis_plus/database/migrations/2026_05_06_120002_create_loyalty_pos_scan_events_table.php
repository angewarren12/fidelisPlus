<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loyalty_pos_scan_events', function (Blueprint $table) {
            $table->id();
            $table->string('idempotency_key', 80)->unique();
            $table->string('qr_jti', 80)->unique();
            $table->foreignId('loyalty_account_id')->constrained('loyalty_accounts')->cascadeOnDelete();
            $table->foreignId('cashier_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('station_id')->constrained('stations')->cascadeOnDelete();
            $table->unsignedInteger('points_credited');
            $table->string('payload_hash', 64)->nullable();
            $table->string('device_id', 128)->nullable();
            $table->timestamps();

            $table->index(['loyalty_account_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_pos_scan_events');
    }
};
