import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { Observable } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  
  private readonly base_url = `${API_ENDPOINTS.order}`

  constructor(private http:HttpClient){}

  

  createOrder(payload: any): Observable<any> {
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MGU3MDdmMjcwYjA4MzQyNzliMDc3MSIsInJvbGUiOiJhZG1pbiIsIm5hbWUiOiJBYmRlbHJhaG1hbiBTYWxhaCIsImlhdCI6MTc2MjY3MDU4MCwiZXhwIjoxNzYyNzU2OTgwLCJqdGkiOiJkMWRFWjBoaXJNTU9TeGdaRGJmSXYifQ.451RA8T_qmg2gUMwjhn_0OZuTZsW2bIpRSp7a31mKQY";
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
    return this.http.post(`${this.base_url}`, payload, {headers});
  }
}
