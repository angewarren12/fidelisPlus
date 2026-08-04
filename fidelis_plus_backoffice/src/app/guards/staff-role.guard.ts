import { roleGuard } from './role.guard';
import { UserRoles } from '../models/user-roles';

/** Gestion d'équipe : chaque admin gère son service, commercial peut inviter des pairs,
 *  super_admin voit tout. */
export const staffRoleGuard = roleGuard([
  UserRoles.COMMERCIAL,
  UserRoles.ADMIN_COMMERCIAL,
  UserRoles.ADMIN_MARKETING,
  UserRoles.SUPER_ADMIN,
]);
