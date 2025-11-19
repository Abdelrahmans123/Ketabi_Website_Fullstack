import { SocialAuthService } from '@abacritt/angularx-social-login';
import { jwtDecode } from 'jwt-decode';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, from, Observable, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
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
import { NotificationService } from './notification.service';
import { AuthTokens } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = environment.apiBaseUrl || 'http://localhost:3000/api';
  private readonly TOKEN_KEY = 'token';
  private readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private readonly SESSION_ID_KEY = 'sessionId';
  private readonly ACTIVE_SESSION_KEY = 'activeSession';
  private currentSessionId: string | null = null;
  private accessTokenSubject = new BehaviorSubject<string | null>(null);
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);
  private currentUserSubject = new BehaviorSubject<IUser | null>(this.getUserFromToken());
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasValidToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private hasLogOutSubject = new BehaviorSubject(false);
  public hasLogOut$ = this.hasLogOutSubject.asObservable();

  private isLoggingIn = false; // Flag to prevent session check during login
  private authStateSubject = new BehaviorSubject<boolean>(this.isLoggedIn());
  public authState$: Observable<boolean> = this.authStateSubject.asObservable();
  private authRole = new BehaviorSubject<string | null>(this.getUserRole());
  public authRole$ = this.authRole.asObservable();
  constructor(
    private http: HttpClient,
    private router: Router,
    private socialAuthService: SocialAuthService,
    private notificationService: NotificationService
  ) {
    this.checkSessionValidity();
    this.listenToStorageEvents();
  }

  getCurrentUserId(): string | null {
    const user = this.currentUserSubject.value;
    return user ? user.id : null;
  }
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  getCurrentUserName(): string | null {
    const user = this.currentUserSubject.value;
    return user ? user.name : null;
  }
  getAdminId(): Observable<string> {
    return this.http.get<{ adminId: string }>(`${this.API_URL}/admin/id`).pipe(
      map((response) => response.adminId),
      catchError((error) => {
        console.error('Error fetching admin ID:', error);
        return throwError(() => error);
      })
    );
  }
  private listenToStorageEvents(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('storage', (event: StorageEvent) => {
      try {
        if (this.isLoggingIn) {
          return;
        }
        const timeSinceInit = Date.now() - (this.initTime || Date.now());
        if (timeSinceInit < 2000) {
          return;
        }
        if (event.key === this.ACTIVE_SESSION_KEY) {
          const newActiveSession = event.newValue;
          const oldActiveSession = event.oldValue;
          if (!newActiveSession || !oldActiveSession) {
            return;
          }
          if (
            newActiveSession !== oldActiveSession &&
            this.currentSessionId &&
            this.currentSessionId === oldActiveSession
          ) {
            try {
              const token = localStorage.getItem(this.TOKEN_KEY);
              if (token) {
                const decoded: any = jwtDecode(token);
                const currentUserId = decoded._id || decoded.id || decoded.userId || decoded.sub;
              }
            } catch (error) {
              console.error('Error checking user ID:', error);
            }
          }
        }

        if (event.key === this.TOKEN_KEY && event.oldValue && !event.newValue) {
          this.handleForcedLogout();
        }
      } catch (error) {
        console.error('❌ Error in storage event listener:', error);
      }
    });
  }
  private initTime = Date.now();

  getCurrentUserRole(): string | null {
    const token = this.getAccessToken();
    if (token) {
      const decoded = this.decodeToken(token);
      return decoded.role || null;
    }
    return null;
  }
  private checkSessionValidity(): void {
    try {
      if (this.isLoggingIn) {
        return;
      }

      const activeSession = localStorage.getItem(this.ACTIVE_SESSION_KEY);
      const storedSessionId = localStorage.getItem(this.SESSION_ID_KEY);
      const token = localStorage.getItem(this.TOKEN_KEY);
      if (storedSessionId) {
        this.currentSessionId = storedSessionId;
      }
      if (!token || !storedSessionId) {
        return;
      }
      if (!this.hasValidToken()) {
        console.log('Token expired on reload');
        this.clearAuthData();
        return;
      }
      if (
        typeof window !== 'undefined' &&
        activeSession &&
        storedSessionId &&
        activeSession !== storedSessionId
      ) {
        try {
          const currentUser = this.getUserFromToken();

          if (currentUser) {
            this.currentSessionId = storedSessionId;
            localStorage.setItem(this.ACTIVE_SESSION_KEY, storedSessionId);
          } else {
            console.log('Could not verify user from token');
          }
        } catch (error) {
          console.error('Error verifying session:', error);
        }
      }
    } catch (error) {
      console.error('Error in checkSessionValidity:', error);
    }
  }
  private handleForcedLogout(): void {
    this.clearAuthData();
    this.showLogoutNotification();
    this.router.navigate(['/auth/login'], {
      queryParams: { reason: 'session_expired' },
    });
  }

  private showLogoutNotification(): void {
    this.notificationService.warning(
      'You have been logged out because you signed in on another tab or device.',
      6000
    );
  }

  setTokens(accessToken: string, refreshToken: string): void {
    this.isLoggingIn = true;
    this.currentSessionId = this.generateSessionId();
    localStorage.setItem(this.ACTIVE_SESSION_KEY, this.currentSessionId);
    localStorage.setItem(this.TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(this.SESSION_ID_KEY, this.currentSessionId);
    const user = this.getUserFromToken();
    this.isAuthenticatedSubject.next(true);
    this.currentUserSubject.next(user);
    setTimeout(() => {
      this.isLoggingIn = false;
    }, 500);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }
  setAccessToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    this.accessTokenSubject.next(token);
  }

  getCurrentUser(): IUser | null {
    return this.getUserFromToken();
  }

  private getUserFromToken(): IUser | null {
    const token = this.getAccessToken();
    if (!token) {
      return null;
    }

    try {
      const decoded: any = jwtDecode(token);

      const user: IUser = {
        id: decoded._id || decoded.id || decoded.userId || decoded.sub,
        name: decoded.name || `${decoded.firstName || ''} ${decoded.lastName || ''}`.trim(),
        email: decoded.email,
        role: decoded.role || 'user',
        phone: decoded.phone || '',
        gender: decoded.gender || '',
        address: decoded.address || '',
      };
      return user;
    } catch (error) {
      console.error('❌ Error decoding token:', error);
      return null;
    }
  }

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
        this.clearAuthData();
      }

      return isValid;
    } catch {
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

  private handleAuthSuccess(response: any): void {
    if (response.data?.accessToken) {
      this.setTokens(response.data.accessToken, response.data.refreshToken);
    } else {
      console.warn('No access token in response');
    }
  }

  clearAuthData(): void {
    try {
      const currentActiveSession = localStorage.getItem(this.ACTIVE_SESSION_KEY);
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.SESSION_ID_KEY);
      if (currentActiveSession === this.currentSessionId) {
        localStorage.removeItem(this.ACTIVE_SESSION_KEY);
      }

      this.currentSessionId = null;
      this.currentUserSubject.next(null);
      this.isAuthenticatedSubject.next(false);
      this.hasLogOutSubject.next(true);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API_URL}${API_ENDPOINTS.AUTH.LOGIN}`, credentials, {
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

  confirmLogin(otp: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(
        `${this.API_URL}${API_ENDPOINTS.AUTH.CONFIRM_LOGIN}`,
        { otp },
        { withCredentials: true }
      )
      .pipe(
        tap((response) => {
          this.handleAuthSuccess(response);
        }),
        catchError(this.handleError.bind(this))
      );
  }

  loginWithGmail(socialData: SocialLoginData): Observable<any> {
    return this.http
      .post(`${this.API_URL}${API_ENDPOINTS.AUTH.GOOGLE_LOGIN}`, {
        idToken: socialData.token,
      })
      .pipe(
        tap((response: any) => {
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
      .post(`${this.API_URL}${API_ENDPOINTS.AUTH.FORGOT_PASSWORD}`, data, {
        withCredentials: true,
      })
      .pipe(catchError(this.handleError.bind(this)));
  }

  resetPassword(data: ResetPasswordRequest): Observable<any> {
    return this.http
      .post(`${this.API_URL}${API_ENDPOINTS.AUTH.RESET_PASSWORD}`, data, {
        withCredentials: true,
      })
      .pipe(catchError(this.handleError.bind(this)));
  }
  setRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
    this.refreshTokenSubject.next(token);
  }

  refreshToken(): Observable<any> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    // Send refresh token in the Authorization header
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${refreshToken}`, // Send refresh token as Bearer token
    });

    return this.http
      .post<any>(
        `${this.API_URL}/auth/refresh`,
        {}, // Empty body, token is in header
        { headers }
      )
      .pipe(
        tap((response) => {
          // Save the new access token
          if (response.data?.accessToken) {
            this.setAccessToken(response.data.accessToken);
          } else if (response.accessToken) {
            this.setAccessToken(response.accessToken);
          }

          // If a new refresh token is provided, update it
          if (response.data?.refreshToken) {
            this.setRefreshToken(response.data.refreshToken);
          } else if (response.refreshToken) {
            this.setRefreshToken(response.refreshToken);
          }
        })
      );
  }

  socialSignOut(): Observable<void> {
    return from(this.socialAuthService.signOut());
  }

  redirectToDashboard(): void {
    const role = this.getUserRole();
    switch (role) {
      case 'admin':
        this.router.navigate(['/admin/dashboard']);
        break;
      case 'publisher':
        this.router.navigate(['/dashboard/publisher']);
        break;
      case 'user':
        this.router.navigate(['/home']);
        break;
      default:
        this.router.navigate(['/']);
    }
  }

  private handleError(error: any): Observable<never> {
    console.error('An error occurred:', error);
    return throwError(() => error);
  }

  // DEPRECATED - Keeping for backwards compatibility but not used
  setCurrentUser(user: IUser): void {
    console.warn('⚠️ setCurrentUser is deprecated. User is now extracted from token.');
    // Do nothing - user comes from token now
  }
}
