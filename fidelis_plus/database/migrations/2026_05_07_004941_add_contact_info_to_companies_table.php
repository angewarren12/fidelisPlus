<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->string('email')->nullable()->after('name');
            $table->string('phone')->nullable()->after('email');
        });

        // Sync existing data
        \App\Models\Company::all()->each(function ($company) {
            $mainContact = $company->contacts()->where('is_main_contact', true)->first();
            if ($mainContact) {
                $company->update([
                    'email' => $mainContact->email,
                    'phone' => $mainContact->phone,
                ]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn(['email', 'phone']);
        });
    }
};
