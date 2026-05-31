import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { BACKOFFICE_ROLES } from '../models/user-roles';

/** Bloque client et caissier (apps dédiées). */
export const backofficeAccessGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const role = auth.getCurrentUser()?.role;
  if (role && BACKOFFICE_ROLES.includes(role as (typeof BACKOFFICE_ROLES)[number])) {
    return true;
  }
  auth.logout();
  router.navigate(['/login'], { queryParams: { forbidden: '1' } });
  return false;
};
