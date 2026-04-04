import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { Profile, ProfileResponse, UpdateProfileRequest } from '../models/profile.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private apiUrl = API_ENDPOINTS.profile;

  constructor(private http: HttpClient, private authService: AuthService) {}

  getProfile(): Observable<ProfileResponse> {
    return this.http.get<ProfileResponse>(`${this.apiUrl}/me`);
  }

  updateProfile(updates: UpdateProfileRequest): Observable<ProfileResponse> {
    return this.http.put<ProfileResponse>(`${this.apiUrl}/update`, updates);
  }
  private getAuthHeaders(isJson: boolean = true): HttpHeaders {
    const token = this.authService.getAccessToken();
    let headers = new HttpHeaders();

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
      if (isJson) {
        headers = headers.set('Content-Type', 'application/json');
      }
    }

    return headers;
  }
  convertToPublisher() {
    const message = 'Request to convert to publisher';
    return this.http.post(
      `${this.apiUrl}/responses`,
      { message },
      {
        headers: this.getAuthHeaders(),
      }
    );
  }
}
