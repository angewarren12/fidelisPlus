import { roleGuard } from './role.guard';
import { CRM_ROLES } from '../models/user-roles';

/** Gestion d'équipe : admin et commercial. */
export const staffRoleGuard = roleGuard(CRM_ROLES);
