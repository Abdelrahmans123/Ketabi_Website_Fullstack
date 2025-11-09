import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PublisherService } from '../../../../core/services/publisher.service';
import { PublisherBooksResponse } from '../../models/book.model';
import { PublisherOrdersResponse, DeliveryStatus, PaymentStatus } from '../../models/order.model';

interface DashboardStats {
    totalBooks: number;
    totalOrders: number;
    ordersByDeliveryStatus: { [key: string]: number };
    ordersByPaymentStatus: { [key: string]: number };
}

@Component({
    selector: 'app-publisher-dashboard',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './publisher-dashboard.component.html',
    styleUrl: './publisher-dashboard.component.css'
})
export class PublisherDashboardComponent implements OnInit {
    @Input() publisherId?: string;

    loading = false;
    error: string | null = null;
    stats: DashboardStats = {
        totalBooks: 0,
        totalOrders: 0,
        ordersByDeliveryStatus: {},
        ordersByPaymentStatus: {}
    };

    deliveryStatusKeys: string[] = [];
    paymentStatusKeys: string[] = [];

    constructor(private publisherService: PublisherService) { }

    ngOnInit(): void {
        const id = this.publisherId || this.getCurrentUserId();
        if (id) {
            this.loadDashboardData(id);
        } else {
            this.error = 'Publisher ID is required';
        }
    }

    private getCurrentUserId(): string | null {
        return null; // Should be retrieved from auth service
    }

    loadDashboardData(publisherId: string): void {
        this.loading = true;
        this.error = null;

        // Load books (first page to get total)
        this.publisherService.getPublishedBooks(publisherId, 1, 1).subscribe({
            next: (booksResponse: PublisherBooksResponse) => {
                console.log('Backend Books:', booksResponse);
                this.stats.totalBooks = booksResponse.data.totalBooks || 0;

                // Load orders (first page to get total and calculate stats)
                this.publisherService.getPublisherOrders(publisherId, 1, 100).subscribe({
                    next: (ordersResponse: PublisherOrdersResponse) => {
                        console.log('Backend Orders:', ordersResponse);
                        this.stats.totalOrders = ordersResponse.data.total || 0;
                        this.calculateOrderStats(ordersResponse.data.orders || []);
                        this.loading = false;
                    },
                    error: (err) => {
                        console.error('Error loading orders:', err);
                        this.error = err.error?.message || 'Failed to load dashboard data.';
                        this.loading = false;
                    }
                });
            },
            error: (err) => {
                console.error('Error loading books:', err);
                this.error = err.error?.message || 'Failed to load dashboard data.';
                this.loading = false;
            }
        });
    }

    calculateOrderStats(orders: any[]): void {
        // Initialize counters
        const deliveryCounts: { [key: string]: number } = {};
        const paymentCounts: { [key: string]: number } = {};

        // Count statuses from all order items
        orders.forEach(order => {
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach((item: any) => {
                    // Count delivery statuses
                    const deliveryStatus = item.deliveryStatus || 'Unknown';
                    deliveryCounts[deliveryStatus] = (deliveryCounts[deliveryStatus] || 0) + 1;

                    // Count payment statuses
                    const paymentStatus = item.paymentStatus || 'Unknown';
                    paymentCounts[paymentStatus] = (paymentCounts[paymentStatus] || 0) + 1;
                });
            }
        });

        this.stats.ordersByDeliveryStatus = deliveryCounts;
        this.stats.ordersByPaymentStatus = paymentCounts;
        this.deliveryStatusKeys = Object.keys(deliveryCounts);
        this.paymentStatusKeys = Object.keys(paymentCounts);
    }

    getStatusPercentage(status: string, total: number): number {
        if (total === 0) return 0;
        const count = this.stats.ordersByDeliveryStatus[status] || this.stats.ordersByPaymentStatus[status] || 0;
        return Math.round((count / total) * 100);
    }

    getStatusCount(status: string): number {
        return this.stats.ordersByDeliveryStatus[status] || this.stats.ordersByPaymentStatus[status] || 0;
    }

    getTotalItemsCount(): number {
        return Object.values(this.stats.ordersByDeliveryStatus).reduce((sum, count) => sum + count, 0);
    }
}

