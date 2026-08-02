<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE vehicles MODIFY COLUMN status ENUM('jamais_controle', 'a_jour', 'bientot', 'en_retard') NOT NULL DEFAULT 'jamais_controle'");

        // Backfill : les véhicules qui n'ont jamais eu de contrôle technique (aucune date
        // connue) étaient jusqu'ici étiquetés « a_jour » par défaut, ce qui est trompeur.
        DB::statement("UPDATE vehicles SET status = 'jamais_controle' WHERE next_ct_date IS NULL AND last_visit_date IS NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("UPDATE vehicles SET status = 'a_jour' WHERE status = 'jamais_controle'");
        DB::statement("ALTER TABLE vehicles MODIFY COLUMN status ENUM('a_jour', 'bientot', 'en_retard') NOT NULL DEFAULT 'a_jour'");
    }
};
