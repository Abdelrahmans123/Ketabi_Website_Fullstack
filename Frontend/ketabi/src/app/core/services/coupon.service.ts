import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { couponResponse } from '../models/coupon.model';
import { API_ENDPOINTS } from '../constants/api-endpoints';

@Injectable({
  providedIn: 'root',
})
export class CouponService {

  private readonly api_url = API_ENDPOINTS.coupon;

  constructor(private http: HttpClient) { }

  verifyCoupon(code: string, subtotal: number): Observable<couponResponse> {
    const token = "";
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
    const params = new HttpParams().set('subtotal', subtotal.toString());
    return this.http.get<couponResponse>(`${this.api_url}/${code}`, { headers, params });
  }
}
