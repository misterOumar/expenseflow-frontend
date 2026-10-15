import { inject } from '@angular/core';
import { CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from './models';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAuthenticated() || inject(Router).createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return !auth.isAuthenticated() || inject(Router).createUrlTree(['/reports']);
};

export function roleGuard(role: Role): CanActivateFn {
  return () => inject(AuthService).hasRole(role) || inject(Router).createUrlTree(['/reports']);
}

/** Écran pouvant retenir l'utilisateur, typiquement en cas de modifications non enregistrées. */
export interface LeaveGuarded {
  canLeave(): boolean | Promise<boolean>;
}

export const unsavedChangesGuard: CanDeactivateFn<LeaveGuarded> = (component) => component.canLeave();
