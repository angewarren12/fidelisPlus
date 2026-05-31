<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['prospect', 'client', 'inactif'])->default('prospect');
            $table->enum('category', ['entreprise', 'particulier'])->default('entreprise');
            $table->string('name');
            $table->string('siret')->nullable()->unique();
            $table->text('address')->nullable();
            $table->string('sector')->nullable();
            $table->string('kanban_stage')->default('nouveau_lead');
            $table->enum('temperature', ['froid', 'tiede', 'chaud'])->nullable();
            $table->decimal('account_balance', 10, 2)->default(0);
            $table->timestamp('last_contact_date')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('companies');
    }
};
