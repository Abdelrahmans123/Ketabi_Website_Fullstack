import { Routes } from '@angular/router';
import { BookListComponent } from './features/books/pages/book-list/book-list';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'books', pathMatch: 'full' },
  {
    path: 'books',
    component: BookListComponent,
  },
  {
    path: 'books/:category',
    component: BookListComponent,
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
    title: 'Authentication',
  },
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
    title: 'Dashboard',
  },
  {
    path: 'publisher',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['publisher'] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/publisher/components/dashboard/dashboard.component').then(
            (m) => m.PublisherDashboardComponent
          ),
        title: 'Publisher Dashboard',
      },
      {
        path: 'books',
        loadComponent: () =>
          import('./features/publishers/pages/publisher-books/publisher-books.component').then(
            (m) => m.PublisherBooksComponent
          ),
        title: 'Publisher Books',
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/publishers/pages/publisher-orders/publisher-orders.component').then(
            (m) => m.PublisherOrdersComponent
          ),
        title: 'Publisher Orders',
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'auth/login',
  },
];
