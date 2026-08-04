/** Rôles alignés sur la colonne users.role (API Laravel). */
export const UserRoles = {
  /** @deprecated remplacé par un rôle admin par service — conservé pour compat historique. */
  ADMIN: 'admin',
  COMMERCIAL: 'commercial',
  CLIENT: 'client',
  MARKETING: 'marketing',
  CAISSIER: 'caissier',
  /** Administrateur du service commercial : CRM, devis, équipe commerciale, tarifs, stations. */
  ADMIN_COMMERCIAL: 'admin_commercial',
  /** Administrateur du service marketing : fidélité, Studio Carte, rappels visite technique, stations. */
  ADMIN_MARKETING: 'admin_marketing',
  /** Accès complet aux deux services (remplace l'ancien rôle unique "admin"). */
  SUPER_ADMIN: 'super_admin',
} as const;

export type UserRole =
  | typeof UserRoles.ADMIN
  | typeof UserRoles.COMMERCIAL
  | typeof UserRoles.CLIENT
  | typeof UserRoles.MARKETING
  | typeof UserRoles.CAISSIER
  | typeof UserRoles.ADMIN_COMMERCIAL
  | typeof UserRoles.ADMIN_MARKETING
  | typeof UserRoles.SUPER_ADMIN;

/** Tout rôle avec des droits d'administration, quel que soit le service. */
export const ANY_ADMIN_ROLES: UserRole[] = [
  UserRoles.ADMIN_COMMERCIAL,
  UserRoles.ADMIN_MARKETING,
  UserRoles.SUPER_ADMIN,
];

export const BACKOFFICE_ROLES: UserRole[] = [
  UserRoles.COMMERCIAL,
  UserRoles.MARKETING,
  UserRoles.CLIENT,
  ...ANY_ADMIN_ROLES,
];

/** CRM ventes (équipe, prospects, clients, devis, flotte) : service commercial. */
export const CRM_ROLES: UserRole[] = [UserRoles.COMMERCIAL, UserRoles.ADMIN_COMMERCIAL, UserRoles.SUPER_ADMIN];

/** Fidélité (comptes, catalogue, analytics) : réservé au service marketing. */
export const LOYALTY_READ_ROLES: UserRole[] = [UserRoles.MARKETING, UserRoles.ADMIN_MARKETING, UserRoles.SUPER_ADMIN];

/** Rôle labels pour affichage (badges, sélecteurs). */
export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  commercial: 'Commercial / Vendeur',
  marketing: 'Marketing',
  caissier: 'Caissière station',
  admin_commercial: 'Admin — Commercial',
  admin_marketing: 'Admin — Marketing',
  super_admin: 'Super administrateur',
  client: 'Client',
};
