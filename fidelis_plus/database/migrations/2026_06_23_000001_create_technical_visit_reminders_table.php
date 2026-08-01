<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('technical_visit_reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('station_id')->nullable()->constrained('stations')->nullOnDelete();
            $table->string('full_name', 160);
            $table->string('contact', 30);
            $table->enum('alert_period', ['2_semaines', '1_semaine', 'veille'])->default('1_semaine');
            $table->enum('contact_method', ['appel', 'sms', 'whatsapp'])->default('appel');
            $table->boolean('consent_accepted')->default(false);
            $table->enum('status', ['pending', 'contacted', 'done'])->default('pending');
            $table->text('notes')->nullable();
            $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'created_at']);
        });

        Schema::create('technical_visit_reminder_vehicles', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('technical_visit_reminder_id');
            $table->string('registration', 30);
            $table->date('visit_expiration_date');
            $table->timestamps();

            $table->foreign('technical_visit_reminder_id', 'tvr_vehicles_reminder_fk')
                ->references('id')->on('technical_visit_reminders')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('technical_visit_reminder_vehicles');
        Schema::dropIfExists('technical_visit_reminders');
    }
};
