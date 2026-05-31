<?php

namespace App\Support;

/**
 * Rôles utilisateur (colonne users.role).
 */
final class UserRoles
{
    public const ADMIN = 'admin';

    public const COMMERCIAL = 'commercial';

    public const CLIENT = 'client';

    public const MARKETING = 'marketing';

    public const CAISSIER = 'caissier';

    /** @return list<string> */
    public static function internalStaff(): array
    {
        return [
            self::COMMERCIAL,
            self::ADMIN,
            self::MARKETING,
            self::CAISSIER,
        ];
    }

    /** @return list<string> */
    public static function backoffice(): array
    {
        return [
            self::ADMIN,
            self::COMMERCIAL,
            self::MARKETING,
        ];
    }

    /** @return list<string> */
    public static function crm(): array
    {
        return [self::ADMIN, self::COMMERCIAL];
    }
}
