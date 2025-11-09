import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
import { RoleGuard } from '../../core/guards/role.guard';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'user',
    pathMatch: 'full',
  },
  {
    path: 'user',
    loadComponent: () =>
      import('./user/components/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    title: 'Dashboard',
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./admin/components/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    title: 'Admin Dashboard',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin'] },
  },
  {
    path: 'publisher',
    loadComponent: () =>
      import('./publisher/components/dashboard/dashboard.component').then(
        (m) => m.PublisherDashboardComponent
      ),
    title: 'Publisher Dashboard',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['publisher'] },
  },
];
