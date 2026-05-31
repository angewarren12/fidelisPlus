import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user-roles';

/** Garde générique : autorise si le rôle courant est dans la liste. */
export function roleGuard(allowed: UserRole[], redirectTo = '/dashboard'): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const role = auth.getCurrentUser()?.role;
    if (role && allowed.includes(role as UserRole)) {
      return true;
    }
    router.navigate([redirectTo]);
    return false;
  };
}
