import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  private readonly router = inject(Router);

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (typeof window === 'undefined') {
      return true;
    }

    const token = sessionStorage.getItem('nexooai_auth_token') || localStorage.getItem('nexooai_session_token');
    if (!token) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    // Strict Role Boundary: Pure Floor Kiosk Terminals cannot access the manager /admin dashboard
    const role = sessionStorage.getItem('nexooai_user_role');
    if (role === 'kiosk_terminal') {
      this.router.navigate(['/kiosk']);
      return false;
    }

    return true;
  }
}

/**
 * KioskGuard: Enforces showroom authorization before launching the floor kiosk terminal.
 * STRICT SECURITY: Without a valid authenticated session token (Super Admin, Store Manager, or Kiosk Terminal),
 * direct access to /kiosk is completely disallowed, redirecting unauthorized users to /login.
 */
@Injectable({
  providedIn: 'root',
})
export class KioskGuard implements CanActivate {
  private readonly router = inject(Router);

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (typeof window === 'undefined') {
      return true;
    }

    // 1. Mandatory Token Verification: Zero token = Zero access!
    const token = sessionStorage.getItem('nexooai_auth_token') || localStorage.getItem('nexooai_session_token');
    if (!token) {
      this.router.navigate(['/login'], {
        queryParams: {
          returnUrl: state.url,
          kioskLock: 'token_required',
        },
      });
      return false;
    }

    // 2. Role Verification: Must be super_admin, store_manager, tenant_owner, staff, or kiosk_terminal
    const role = sessionStorage.getItem('nexooai_user_role');
    if (
      role === 'super_admin' ||
      role === 'store_manager' ||
      role === 'tenant_owner' ||
      role === 'staff' ||
      role === 'kiosk_terminal'
    ) {
      return true;
    }

    // 3. Fallback for hardware kiosk paired with store ID
    const pairedStoreId = localStorage.getItem('nexooai_kiosk_store_id');
    if (pairedStoreId && token) {
      return true;
    }

    // 4. Unauthorized unauthenticated access: redirect to login
    this.router.navigate(['/login'], {
      queryParams: {
        returnUrl: state.url,
        kioskLock: 'unauthorized',
      },
    });
    return false;
  }
}

/**
 * SuperAdminGuard: Enforces platform master credentials for sensitive HQ routes.
 */
@Injectable({
  providedIn: 'root',
})
export class SuperAdminGuard implements CanActivate {
  private readonly router = inject(Router);

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (typeof window === 'undefined') {
      return true;
    }

    const token = sessionStorage.getItem('nexooai_auth_token') || localStorage.getItem('nexooai_session_token');
    const role = sessionStorage.getItem('nexooai_user_role');

    if (!token || role !== 'super_admin') {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: state.url, roleReq: 'super_admin' },
      });
      return false;
    }

    return true;
  }
}
