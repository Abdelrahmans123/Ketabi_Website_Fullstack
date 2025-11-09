import { SocialAuthService } from '@abacritt/angularx-social-login';
import { jwtDecode } from 'jwt-decode';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, from, Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  SocialLoginRequest,
} from '../../features/auth/models/login.model';
import { AuthResponse, RegisterResponse } from '../../features/auth/models/auth-response.model';
import { IUser } from '../models/user.model';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { SocialLoginData } from '../../features/auth/components/register-form/register-form.component';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = environment.apiBaseUrl || 'http://localhost:3000/api';
  private readonly TOKEN_KEY = 'token';
  private readonly REFRESH_TOKEN_KEY = 'refreshToken';

  // Initialize from token, not storage
  private currentUserSubject = new BehaviorSubject<IUser | null>(this.getUserFromToken());
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasValidToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private socialAuthService: SocialAuthService
  ) {
    console.log('🔵 AuthService initialized');
    console.log('Initial auth state:', this.isAuthenticatedSubject.value);
    console.log('Initial user:', this.currentUserSubject.value);
  }

  // ==========================================
  // TOKEN MANAGEMENT
  // ==========================================

  setTokens(accessToken: string, refreshToken: string): void {
    console.log('🔵 setTokens called');
    localStorage.setItem(this.TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);

    // Decode token and extract user info
    const user = this.getUserFromToken();
    console.log('✅ User extracted from token:', user);

    // Update both subjects
    this.isAuthenticatedSubject.next(true);
    this.currentUserSubject.next(user);

    console.log('✅ Auth state updated');
    console.log('✅ isAuthenticated:', this.isAuthenticatedSubject.value);
    console.log('✅ currentUser:', this.currentUserSubject.value);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  // ==========================================
  // USER MANAGEMENT
  // ==========================================

  getCurrentUser(): IUser | null {
    return this.getUserFromToken();
  }

  // Extract user from JWT token
  private getUserFromToken(): IUser | null {
    const token = this.getAccessToken();
    if (!token) {
      console.log('⚠️ No token found');
      return null;
    }

    try {
      const decoded: any = jwtDecode(token);
      console.log('🔍 Decoded token:', decoded);

      // Map token payload to IUser interface
      const user: IUser = {
        id: decoded._id || decoded.id || decoded.userId || decoded.sub,
        name: decoded.name || `${decoded.firstName || ''} ${decoded.lastName || ''}`.trim(),
        email: decoded.email,
        role: decoded.role || 'user',
        phone: decoded.phone || '',
        gender: decoded.gender || '',
        address: decoded.address || '',
      };

      console.log('✅ User object created from token:', user);
      return user;
    } catch (error) {
      console.error('❌ Error decoding token:', error);
      return null;
    }
  }

  // ==========================================
  // AUTHENTICATION CHECKS
  // ==========================================

  isAuthenticated(): boolean {
    return this.hasValidToken();
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  private hasValidToken(): boolean {
    const token = this.getAccessToken();
    if (!token) {
      return false;
    }

    try {
      const payload = this.decodeToken(token);
      const currentTime = Math.floor(Date.now() / 1000);
      const isValid = payload.exp > currentTime;

      if (!isValid) {
        console.warn('⚠️ Token expired');
        this.clearAuthData();
      }

      return isValid;
    } catch {
      console.warn('⚠️ Invalid token');
      return false;
    }
  }

  decodeToken(token: string): any {
    try {
      return jwtDecode(token);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  getUserRole(): string | null {
    if (this.isAuthenticated()) {
      try {
        const token = this.getAccessToken();
        if (!token) return null;
        const decoded = this.decodeToken(token);
        return decoded?.role || null;
      } catch (error) {
        console.error('Error decoding token:', error);
        return null;
      }
    }
    return null;
  }

  // ==========================================
  // AUTH SUCCESS HANDLER
  // ==========================================

  private handleAuthSuccess(response: any): void {
    console.log('🔵 handleAuthSuccess called with:', response);

    if (response.data?.accessToken) {
      console.log('✅ Access token found');
      this.setTokens(response.data.accessToken, response.data.refreshToken);
    } else {
      console.warn('⚠️ No access token in response');
    }
  }

  // ==========================================
  // CLEAR AUTH DATA
  // ==========================================

  clearAuthData(): void {
    console.log('🔵 Clearing auth data');
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    console.log('✅ Auth data cleared');
  }

  // ==========================================
  // LOGIN METHODS
  // ==========================================

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API_URL}${API_ENDPOINTS.AUTH.LOGIN}`, credentials, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          console.log('🔵 Login response:', response);
          if (response.data?.accessToken) {
            this.handleAuthSuccess(response);
          }
        }),
        catchError(this.handleError.bind(this))
      );
  }

  confirmLogin(otp: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(
        `${this.API_URL}${API_ENDPOINTS.AUTH.CONFIRM_LOGIN}`,
        { otp },
        { withCredentials: true }
      )
      .pipe(
        tap((response) => {
          console.log('🔵 Confirm login response:', response);
          this.handleAuthSuccess(response);
        }),
        catchError(this.handleError.bind(this))
      );
  }

  // ==========================================
  // SOCIAL LOGIN METHODS
  // ==========================================

  loginWithGmail(socialData: SocialLoginData): Observable<any> {
    return this.http
      .post(`${this.API_URL}${API_ENDPOINTS.AUTH.GOOGLE_LOGIN}`, {
        idToken: socialData.token,
      })
      .pipe(
        tap((response: any) => {
          console.log('🔵 Google login response:', response);
          if (response.data?.accessToken) {
            this.handleAuthSuccess(response);
          }
        }),
        catchError(this.handleError.bind(this))
      );
  }

  registerWithGmail(socialData: SocialLoginData): Observable<any> {
    return this.http
      .post(`${this.API_URL}${API_ENDPOINTS.AUTH.GOOGLE_REGISTER}`, {
        idToken: socialData.token,
        ...socialData.userData,
      })
      .pipe(
        tap((response: any) => {
          console.log('🔵 Google register response:', response);
          if (response.data?.accessToken) {
            this.handleAuthSuccess(response);
          }
        }),
        catchError(this.handleError.bind(this))
      );
  }

  loginWithFacebook(socialData: SocialLoginData): Observable<any> {
    return this.http
      .post(`${this.API_URL}${API_ENDPOINTS.AUTH.FACEBOOK_LOGIN}`, {
        accessToken: socialData.token,
      })
      .pipe(
        tap((response: any) => {
          console.log('🔵 Facebook login response:', response);
          if (response.data?.accessToken) {
            this.handleAuthSuccess(response);
          }
        }),
        catchError(this.handleError.bind(this))
      );
  }

  registerWithFacebook(socialData: SocialLoginData): Observable<any> {
    return this.http
      .post(`${this.API_URL}${API_ENDPOINTS.AUTH.FACEBOOK_REGISTER}`, {
        accessToken: socialData.token,
        ...socialData.userData,
      })
      .pipe(
        tap((response: any) => {
          console.log('🔵 Facebook register response:', response);
          if (response.data?.accessToken) {
            this.handleAuthSuccess(response);
          }
        }),
        catchError(this.handleError.bind(this))
      );
  }

  socialAuth(data: SocialLoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API_URL}${API_ENDPOINTS.AUTH.GOOGLE_LOGIN}`, data, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.data?.accessToken) {
            this.handleAuthSuccess(response);
          }
        }),
        catchError(this.handleError.bind(this))
      );
  }

  // ==========================================
  // REGISTER & OTHER METHODS
  // ==========================================

  register(data: RegisterRequest): Observable<RegisterResponse> {
    return this.http
      .post<RegisterResponse>(`${this.API_URL}${API_ENDPOINTS.AUTH.REGISTER}`, data, {
        withCredentials: true,
      })
      .pipe(catchError(this.handleError.bind(this)));
  }

  verifyEmail(data: { otp: string }): Observable<any> {
    return this.http
      .post(`${this.API_URL}${API_ENDPOINTS.AUTH.VERIFY_EMAIL}`, data, {
        headers: new HttpHeaders().set('Content-Type', 'application/json'),
        withCredentials: true,
      })
      .pipe(catchError(this.handleError.bind(this)));
  }

  resendVerificationEmail(data: { email: string }): Observable<any> {
    return this.http
      .post(`${this.API_URL}${API_ENDPOINTS.AUTH.RESEND_VERIFICATION}`, data, {
        withCredentials: true,
      })
      .pipe(catchError(this.handleError.bind(this)));
  }

  logout(): Observable<any> {
    const token = this.getAccessToken();

    return this.http
      .post(
        `${this.API_URL}${API_ENDPOINTS.AUTH.LOGOUT}`,
        { flag: 'all' },
        {
          headers: new HttpHeaders().set('Authorization', `Bearer ${token}`),
        }
      )
      .pipe(
        tap(() => {
          this.clearAuthData();
          this.router.navigate(['/auth/login']);
        }),
        catchError((error) => {
          this.clearAuthData();
          this.router.navigate(['/auth/login']);
          return throwError(() => error);
        })
      );
  }

  forgotPassword(data: ForgotPasswordRequest): Observable<any> {
    return this.http
      .post(`${this.API_URL}${API_ENDPOINTS.AUTH.FORGOT_PASSWORD}`, data)
      .pipe(catchError(this.handleError.bind(this)));
  }

  resetPassword(data: ResetPasswordRequest): Observable<any> {
    return this.http
      .post(`${this.API_URL}${API_ENDPOINTS.AUTH.RESET_PASSWORD}`, data)
      .pipe(catchError(this.handleError.bind(this)));
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http
      .post<AuthResponse>(`${this.API_URL}${API_ENDPOINTS.AUTH.REFRESH_TOKEN}`, { refreshToken })
      .pipe(
        tap((response) => {
          if (response.data?.accessToken) {
            this.setTokens(response.data.accessToken, response.data.refreshToken);
          }
        }),
        catchError((error) => {
          this.clearAuthData();
          return throwError(() => error);
        })
      );
  }

  socialSignOut(): Observable<void> {
    return from(this.socialAuthService.signOut());
  }

  redirectToDashboard(): void {
    const role = this.getUserRole();
    console.log('🔵 Redirecting to dashboard, role:', role);

    switch (role) {
      case 'admin':
        this.router.navigate(['/dashboard/admin']);
        break;
      case 'publisher':
        this.router.navigate(['/dashboard/publisher']);
        break;
      case 'user':
        this.router.navigate(['/dashboard/user']);
        break;
      default:
        console.warn('⚠️ Unknown role, redirecting to home');
        this.router.navigate(['/']);
    }
  }

  private handleError(error: any): Observable<never> {
    console.error('❌ An error occurred:', error);
    return throwError(() => error);
  }

  // DEPRECATED - Keeping for backwards compatibility but not used
  setCurrentUser(user: IUser): void {
    console.warn('⚠️ setCurrentUser is deprecated. User is now extracted from token.');
    // Do nothing - user comes from token now
  }
}
