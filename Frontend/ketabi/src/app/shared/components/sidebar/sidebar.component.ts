import { AuthService } from './../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
interface MenuItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}
@Component({
  selector: 'app-admin-sidebar',
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  sidebarCollapsed = false;
  isUserLoggedIn = true;
  role = 'admin';
  menuItems: MenuItem[] = [
    { icon: 'fa-th-large', label: 'Dashboard', route: '/admin/dashboard' },
    { icon: 'fa-book', label: 'Books', route: '/admin/books' },
    { icon: 'fa-users', label: 'Users', route: '/admin/users' },
    { icon: 'fa-comments', label: 'Responses', route: '/admin/responses' },
    { icon: 'fa-shopping-cart', label: 'Orders', route: '/admin/orders' },
  ];
  constructor(private router: Router, private authService: AuthService) {}
  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/auth/login']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Even if logout fails, redirect to login
        this.router.navigate(['/auth/login']);
      },
    });
  }
  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }
}
