import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../../../core/services/order.service';
import { ChatComponent } from '../../../../../shared/components/chat/chat.component';
import { SidebarComponent } from '../../../../../shared/components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../../../shared/components/topbar/topbar.component';

interface Order {
  _id: string;
  orderNumber: string;
  userEmail: string;
  userName: string;
  user: {
    name: string;
    email: string;
    phone: string;
  };
  items: Array<{
    bookId: string;
    bookName: string;
    bookImage: string;
    quantity: number;
    price: number;
  }>;
  finalPrice: number;
  orderStatus: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  paymentStatus: 'Pending' | 'Completed' | 'Failed' | 'Refunded';
  paymentMethod: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  orderDate: Date;
  updatedDate: Date;
  trackingNumber?: string;
  notes?: string;
  selected?: boolean;
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatComponent, SidebarComponent, TopbarComponent],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css'],
})
export class OrdersComponent implements OnInit {
  // Orders data
  orders: Order[] = [];
  filteredOrders: Order[] = [];
  paginatedOrders: Order[] = [];

  // Stats
  totalOrders = 0;
  pendingOrders = 0;
  completedOrders = 0;
  totalRevenue = 0;

  // Filters
  searchTerm = '';
  selectedStatus = '';
  selectedPaymentStatus = '';
  selectedDateRange = '';

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  usingServerPagination = false;
  isUserLoggedIn = true;
  role = 'admin';
  // Modal
  showOrderModal = false;
  selectedOrder: any = {};
  modalMode: 'view' | 'edit' = 'view';

  // Loading & Error
  loading = false;
  errorMessage = '';

  // Selection
  selectAll = false;

  constructor(private orderService: OrderService) {}

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.loading = true;
    this.errorMessage = '';
    // Build filter object to send to backend when using server-side pagination
    const filters: any = {};
    // Map frontend select values (lowercase) to backend enums (capitalized) expected by validation
    const orderStatusMap: { [key: string]: string } = {
      pending: 'Pending',
      processing: 'Processing',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      completed: 'Completed',
    };
    const paymentStatusMap: { [key: string]: string } = {
      pending: 'Pending',
      paid: 'Completed',
      failed: 'Failed',
      refunded: 'Refunded',
    };

    if (this.selectedStatus) {
      const mapped = orderStatusMap[this.selectedStatus.toLowerCase()];
      filters.orderStatus = mapped || this.selectedStatus;
    }
    if (this.selectedPaymentStatus) {
      const mapped = paymentStatusMap[this.selectedPaymentStatus.toLowerCase()];
      filters.paymentStatus = mapped || this.selectedPaymentStatus;
    }
    // Simple heuristic: if searchTerm contains @, treat as email; otherwise send as orderNumber
    if (this.searchTerm && this.searchTerm.trim().length > 0) {
      if (this.searchTerm.includes('@')) {
        filters.email = this.searchTerm.trim();
      } else {
        filters.orderNumber = this.searchTerm.trim();
      }
    }

