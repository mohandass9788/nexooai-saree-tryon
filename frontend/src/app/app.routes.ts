import { Routes } from '@angular/router';
import { AuthGuard, KioskGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/public-home/public-home.component').then(
        (m) => m.PublicHomeComponent
      ),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'hq-login',
    loadComponent: () =>
      import('./features/auth/super-admin-login.component').then(
        (m) => m.SuperAdminLoginComponent
      ),
  },
  {
    path: 'super-admin/login',
    redirectTo: 'hq-login',
  },
  {
    path: 'admin/login',
    redirectTo: 'hq-login',
  },
  {
    path: 'app',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./features/app-shell/app-shell.component').then(
        (m) => m.AppShellComponent
      ),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/app-shell/app-shell.component').then(
            (m) => m.AppShellComponent
          ),
      },
      {
        path: '**',
        redirectTo: 'dashboard',
      },
    ],
  },
  {
    path: 'kiosk',
    canActivate: [KioskGuard],
    loadComponent: () => import('./app').then((m) => m.App),
  },
  {
    path: 'kiosk/*',
    redirectTo: 'kiosk',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
