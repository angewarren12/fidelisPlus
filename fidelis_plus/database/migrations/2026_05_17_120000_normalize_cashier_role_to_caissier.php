<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->where('role', 'cashier')->update(['role' => 'caissier']);
    }

    public function down(): void
    {
        DB::table('users')->where('role', 'caissier')->update(['role' => 'cashier']);
    }
};