    this.orderService.getAllOrders(this.currentPage, this.pageSize, filters).subscribe({
      next: (response) => {
        // Response shape may be: { data: { orders: [...], pagination: { total, page, pages } } }
        const payload = response?.data ? response.data : response;
        const ordersArray = Array.isArray(payload?.orders) ? payload.orders : [];

        this.orders = [...ordersArray];
        this.filteredOrders = [...this.orders];

        if (payload?.pagination) {
          // Use server-side pagination metadata when available
          this.usingServerPagination = true;
          this.totalOrders = Number(payload.pagination.total) || this.orders.length;
          this.currentPage = Number(payload.pagination.page) || this.currentPage;
          this.totalPages = Number(payload.pagination.pages) || Math.ceil(this.totalOrders / this.pageSize);
        } else {
          this.usingServerPagination = false;
          this.totalOrders = this.orders.length;
          this.totalPages = Math.max(1, Math.ceil(this.totalOrders / this.pageSize));
        }

        this.calculateStats();
        this.updatePagination();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.errorMessage = 'Failed to load orders. Please try again.';
        this.loading = false;

        // Fallback to mock data for development
        if (error.status === 0 || error.status === 404) {
          console.warn('Using mock data for development');
          // this.orders = this.generateMockOrders();
          this.filteredOrders = [...this.orders];
          this.calculateStats();
          this.updatePagination();
          this.errorMessage = '';
        }
      },
    });
  }

  calculateStats() {
    this.totalOrders = this.orders.length;
    this.pendingOrders = this.orders.filter(
      (o) => o.orderStatus === 'Pending' || o.orderStatus === 'Processing'
    ).length;
    this.completedOrders = this.orders.filter((o) => o.orderStatus === 'Delivered').length;
    this.totalRevenue = this.orders
      .filter((o) => o.paymentStatus === 'Completed')
      .reduce((sum, order) => sum + order.finalPrice, 0);
  }

  onSearch() {
    this.applyFilters();
  }

  onFilterChange() {
    this.applyFilters();
  }

  applyFilters() {
    // If we're using server-side pagination, request the server (so it can apply filters).
    if (this.usingServerPagination) {
      // Reset to first page when filters change
      this.currentPage = 1;
      this.loadOrders();
      return;
    }

    this.filteredOrders = this.orders.filter((order) => {
      const matchesSearch =
        !this.searchTerm ||
        order.orderNumber.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        order.user.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        order.user.email.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus = !this.selectedStatus || order.orderStatus === this.selectedStatus;
      const matchesPayment =
        !this.selectedPaymentStatus || order.paymentStatus === this.selectedPaymentStatus;

      // Date range filter
      let matchesDate = true;
      if (this.selectedDateRange) {
        const now = new Date();
        const orderDate = new Date(order.orderDate);

        switch (this.selectedDateRange) {
          case 'today':
            matchesDate = orderDate.toDateString() === now.toDateString();
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = orderDate >= weekAgo;
            break;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = orderDate >= monthAgo;
            break;
          case 'year':
            const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            matchesDate = orderDate >= yearAgo;
            break;
        }
      }

      return matchesSearch && matchesStatus && matchesPayment && matchesDate;
    });

    this.currentPage = 1;
    this.updatePagination();
  }

  resetFilters() {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.selectedPaymentStatus = '';
    this.selectedDateRange = '';
    this.applyFilters();
  }

  updatePagination() {
    if (this.usingServerPagination) {
      // Server already sent the current page in `this.orders`
      this.paginatedOrders = [...this.orders];
      // Ensure totalPages is sane
      this.totalPages = Math.max(1, this.totalPages);
    } else {
      this.totalPages = Math.ceil(this.filteredOrders.length / this.pageSize) || 1;
      const start = (this.currentPage - 1) * this.pageSize;
      const end = start + this.pageSize;
      this.paginatedOrders = this.filteredOrders.slice(start, end);
      this.totalOrders = this.filteredOrders.length;
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      if (this.usingServerPagination) {
        this.loadOrders();
      } else {
        this.updatePagination();
      }
    }
  }

  onPageSizeChange() {
    this.currentPage = 1;
    if (this.usingServerPagination) {
      this.loadOrders();
    } else {
      this.updatePagination();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPages = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
    let end = Math.min(this.totalPages, start + maxPages - 1);

    if (end - start < maxPages - 1) {
      start = Math.max(1, end - maxPages + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  getPaginationInfo() {
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.totalOrders);
    return { start, end, total: this.totalOrders };
  }

  viewOrder(order: Order) {
    this.orderService.getOrderDetails(order._id).subscribe({
      next: (response) => {
        let orderData = response;
        if (response.data) {
          orderData = response.data;
        } else if (response.order) {
          orderData = response.order;
        }
        this.selectedOrder = orderData; // ensure modal has the fetched details
        this.modalMode = 'view';
        this.showOrderModal = true;
      },
      error: (error) => {
        console.error('Error loading order details:', error);
        this.selectedOrder = { ...order };
        this.modalMode = 'view';
        this.showOrderModal = true;
      },
    });
  }

  editOrder(order: Order) {
    this.selectedOrder = { ...order };
    this.modalMode = 'edit';
    this.showOrderModal = true;
  }

updateOrderStatus(order: Order, newStatus: Order['orderStatus']) {
  const oldStatus = order.orderStatus;

  order.orderStatus = newStatus;
  order.updatedDate = new Date();
  

  this.orderService.updateOrderStatus(order._id, newStatus).subscribe({
    next: (response) => {
    },
    error: (error) => {
      console.error('Error updating order status:', error);
      order.orderStatus = oldStatus;
    },
  });
}

  deleteOrder(order: Order) {
    if (confirm(`Are you sure you want to delete order ${order.orderNumber}?`)) {
      this.orderService.deleteOrder(order._id).subscribe({
        next: (response) => {
          this.orders = this.orders.filter((o) => o._id !== order._id);
          this.applyFilters();
        },
        error: (error) => {
          console.error('Error deleting order:', error);
        },
      });
      this.orders = this.orders.filter((o) => o._id !== order._id);
      this.applyFilters();
    }
  }
  closeModal() {
    this.showOrderModal = false;
    this.selectedOrder = {};
  }

  toggleSelectAll() {
    this.paginatedOrders.forEach((order) => (order.selected = this.selectAll));
  }

  onOrderSelect() {
    this.selectAll = this.paginatedOrders.every((order) => order.selected);
  }

  exportOrders() {

    // Create CSV content
    const headers = ['Order Number', 'Customer', 'Email', 'Total', 'Status', 'Payment', 'Date'];
    const csvContent = [
      headers.join(','),
      ...this.filteredOrders.map((order) =>
        [
          order.orderNumber,
          order.user.name,
          order.user.email,
          order.finalPrice.toFixed(2),
          order.orderStatus,
          order.paymentStatus,
          new Date(order.orderDate).toLocaleDateString(),
        ].join(',')
      ),
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  printOrder(order: Order) {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Order ${order.orderNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #333; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
              th { background-color: #f5f5f5; }
            </style>
          </head>
          <body>
            <h1>Order ${order.orderNumber}</h1>
            <p><strong>Customer:</strong> ${order.user.name}</p>
            <p><strong>Email:</strong> ${order.user.email}</p>
            <p><strong>Date:</strong> ${new Date(order.orderDate).toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${order.orderStatus}</p>
            <h2>Items</h2>
            <table>
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${order.items
                  .map(
                    (item) => `
                  <tr>
                    <td>${item.bookName}</td>
                    <td>${item.quantity}</td>
                    <td>$${item.price.toFixed(2)}</td>
                    <td>$${(item.quantity * item.price).toFixed(2)}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
            <h3>Total: $${order.finalPrice.toFixed(2)}</h3>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }

  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      pending: 'warning',
      processing: 'info',
      shipped: 'primary',
      delivered: 'success',
      cancelled: 'danger',
    };
    return statusMap[status] || 'secondary';
  }

  getPaymentStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      pending: 'warning',
      paid: 'success',
      failed: 'danger',
      refunded: 'info',
    };
    return statusMap[status] || 'secondary';
  }
}
