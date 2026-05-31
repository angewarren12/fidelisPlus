/** Rôles alignés sur la colonne users.role (API Laravel). */
export const UserRoles = {
  ADMIN: 'admin',
  COMMERCIAL: 'commercial',
  CLIENT: 'client',
  MARKETING: 'marketing',
  CAISSIER: 'caissier',
} as const;

export type UserRole =
  | typeof UserRoles.ADMIN
  | typeof UserRoles.COMMERCIAL
  | typeof UserRoles.CLIENT
  | typeof UserRoles.MARKETING
  | typeof UserRoles.CAISSIER;

export const BACKOFFICE_ROLES: UserRole[] = [
  UserRoles.ADMIN,
  UserRoles.COMMERCIAL,
  UserRoles.MARKETING,
  UserRoles.CLIENT,
];

export const CRM_ROLES: UserRole[] = [UserRoles.ADMIN, UserRoles.COMMERCIAL];

export const LOYALTY_READ_ROLES: UserRole[] = [
  UserRoles.ADMIN,
  UserRoles.MARKETING,
  UserRoles.COMMERCIAL,
];
