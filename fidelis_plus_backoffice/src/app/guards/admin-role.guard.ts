import { roleGuard } from './role.guard';
import { ANY_ADMIN_ROLES, UserRoles } from '../models/user-roles';

/** Stations : partagées entre les deux services, tout profil admin y accède. */
export const adminRoleGuard = roleGuard(ANY_ADMIN_ROLES);

/** Paramètres généraux (mentions légales devis, tarifs) : service commercial uniquement. */
export const commercialAdminRoleGuard = roleGuard([UserRoles.ADMIN_COMMERCIAL, UserRoles.SUPER_ADMIN]);
