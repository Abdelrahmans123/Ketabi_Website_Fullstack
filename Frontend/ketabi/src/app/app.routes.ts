import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/components/dashboard.component/dashboard.component';
import { BookListComponent } from './features/books/pages/book-list/book-list';

import { PublisherBooksComponent } from './features/publishers/pages/publisher-books/publisher-books.component';
import { PublisherOrdersComponent } from './features/publishers/pages/publisher-orders/publisher-orders.component';
import { PublisherDashboardComponent } from './features/publishers/pages/publisher-dashboard/publisher-dashboard.component';

export const routes: Routes = [
  { path: 'books', component: BookListComponent },
  { path: 'books/:category', component: DashboardComponent },


  
  { path: 'publisher/books', component: PublisherBooksComponent },
  { path: 'publisher/orders', component: PublisherOrdersComponent },
  { path: 'publisher/dashboard', component: PublisherDashboardComponent },
  { path: '', redirectTo: '/books/Arabic', pathMatch: 'full' },
  // { path: '**', redirectTo: '/books/Arabic' },
];
