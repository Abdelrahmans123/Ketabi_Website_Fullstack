import { Routes } from '@angular/router';
import { BookListComponent } from './features/books/pages/book-list/book-list';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
    title: 'Authentication',
  },
  {
    path: 'books',
    loadChildren: () => import('./features/books/book.routes').then((m) => m.BOOK_ROUTES),
    canActivate: [AuthGuard],
    title: 'Books',
  },
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
    title: 'Dashboard',
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'auth/login', // Changed to login instead of dashboard
  },
];
