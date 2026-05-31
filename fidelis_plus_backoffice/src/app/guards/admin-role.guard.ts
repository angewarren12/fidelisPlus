import { roleGuard } from './role.guard';
import { UserRoles } from '../models/user-roles';

/** Administration (stations, etc.) : admin uniquement. */
export const adminRoleGuard = roleGuard([UserRoles.ADMIN]);
