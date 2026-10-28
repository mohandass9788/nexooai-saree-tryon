import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

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
