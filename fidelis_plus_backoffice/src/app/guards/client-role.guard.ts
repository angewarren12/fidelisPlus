import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRoles } from '../models/user-roles';

/** Autorise uniquement le rôle Client. */
export const clientRoleGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const role = auth.getCurrentUser()?.role;
  
  if (role === UserRoles.CLIENT) {
    return true;
  }
  
  router.navigate(['/']);
  return false;
};
