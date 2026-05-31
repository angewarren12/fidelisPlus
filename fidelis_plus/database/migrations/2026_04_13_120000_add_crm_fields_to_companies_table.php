<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->string('city')->nullable()->after('address');
            $table->string('zip_code')->nullable()->after('city');
            $table->string('lead_source')->nullable()->after('sector');
            $table->decimal('estimated_potential', 12, 2)->default(0)->after('lead_source');
            $table->date('estimated_decision_date')->nullable()->after('estimated_potential');
            $table->text('needs')->nullable()->after('estimated_decision_date');
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn([
                'city', 
                'zip_code', 
                'lead_source', 
                'estimated_potential', 
                'estimated_decision_date', 
                'needs'
            ]);
        });
    }
};
