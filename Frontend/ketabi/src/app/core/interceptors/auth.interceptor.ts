import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { catchError, switchMap, filter, take, retry, delay } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const AuthInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (isPublicAuthEndpoint(req.url)) {
    return next(req);
  }

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
    retry({
      count: 1,
      delay: (error) => {
        if (error instanceof HttpErrorResponse && (error.status === 0 || error.status >= 500)) {
          return of(error).pipe(delay(1000));
        }
        throw error;
      },
    }),
    catchError((error) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401) {
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
        if (error.status === 403) {
          const errorMessage = error.error?.message || '';

          if (
            errorMessage.includes('User not found') ||
            errorMessage.includes('User is inactive') ||
            errorMessage.includes('User deleted') ||
            error.error?.userDeleted
          ) {
            handleUserDeletion(authService, router);
            return throwError(() => new Error('User account no longer exists'));
          }
        }

        if (error.error?.shouldLogout || error.error?.userDeleted) {
          handleUserDeletion(authService, router);
          return throwError(() => new Error('User session invalidated'));
        }

        if (error.status === 0) {
          console.error('❌ Network error - server may be down');
          return throwError(() => new Error('Network error - please check your connection'));
        }
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

        if (err instanceof HttpErrorResponse) {
          const errorMessage = err.error?.message || '';
          if (
            errorMessage.includes('User not found') ||
            errorMessage.includes('User deleted') ||
            err.error?.userDeleted
          ) {
            handleUserDeletion(authService, router);
            return throwError(() => new Error('User account deleted'));
          }
        }

        authService.clearAuthData();
        router.navigate(['/auth/login'], {
          queryParams: { reason: 'session_expired' },
        });
        return throwError(() => err);
      })
    );
  } else {
    return refreshTokenSubject.pipe(
      filter((token) => token !== null),
      take(1),
      switchMap((token) => next(addTokenToRequest(req, token!)))
    );
  }
}

function handleUserDeletion(authService: AuthService, router: Router): void {
  isRefreshing = false;
  refreshTokenSubject.next(null);
  authService.clearAuthData();
  router.navigate(['/auth/login'], {
    queryParams: { reason: 'account_deleted' },
  });
}

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
  return publicEndpoints.some((endpoint) => url.includes(endpoint));
}
