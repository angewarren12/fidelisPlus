import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRoles } from '../models/user-roles';

/** Autorise l'accès au registre client CRM pour le service commercial (le marketing a sa
 *  propre liste indépendante "Mes Clients" — /marketing/clients). */
export const clientsRoleGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.hasRole(UserRoles.ADMIN_COMMERCIAL, UserRoles.SUPER_ADMIN, UserRoles.COMMERCIAL)) {
    return true;
  }
  
  router.navigate(['/']);
  return false;
};
