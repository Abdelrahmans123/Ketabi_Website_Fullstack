import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { map, Observable } from 'rxjs';
import { CartService } from '../../../core/services/cart.service';
import { SearchBarComponent } from '../search-bar/search-bar';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  NotificationPayload,
  SocketService,
  SystemMessage,
} from '../../../core/services/socket.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, SearchBarComponent],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css'],
})
export class Navbar implements OnInit, OnDestroy {
  isLoggedIn = false;
  currentUser: any = null;
  cartCount$!: Observable<number>;
  notificationCount = 0;
  notifications: NotificationPayload[] = [];
  showNotifications = false;
  private authSubscription?: Subscription;
  private socketSub?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cartService: CartService,
    private notificationService: NotificationService,
    private socketService: SocketService
  ) {}

  ngOnInit() {
    console.log('🚀 Navbar initialized');

    this.cartCount$ = this.cartService.cart$.pipe(
      map((cart) => cart.items.reduce((sum, item) => sum + item.quantity, 0))
    );

    // Subscribe to authentication state changes
    this.authSubscription = this.authService.isAuthenticated$.subscribe({
      next: (isAuth) => {
        console.log('🔐 Auth state changed:', isAuth);
        this.isLoggedIn = isAuth;
        if (isAuth) {
          this.currentUser = this.authService.getCurrentUser();
          console.log('👤 Current user:', this.currentUser);
          // Setup socket notifications when user authenticates
          this.setupSocketNotifications();
        } else {
          this.currentUser = null;
          this.cleanupSocketNotifications();
        }
      },
    });

    // Check initial auth status
    this.checkAuthStatus();
  }

  ngOnDestroy() {
    console.log('🧹 Navbar destroying, cleaning up subscriptions');
    // Clean up all subscriptions
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    this.cleanupSocketNotifications();
  }

  // Check initial authentication status
  private checkAuthStatus() {
    this.isLoggedIn = this.authService.isAuthenticated();
    console.log('🔍 Initial auth check:', this.isLoggedIn);
    if (this.isLoggedIn) {
      this.currentUser = this.authService.getCurrentUser();
      console.log('👤 Initial user:', this.currentUser);
      this.setupSocketNotifications();
    }
  }

  // Setup socket notification subscription
  private setupSocketNotifications() {
    // Cleanup existing subscription first
    this.cleanupSocketNotifications();

    console.log('🔌 Setting up socket notifications subscription');

    // Subscribe ONLY to socket notifications (not toast notifications)
    this.socketSub = this.socketService.notifications$.subscribe({
      next: (notif) => {
        if (!notif) {
          console.log('⚠️ Received null notification');
          return;
        }
        console.log('📬 Socket notification received:', notif);

        const messageText = notif.title || notif.content || '';

        // Add to notification list (this will show in dropdown)
        this.notifications.unshift({
          ...notif,
          message: messageText,
          timestamp: notif.createdAt || new Date().toISOString(),
        } as any);

        // Increment count
        this.notificationCount = this.notificationCount + 1;

        // Show toast notification (but DON'T add to list again)
        this.notificationService.info(messageText, 4000);
      },
      error: (err) => {
        console.error('❌ Socket notification error:', err);
      },
    });

    console.log('✅ Socket notifications subscription active');
  }

  // Cleanup socket subscription
  private cleanupSocketNotifications() {
    if (this.socketSub) {
      console.log('🧹 Cleaning up socket subscription');
      this.socketSub.unsubscribe();
      this.socketSub = undefined;
    }
    // Clear notifications on logout
    this.notifications = [];
    this.notificationCount = 0;
  }

  // Handle logout
  logout() {
    console.log('🚪 Logging out');
    this.authService.logout().subscribe({
      next: () => {
        console.log('✅ Logged out successfully');
      },
      error: (error: any) => {
        console.error('❌ Logout error:', error);
        this.router.navigate(['/auth/login']);
      },
    });
  }

  notificationsClicked() {
    console.log('🔔 Notifications clicked, current count:', this.notificationCount);
    // Toggle dropdown
    this.showNotifications = !this.showNotifications;
    // If opening, mark all as read (clear count)
    if (this.showNotifications) {
      this.notificationCount = 0;
    }
  }
  // Add these methods to your Navbar component

  getNotificationClass(type: string): string {
    const typeMap: { [key: string]: string } = {
      PRICE_DROP: 'price-drop',
      BOOK_BACK_IN_STOCK: 'book-back-in-stock',
      LOW_STOCK: 'low-stock',
      ORDER_CONFIRMED: 'order-confirmed',
      ORDER_SHIPPED: 'order-shipped',
    };
    return typeMap[type] || '';
  }

  formatTime(timestamp: string): string {
    if (!timestamp) return '';

    const now = new Date();
    const notifTime = new Date(timestamp);
    const diffMs = now.getTime() - notifTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return notifTime.toLocaleDateString();
  }

  viewBook(bookId: string): void {
    this.router.navigate(['/books', bookId]);
    this.showNotifications = false;
  }

  deleteNotification(notif: any): void {
    const index = this.notifications.indexOf(notif);
    if (index > -1) {
      this.notifications.splice(index, 1);
    }
  }

  clearAllNotifications(): void {
    this.notifications = [];
    this.notificationCount = 0;
  }
}
