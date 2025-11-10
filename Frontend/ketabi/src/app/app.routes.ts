import { Routes } from '@angular/router';
import { BookListComponent } from './features/books/pages/book-list/book-list';
import { AuthGuard } from './core/guards/auth.guard';
import { CartComponent } from './features/cart/cart.component';
import { RoleGuard } from './core/guards/role.guard';
import { ShopComponent } from './features/books/pages/shop/shop';
import { SearchResultsComponent } from './features/books/pages/search-results/search-results';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard/user', pathMatch: 'full' },
  {
    path: 'books',
    loadChildren: () => import('./features/books/book.routes').then((m) => m.BOOK_ROUTES),
    canActivate: [AuthGuard],
    title: 'Books',
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
    path: 'publisherPublisher',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['publisher'] },
    children: [
      {
        path: 'dashboard,,',
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
  { path: 'cart', component: CartComponent },
  {
    path: 'shop',
    loadComponent: () =>
      import('./features/books/pages/shop/shop').then((m) => m.ShopComponent),
  },
  { path: 'search', component: SearchResultsComponent },
  {
    path: '**',
    redirectTo: 'auth/login',
  },
];
