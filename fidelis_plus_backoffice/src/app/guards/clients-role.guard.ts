import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRoles } from '../models/user-roles';

/** Autorise l'accès au registre client pour Admin, Commercial et Marketing. */
export const clientsRoleGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  
  if (auth.hasRole(UserRoles.ADMIN, UserRoles.COMMERCIAL, UserRoles.MARKETING)) {
    return true;
  }
  
  router.navigate(['/']);
  return false;
};
