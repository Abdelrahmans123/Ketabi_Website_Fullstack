// navbar.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css'],
})
export class Navbar implements OnInit, OnDestroy {
  isLoggedIn = false;
  cartCount = 0;
  currentUser: any = null;

  private authSubscription?: Subscription;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    // Initialize authentication state
    this.checkAuthStatus();

    // Subscribe to authentication state changes
    this.authSubscription = this.authService.isAuthenticated$.subscribe({
      next: (isAuth) => {
        console.log('Auth state changed:', isAuth);
        this.isLoggedIn = isAuth;
        if (isAuth) {
          this.currentUser = this.authService.getCurrentUser();
          console.log('🚀 ~ Navbar ~ ngOnInit ~ currentUser:', this.currentUser);
        } else {
          this.currentUser = null;
        }
      },
    });
  }

  ngOnDestroy() {
    // Clean up subscription
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  // Check initial authentication status
  private checkAuthStatus() {
    this.isLoggedIn = this.authService.isAuthenticated();
    if (this.isLoggedIn) {
      this.currentUser = this.authService.getCurrentUser();
    }
  }

  // Handle logout
  logout() {
    this.authService.logout().subscribe({
      next: () => {
        // Navigation is handled by the auth service
        console.log('Logged out successfully');
      },
      error: (error: any) => {
        console.error('Logout error:', error);
        // Force logout even if API call fails
        // this.authService.clearAuthData();
        this.router.navigate(['/auth/login']);
      },
    });
  }
}
