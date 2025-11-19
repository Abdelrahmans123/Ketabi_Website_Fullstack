import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ChatComponent } from '../../../../../shared/components/chat/chat.component';
import { AuthService } from '../../../../../core/services/auth.service';
import { AdminDashboardService } from '../../../../../core/services/admin.service';
import { SidebarComponent } from '../../../../../shared/components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../../../shared/components/topbar/topbar.component';

interface DashboardStats {
  totalBooks: number;
  totalOrders: number;
  totalRevenue: number;
  totalUsers: number;
  booksChange: number;
  ordersChange: number;
  revenueChange: number;
  usersChange: number;
}

interface RecentOrder {
  _id: string;
  orderNumber: string;
  user: {
    _id?: string;
    name: string;
    email: string;
  };
  totalPrice: number;
  orderStatus: string;
  createdAt: string;
}

interface LowStockBook {
  _id: string;
  name: string;
  author: string;
  stock: number;
  price: number;
  image?: {
    url: string;
  };
}

interface MenuItem {
  icon: string;
  label: string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-dashboard.component',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterLink,
    ChatComponent,
    SidebarComponent,
    TopbarComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  @ViewChild('revenueChart') revenueChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ordersChart') ordersChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryChartRef!: ElementRef<HTMLCanvasElement>;

  isUserLoggedIn = false;
  role: string | null = null;
  sidebarCollapsed = false;
  notificationCount = 0;

  revenueFilter = '1m';
  ordersFilter = '1m';

  menuItems: MenuItem[] = [
    { icon: 'fa-th-large', label: 'Dashboard', route: '/admin/dashboard' },
    { icon: 'fa-book', label: 'Books', route: '/admin/books' },
    { icon: 'fa-users', label: 'Users', route: '/admin/users' },
    { icon: 'fa-comments', label: 'Responses', route: '/admin/responses' },
  ];

  private destroy$ = new Subject<void>();

  stats: DashboardStats = {
    totalBooks: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalUsers: 0,
    booksChange: 0,
    ordersChange: 0,
    revenueChange: 0,
    usersChange: 0,
  };

  recentOrders: RecentOrder[] = [];
  lowStockBooks: LowStockBook[] = [];

  loading = true;
  error = '';

  userName = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    private dashboardService: AdminDashboardService
  ) {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.isUserLoggedIn = true;
    this.role = currentUser.role;
    this.userName = currentUser.name || 'Admin User';

  }

  ngOnInit() {

    this.loadDashboardData();

    const notif = this.menuItems.find((i) => i.label === 'Notifications');
    this.notificationCount = notif?.badge ?? 0;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  loadDashboardData() {
    this.loading = true;
    this.error = '';
    this.dashboardService
      .getAllDashboardData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {

          this.stats = {
            totalBooks: data.totalBooks,
            totalOrders: data.totalOrders,
            totalRevenue: data.totalRevenue,
            totalUsers: data.totalUsers,
            booksChange: 12.5,
            ordersChange: 8.3,
            revenueChange: 15.2,
            usersChange: 23.1,
          };

          this.recentOrders = data.recentOrders.slice(0, 5).map((order: any) => ({
            _id: order._id,
            orderNumber: order.orderNumber,
            user: order.user,
            totalPrice: order.totalPrice,
            orderStatus: order.orderStatus,
            createdAt: order.createdAt,
          }));

          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error loading dashboard data:', error);
          this.error = 'Failed to load dashboard data. Please try again.';
          this.loading = false;
        },
      });

    this.loadLowStockBooks();
  }

  loadLowStockBooks() {
    this.dashboardService
      .getLowStockBooks(5, 10)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.lowStockBooks = response.lowStockBooks;
          }
        },
        error: (error) => {
          console.error('Error loading low stock books:', error);
        },
      });
  }

  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      Pending: 'status-pending',
      Processing: 'status-processing',
      Shipped: 'status-shipped',
      Delivered: 'status-delivered',
      Cancelled: 'status-cancelled',
    };
    return statusMap[status] || 'status-pending';
  }

  formatDate(date: string): string {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  }

  formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  getChangeIcon(change: number): string {
    return change >= 0 ? '↑' : '↓';
  }

  getChangeClass(change: number): string {
    return change >= 0 ? 'positive' : 'negative';
  }
}
