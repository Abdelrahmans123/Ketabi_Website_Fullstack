// guards/role.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class RoleGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const expectedRoles = route.data['roles'] as string[];
    const userRole = this.authService.getUserRole();

    if (!userRole) {
      this.router.navigate(['/login']);
      return false;
    }

    if (!userRole) {
      console.error('No user role found');
      this.router.navigate(['/auth/login']);
      return false;
    }
    const allowedRoles = route.data['roles'] as Array<string>;

    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(userRole)) {
        console.warn(`Access denied. User role '${userRole}' not in allowed roles:`, allowedRoles);

        // Redirect to user's own dashboard
        this.authService.redirectToDashboard();
        return false;
      }
    }
    return true;
  }
}
