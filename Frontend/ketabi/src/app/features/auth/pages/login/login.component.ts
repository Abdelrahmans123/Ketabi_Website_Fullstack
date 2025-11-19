import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { LoginRequest, SocialLoginEvent } from '../../models/login.model';
import { AuthResponse } from '../../models/auth-response.model';
import { LoginFormComponent } from '../../components/login-form/login-form.component';
import { SocialLoginData } from '../../components/register-form/register-form.component';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, LoginFormComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginPageComponent implements OnDestroy {
  isLoading = false;
  errorMessage = '';
  showOtpInput = false;

  otpTimer = 0;
  private otpTimerInterval: any;

  private lastCredentials?: LoginRequest;

  constructor(private authService: AuthService, private router: Router) {
    this.checkExistingSession();
  }

  ngOnDestroy() {
    this.clearOtpTimer();
  }

  private checkExistingSession() {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onLoginSubmit(credentials: { email: string; password: string }) {
    this.isLoading = true;
    this.errorMessage = '';
    this.lastCredentials = credentials;

    this.authService.login(credentials).subscribe({
      next: (response: AuthResponse) => {
        this.isLoading = false;
        this.handleLoginSuccess(response);
      },
      error: (error: any) => {
        this.isLoading = false;
        this.handleLoginError(error);
      },
    });
  }

  onOtpSubmit(otp: string) {
    if (!otp || otp.length !== 6) {
      this.errorMessage = 'Please enter a valid 6-digit code';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.confirmLogin(otp).subscribe({
      next: (response: AuthResponse) => {
        this.isLoading = false;
        this.handleLoginSuccess(response);
      },
      error: (error: any) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Invalid OTP. Please try again.';
      },
    });
  }

  onResendOtp() {
    if (this.otpTimer > 0) {
      return;
    }

    if (!this.lastCredentials) {
      this.errorMessage = 'Cannot resend OTP. Please try logging in again.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.lastCredentials).subscribe({
      next: () => {
        this.isLoading = false;
        this.startOtpTimer();
      },
      error: (error: any) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to resend code. Please try again.';
      },
    });
  }

  onSocialLogin(event: SocialLoginEvent) {
    const { token, userData, provider } = event;
    if (!token) {
      this.errorMessage = 'No authentication token received. Please try again.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    const loginData = { provider, token, userData };

    // First, try to login
    const loginEndpoint =
      provider === 'google'
        ? this.authService.loginWithGmail(loginData)
        : this.authService.loginWithFacebook(loginData);

    loginEndpoint.subscribe({
      next: (response) => {
        this.handleSuccessfulAuth(response, false);
      },
      error: (loginError) => {
        if (loginError.status === 404 || loginError.status === 401) {
          this.registerNewUser(token, userData, provider);
        } else if (
          loginError.status === 400 &&
          loginError.error?.message?.includes('verifyIdToken')
        ) {
          this.isLoading = false;
          this.errorMessage = 'Invalid authentication token. Please try signing in again.';
          console.error('Token verification failed:', loginError);
        } else {
          console.error('Login error:', loginError);
          this.isLoading = false;
          this.errorMessage =
            loginError.error?.message || 'An error occurred during login. Please try again.';
        }
      },
    });
  }
  handleGoogleLogin() {
    // Don't call signIn() - the button handles it automatically
    // The authState subscription above will catch the login
  }
  registerNewUser(token: string, userData: any, provider: 'google' | 'facebook') {
    let userPayload;

    if (provider === 'google') {
      userPayload = {
        email: userData.email || '',
        name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        photoUrl: userData.photoUrl || '',
      };
    } else {
      const firstName = userData.first_name || userData.firstName || '';
      const lastName = userData.last_name || userData.lastName || '';
      const fullName = userData.name || `${firstName} ${lastName}`.trim();

      userPayload = {
        email: userData.email || '',
        name: fullName,
        firstName: firstName,
        lastName: lastName,
        photoUrl: userData.picture?.data?.url || userData.photoUrl || '',
      };
    }
    const socialPayload: SocialLoginData = {
      provider,
      token,
      userData: userPayload,
    };

    const registerEndpoint =
      provider === 'google'
        ? this.authService.registerWithGmail(socialPayload)
        : this.authService.registerWithFacebook(socialPayload);

    registerEndpoint.subscribe({
      next: (response) => {
        this.handleSuccessfulAuth(response, true);
      },
      error: (regError) => {
        console.log('Registration error:', regError);
        this.isLoading = false;
        const errorMessage = regError.error?.message || 'Registration failed. Please try again.';
        this.errorMessage = errorMessage;
        console.error('Full registration error:', regError);
      },
    });
  }
  private handleLoginError(error: any) {
    this.isLoading = false;
    const status = error.status;
    const message = error.error?.message;

    switch (status) {
      case 401:
        this.errorMessage = 'Invalid Credentials. Please try again.';
        break;
      case 403:
        this.errorMessage = 'Account is locked. Please contact support.';
        break;
      case 404:
        this.errorMessage = 'Account not found';
        break;
      case 429:
        this.errorMessage = 'Too many attempts. Please try again later.';
        break;
      case 500:
        this.errorMessage = 'Server error. Please try again later.';
        break;
      default:
        this.errorMessage = message || 'Login failed. Please try again.';
    }
    console.error('Login error:', error);
  }

  private startOtpTimer() {
    this.clearOtpTimer();
    this.otpTimer = 60;

    this.otpTimerInterval = setInterval(() => {
      this.otpTimer--;
      if (this.otpTimer <= 0) {
        this.clearOtpTimer();
      }
    }, 1000);
  }

  private clearOtpTimer() {
    if (this.otpTimerInterval) {
      clearInterval(this.otpTimerInterval);
      this.otpTimerInterval = null;
    }
  }

  handleSuccessfulAuth(response: AuthResponse, isNewUser: boolean) {
    this.authService.redirectToDashboard();
  }

  private handleLoginSuccess(response: AuthResponse) {
    if (response.data?.accessToken) {
      this.authService.redirectToDashboard();
    } else {
      this.showOtpInput = true;
      this.startOtpTimer();
    }
  }
}
