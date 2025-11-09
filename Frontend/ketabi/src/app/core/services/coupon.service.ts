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
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MGU3MDdmMjcwYjA4MzQyNzliMDc3MSIsInJvbGUiOiJhZG1pbiIsIm5hbWUiOiJBYmRlbHJhaG1hbiBTYWxhaCIsImlhdCI6MTc2MjY3MDU4MCwiZXhwIjoxNzYyNzU2OTgwLCJqdGkiOiJkMWRFWjBoaXJNTU9TeGdaRGJmSXYifQ.451RA8T_qmg2gUMwjhn_0OZuTZsW2bIpRSp7a31mKQY";
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
    const params = new HttpParams().set('subtotal', subtotal.toString());
    return this.http.get<couponResponse>(`${this.api_url}/${code}`, { headers, params });
  }
}
