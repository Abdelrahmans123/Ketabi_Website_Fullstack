import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// State management for token refresh
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const AuthInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Skip token injection for public auth endpoints (but NOT refresh)
  if (isPublicAuthEndpoint(req.url)) {
    return next(req);
  }

  // Add access token to request (except for refresh endpoint which needs refresh token)
  if (!req.url.includes('/auth/refresh')) {
    const accessToken = authService.getAccessToken();
    if (accessToken) {
      req = addTokenToRequest(req, accessToken);
    }
  } else {
    const refreshToken = authService.getRefreshToken();
    if (refreshToken) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${refreshToken}`,
        },
      });
    }
  }

  return next(req).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        // Don't retry if refresh token request itself failed
        if (req.url.includes('/auth/refresh')) {
          isRefreshing = false;
          authService.clearAuthData();
          router.navigate(['/auth/login'], {
            queryParams: { reason: 'session_expired' },
          });
          return throwError(() => new Error('Refresh token expired'));
        }
        return handle401Error(req, next, authService, router);
      }
      return throwError(() => error);
    })
  );
};

function addTokenToRequest(req: HttpRequest<any>, token: string): HttpRequest<any> {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}

function handle401Error(
  req: HttpRequest<any>,
  next: HttpHandlerFn,
  authService: AuthService,
  router: Router
): Observable<HttpEvent<any>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    const refreshToken = authService.getRefreshToken();

    if (!refreshToken) {
      isRefreshing = false;
      authService.clearAuthData();
      router.navigate(['/auth/login']);
      return throwError(() => new Error('No refresh token available'));
    }

    return authService.refreshToken().pipe(
      switchMap((response: any) => {
        isRefreshing = false;
        const newAccessToken = response.data?.accessToken || response.accessToken;

        if (!newAccessToken) {
          throw new Error('No access token in refresh response');
        }

        refreshTokenSubject.next(newAccessToken);
        authService.setTokens(newAccessToken, response.data?.refreshToken || response.refreshToken);
        return next(addTokenToRequest(req, newAccessToken));
      }),
      catchError((err) => {
        isRefreshing = false;
        authService.clearAuthData();
        router.navigate(['/auth/login'], {
          queryParams: { reason: 'session_expired' },
        });
        return throwError(() => err);
      })
    );
  } else {
    // Queue subsequent requests while refresh is in progress
    return refreshTokenSubject.pipe(
      filter((token) => token !== null),
      take(1),
      switchMap((token) => next(addTokenToRequest(req, token!)))
    );
  }
}

// Only skip public endpoints that don't need any authentication
function isPublicAuthEndpoint(url: string): boolean {
  const publicEndpoints = [
    '/auth/login',
    '/auth/register',
    '/auth/google-login',
    '/auth/facebook-login',
    '/auth/verify-email',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/confirm-login',
  ];
  // Note: /auth/refresh is NOT in this list - it needs the refresh token
  return publicEndpoints.some((endpoint) => url.includes(endpoint));
}
