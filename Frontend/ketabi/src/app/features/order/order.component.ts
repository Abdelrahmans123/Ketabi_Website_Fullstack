import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../core/services/order.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-order',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order.component.html',
  styleUrl: './order.component.css'
})
export class OrderComponent implements OnInit {
  orderId: string = '';
  orderStatus: 'success' | 'failed' | 'loading' = 'loading';
  loading = true;
  orderAmount: number = 0;
  errorMessage = '';
  orderDetails: any = null;
  hasEbooks = false;
  hasPhysicalBooks = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.orderId = params['orderId'] || '';
      const status = params['status'];

      console.log('Redirect params:', params);
      console.log('Order ID:', this.orderId);
      console.log('Status:', status);

      if (status === 'success') {
        this.orderStatus = 'success';
        this.fetchOrderDetails();
      } else if (status === 'failed') {
        this.orderStatus = 'failed';
        this.errorMessage = params['message'] || 'Payment failed';
        this.toastService.show('❌ Payment Failed: ' + this.errorMessage, 'error');
        this.loading = false;
      } else {
        this.loading = false;
        this.router.navigate(['/']);
      }
    });
  }

  fetchOrderDetails() {
    if (!this.orderId) {
      this.loading = false;
      this.toastService.show('⚠️ No order ID provided', 'error');
      return;
    }

    console.log('📥 Fetching order details for:', this.orderId);

    this.orderService.getOrderDetails(this.orderId).subscribe({
      next: (response) => {
        console.log('Order details received:', response);

        this.orderDetails = response.data || response;
        this.orderAmount = this.orderDetails.finalPrice || 0;

        this.hasEbooks = this.orderDetails.items?.some(
          (item: any) => item.type === 'ebook'
        ) || false;

        this.hasPhysicalBooks = this.orderDetails.items?.some(
          (item: any) => item.type === 'physical'
        ) || false;

        this.loading = false;

        if (this.orderStatus === 'success') {
          const message = this.hasEbooks
            ? '🎉 Payment Successful! Your ebooks are now in your library.'
            : '🎉 Payment Successful! Your order is being processed.';

          this.toastService.show(message, 'success');

          console.log('Toast shown: Payment successful');
        }
      },
      error: (err) => {
        console.error('Error fetching order:', err);
        this.loading = false;
        this.toastService.show('❌ Failed to load order details', 'error');
      }
    });
  }

  goToDashboard() {
    this.router.navigate(['/dashboard/user']);
  }

  goToLibrary() {
    this.router.navigate(['/my-library']);
  }

  retryPayment() {
    this.router.navigate(['/cart']);
  }
}