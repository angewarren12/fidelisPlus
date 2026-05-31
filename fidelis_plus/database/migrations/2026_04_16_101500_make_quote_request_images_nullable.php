<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quote_requests', function (Blueprint $table) {
            $table->string('registration_image')->nullable()->change();
            $table->string('vignette_image')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('quote_requests', function (Blueprint $table) {
            $table->string('registration_image')->nullable(false)->change();
            $table->string('vignette_image')->nullable(false)->change();
        });
    }
};

