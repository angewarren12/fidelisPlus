import { roleGuard } from './role.guard';
import { LOYALTY_READ_ROLES } from '../models/user-roles';

/** Fidélité : admin, marketing (écriture) ou commercial (lecture portefeuille). */
export const marketingRoleGuard = roleGuard(LOYALTY_READ_ROLES);
