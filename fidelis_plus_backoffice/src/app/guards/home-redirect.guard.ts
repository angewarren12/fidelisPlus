import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRoles } from '../models/user-roles';

/** Page d'accueil selon le rôle (marketing → fidélité, client → client dashboard). */
export const homeRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const role = auth.getCurrentUser()?.role;
  if (role === UserRoles.MARKETING || role === UserRoles.ADMIN_MARKETING) {
    return router.createUrlTree(['/marketing/dashboard']);
  }
  if (role === UserRoles.CLIENT) {
    return router.createUrlTree(['/client/dashboard']);
  }
  return router.createUrlTree(['/dashboard']);
};
