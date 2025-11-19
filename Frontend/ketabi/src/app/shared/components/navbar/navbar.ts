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
import { NotificationPayload, SocketService } from '../../../core/services/socket.service';

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
  private connectionSub?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cartService: CartService,
    private notificationService: NotificationService,
    private socketService: SocketService
  ) {}

  ngOnInit() {

    this.cartCount$ = this.cartService.cart$.pipe(
      map((cart) => cart.items.reduce((sum, item) => sum + item.quantity, 0))
    );


    this.authSubscription = this.authService.isAuthenticated$.subscribe({
      next: (isAuth) => {

        this.isLoggedIn = isAuth;
        if (isAuth) {
          this.currentUser = this.authService.getCurrentUser();
          this.setupSocketNotifications();
        } else {
          this.currentUser = null;
          this.cleanupSocketNotifications();
        }
      },
    });
    this.checkAuthStatus();
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    if (this.connectionSub) {
      this.connectionSub.unsubscribe();
    }
    this.cleanupSocketNotifications();
  }

  private checkAuthStatus() {
    this.isLoggedIn = this.authService.isAuthenticated();
    if (this.isLoggedIn) {
      this.currentUser = this.authService.getCurrentUser();
      this.setupSocketNotifications();
    }
  }

  private setupSocketNotifications() {
    if (this.socketSub && !this.socketSub.closed) {
      return;
    }

    this.subscribeToNotifications();

    if (!this.connectionSub || this.connectionSub.closed) {
      this.connectionSub = this.socketService.connectionStatus$.subscribe({
        next: (isConnected) => {
          if (isConnected && (!this.socketSub || this.socketSub.closed)) {
            this.subscribeToNotifications();
          }
        },
        error: (err) => {
          console.error('Connection status error:', err);
        },
      });
    }
  }

  private subscribeToNotifications() {
    if (this.socketSub) {
      this.socketSub.unsubscribe();
      this.socketSub = undefined;
    }

    this.socketSub = this.socketService.notifications$.subscribe({
      next: (notif) => {
        console.log('🚀 ~ Navbar ~ subscribeToNotifications ~ notif:', notif);
        if (!notif) {
          return;
        }
        const messageText = notif.title || notif.content || notif.message || 'New notification';
        this.notifications.unshift({
          ...notif,
          message: messageText,
          timestamp: notif.createdAt || notif.timestamp || new Date().toISOString(),
        });


        this.notificationCount++;

        this.notificationService.info(messageText, 4000);
      },
      error: (err) => {
        console.error('Socket notification subscription error:', err);
      },
      complete: () => {
        console.log('Notification subscription completed (should not happen)');
      },
    });

  }

  private cleanupSocketNotifications() {
    if (this.socketSub) {
      this.socketSub.unsubscribe();
      this.socketSub = undefined;
    }
    this.notifications = [];
    this.notificationCount = 0;
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
      },
      error: (error: any) => {
        console.error('Logout error:', error);
        this.router.navigate(['/auth/login']);
      },
    });
  }

  notificationsClicked() {

    this.showNotifications = !this.showNotifications;

    if (this.showNotifications) {
      console.log('📖 Marking notifications as read');
      this.notificationCount = 0;
    }
  }

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

  ordersComponentRouter() {
    const role = this.authService.getUserRole();
    if (role === 'user' || role === 'admin') {
      this.router.navigate(['/my-orders']);
    } else if (role === 'publisher') {
      this.router.navigate(['/orders']);
    }
  }

  // Debug method - call this to check notification system status
  debugNotificationSystem() {
    console.log('🐛 === NOTIFICATION SYSTEM DEBUG ===');
    console.log('Socket connected:', this.socketService.isConnected());
    console.log('Current user:', this.currentUser);
    console.log('User ID:', this.currentUser?._id || this.currentUser?.id);
    console.log('Is logged in:', this.isLoggedIn);
    console.log('Socket subscription active:', !!this.socketSub);
    console.log('Connection subscription active:', !!this.connectionSub);
    console.log('Notification count:', this.notificationCount);
    console.log('Total notifications:', this.notifications.length);
    console.log('🐛 === END DEBUG ===');
  }
}
