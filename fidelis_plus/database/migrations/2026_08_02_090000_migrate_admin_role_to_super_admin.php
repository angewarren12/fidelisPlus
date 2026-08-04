<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Le rôle unique "admin" est remplacé par trois rôles distincts (super_admin,
 * admin_commercial, admin_marketing) — voir App\Support\UserRoles. Les comptes
 * existants deviennent super_admin pour préserver leur accès complet ; c'est ensuite
 * à un super_admin de les réassigner à un service précis si besoin (Équipe).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->where('role', 'admin')->update(['role' => 'super_admin']);
    }

    public function down(): void
    {
        DB::table('users')->where('role', 'super_admin')->update(['role' => 'admin']);
    }
};
