import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CRM_ROLES, UserRoles } from '../models/user-roles';

/** CRM ventes : admin et commercial uniquement. */
export const crmRoleGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const role = auth.getCurrentUser()?.role;
  if (role && CRM_ROLES.includes(role as (typeof CRM_ROLES)[number])) {
    return true;
  }
  if (role === UserRoles.MARKETING || role === UserRoles.ADMIN_MARKETING) {
    router.navigate(['/marketing/fidelite']);
  } else if (role === UserRoles.CLIENT) {
    router.navigate(['/client/dashboard']);
  } else {
    router.navigate(['/login']);
  }
  return false;
};
