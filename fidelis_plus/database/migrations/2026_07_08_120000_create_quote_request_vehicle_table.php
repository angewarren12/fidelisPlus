<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quote_request_vehicle', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quote_request_id')->constrained('quote_requests')->cascadeOnDelete();
            $table->foreignId('vehicle_id')->constrained('vehicles')->cascadeOnDelete();
            $table->timestamps();
        });

        // Migrer les données existantes (vehicle_id de la table principale vers la table pivot)
        $existing = DB::table('quote_requests')
            ->whereNotNull('vehicle_id')
            ->select('id', 'vehicle_id')
            ->get();

        foreach ($existing as $row) {
            DB::table('quote_request_vehicle')->insert([
                'quote_request_id' => $row->id,
                'vehicle_id'       => $row->vehicle_id,
                'created_at'       => now(),
                'updated_at'       => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('quote_request_vehicle');
    }
};
