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
    const token = "";
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
    return this.http.post(`${this.base_url}`, payload, {headers});
  }
}