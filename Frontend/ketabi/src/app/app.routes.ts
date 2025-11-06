import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/components/dashboard.component/dashboard.component';

export const routes: Routes = [

  { path: 'books/:category', component: DashboardComponent },
  { path: '', redirectTo: '/books/Arabic', pathMatch: 'full' },
  { path: '**', redirectTo: '/books/Arabic' }

];
