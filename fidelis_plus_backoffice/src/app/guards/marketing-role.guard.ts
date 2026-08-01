import { roleGuard } from './role.guard';
import { LOYALTY_READ_ROLES } from '../models/user-roles';

/** Fidélité : réservé à admin et marketing. */
export const marketingRoleGuard = roleGuard(LOYALTY_READ_ROLES);
