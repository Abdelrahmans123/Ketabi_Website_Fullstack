import { Routes } from '@angular/router';

import { AuthGuard } from '../../core/guards/auth.guard';
import { BookListComponent } from './pages/book-list/book-list';
import { BookDetailsComponent } from './pages/book-details/book-details';

export const BOOK_ROUTES: Routes = [
  {
    path: 'books',
    component: BookListComponent,
    canActivate: [AuthGuard],
    title: 'Books',
  },
  {
    path: ':id',
    component: BookDetailsComponent,
    canActivate: [AuthGuard],
    title: 'Book Details',
  },
  {
    path: 'category/:category',
    component: BookListComponent,
    canActivate: [AuthGuard],
    title: 'Books by Category',
  },
];
