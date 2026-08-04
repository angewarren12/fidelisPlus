<?php

namespace App\Support;

/**
 * Rôles utilisateur (colonne users.role).
 */
final class UserRoles
{
    /** @deprecated remplacé par un rôle admin par service (voir migration add_service_admin_roles) — ne plus attribuer à de nouveaux comptes, conservé pour compat historique. */
    public const ADMIN = 'admin';

    public const COMMERCIAL = 'commercial';

    public const CLIENT = 'client';

    public const MARKETING = 'marketing';

    public const CAISSIER = 'caissier';

    /** Administrateur du service commercial : CRM, devis, équipe commerciale, tarifs, stations. */
    public const ADMIN_COMMERCIAL = 'admin_commercial';

    /** Administrateur du service marketing : fidélité, Studio Carte, rappels visite technique, stations. */
    public const ADMIN_MARKETING = 'admin_marketing';

    /** Accès complet aux deux services (remplace l'ancien rôle unique "admin"). */
    public const SUPER_ADMIN = 'super_admin';

    /** @return list<string> */
    public static function internalStaff(): array
    {
        return [
            self::COMMERCIAL,
            self::MARKETING,
            self::CAISSIER,
            self::ADMIN_COMMERCIAL,
            self::ADMIN_MARKETING,
            self::SUPER_ADMIN,
        ];
    }

    /** @return list<string> */
    public static function backoffice(): array
    {
        return [
            self::COMMERCIAL,
            self::MARKETING,
            self::ADMIN_COMMERCIAL,
            self::ADMIN_MARKETING,
            self::SUPER_ADMIN,
        ];
    }

    /** Périmètre CRM/commercial (équipe, prospects, clients, devis, flotte). */
    public static function crm(): array
    {
        return [self::COMMERCIAL, self::ADMIN_COMMERCIAL, self::SUPER_ADMIN];
    }

    /** Périmètre fidélité/marketing. */
    public static function marketing(): array
    {
        return [self::MARKETING, self::ADMIN_MARKETING, self::SUPER_ADMIN];
    }

    /** Tout rôle avec des droits d'administration, quel que soit le service. */
    public static function anyAdmin(): array
    {
        return [self::ADMIN_COMMERCIAL, self::ADMIN_MARKETING, self::SUPER_ADMIN];
    }
}
