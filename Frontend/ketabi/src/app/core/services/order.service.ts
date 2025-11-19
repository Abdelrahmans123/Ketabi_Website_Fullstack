import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { Observable } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';
import { loadStripe } from '@stripe/stripe-js';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private readonly base_url = `${API_ENDPOINTS.order}`;
  private readonly base_url_library = `${API_ENDPOINTS.profile}`;
  constructor(private http: HttpClient, private authService: AuthService) {}

  createOrder(payload: any): Observable<any> {
    return this.http.post(`${this.base_url}`, payload);
  }

  getLibrary(page: number = 1, limit: number = 10): Observable<any> {
    const token = this.authService.getAccessToken();

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http.get(`${this.base_url_library}/library`, {
      headers,
    });
  }

  getOrderHistory(page: number = 1, limit: number = 10): Observable<any> {
    return this.http.get(`${this.base_url}/order-history`, {
      params: {
        page: page.toString(),
        limit: limit.toString(),
      },
    });
  }

  getOrderDetails(orderId: string): Observable<any> {
    return this.http.get(`${this.base_url}/order/${orderId}`);
  }

  // GET ALL ORDERS (Admin)
  // `filters` can include: orderNumber, user, email, orderStatus, paymentStatus, sortBy, sortOrder
  getAllOrders(
    page: number = 1,
    limit: number = 10,
    filters: { [key: string]: any } = {}
  ): Observable<any> {
    const params: any = {
      page: page.toString(),
      limit: limit.toString(),
    };

    // Merge allowed filters
    const allowed = [
      'orderNumber',
      'user',
      'email',
      'orderStatus',
      'paymentStatus',
      'sortBy',
      'sortOrder',
    ];

    for (const key of Object.keys(filters || {})) {
      if (allowed.includes(key) && filters[key] != null && filters[key] !== '') {
        params[key] = String(filters[key]);
      }
    }

    return this.http.get(`${this.base_url}`, { params });
  }
  // Add these methods to your order.service.ts:

  updateOrderStatus(orderId: string, status: string): Observable<any> {
    return this.http.patch(`${this.base_url}/${orderId}/status`, { status });
  }

  deleteOrder(orderId: string): Observable<any> {
    return this.http.delete(`${this.base_url}/${orderId}`);
  }

  updateOrder(orderId: string, orderData: any): Observable<any> {
    return this.http.put(`${this.base_url}/${orderId}`, orderData);
  }
}
