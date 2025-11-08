import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/components/dashboard.component/dashboard.component';
import { BookListComponent } from './features/books/pages/book-list/book-list';

export const routes: Routes = [
    { path: 'books', component: BookListComponent },

  { path: 'books/:category', component: DashboardComponent },
  { path: '', redirectTo: '/books/Arabic', pathMatch: 'full' },
  { path: '**', redirectTo: '/books/Arabic' },

];
