import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  FacebookLoginProvider,
  GoogleLoginProvider,
  GoogleSigninButtonModule,
  SocialAuthService,
  SocialUser,
} from '@abacritt/angularx-social-login';
import { SocialLoginEvent } from '../../models/login.model';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, GoogleSigninButtonModule],
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.css'],
})
export class LoginFormComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @Input() isLoading = false;
  @Input() errorMessage = '';
  @Input() showOtpInput = false;

  @Output() submitLogin = new EventEmitter<{ email: string; password: string }>();
  @Output() submitOtp = new EventEmitter<string>();
  @Output() resendOtpClick = new EventEmitter<void>();
  @Output() socialLogin = new EventEmitter<SocialLoginEvent>();

  showPassword = false;
  rememberMe = false;

  credentials = {
    email: '',
    password: '',
  };

  otpDigits: string[] = ['', '', '', '', '', ''];
  otpError: string = '';
  resendTimer: number = 0;
  private resendInterval: any;

  @ViewChild('otp0') otp0!: ElementRef;
  @ViewChild('otp1') otp1!: ElementRef;
  @ViewChild('otp2') otp2!: ElementRef;
  @ViewChild('otp3') otp3!: ElementRef;
  @ViewChild('otp4') otp4!: ElementRef;
  @ViewChild('otp5') otp5!: ElementRef;

  ngOnInit() {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      this.credentials.email = rememberedEmail;
      this.rememberMe = true;
    }
  }
  constructor(private socialAuthService: SocialAuthService) {
    this.socialAuthService.authState.subscribe((user) => {
      if (user) {
        this.handleSocialUser(user);
      }
    });
  }

  private handleSocialUser(user: any) {
    const provider = user.provider === 'GOOGLE' ? 'google' : 'facebook';

    this.socialLogin.emit({
      token: user.idToken || user.authToken,
      userData: user,
      provider: provider as 'google' | 'facebook',
    });
  }
  ngAfterViewInit() {
    if (this.showOtpInput) {
      setTimeout(() => this.otp0?.nativeElement?.focus(), 100);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['showOtpInput'] && changes['showOtpInput'].currentValue) {
      setTimeout(() => this.otp0?.nativeElement?.focus(), 200);
    }
  }

  ngOnDestroy() {
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.rememberMe) {
      localStorage.setItem('rememberedEmail', this.credentials.email);
    } else {
      localStorage.removeItem('rememberedEmail');
    }
    this.submitLogin.emit({
      email: this.credentials.email,
      password: this.credentials.password,
    });
  }

  onOtpInput(event: any, index: number) {
    const input = event.target;
    const value = input.value;

    if (value && !/^[0-9]$/.test(value)) {
      this.otpDigits[index] = '';
      return;
    }

    if (value && index < 5) {
      const nextInput = this.getOtpInput(index + 1);
      nextInput?.focus();
    }

    if (this.isOtpComplete()) {
      setTimeout(() => this.onOtpSubmit(), 100);
    }

    this.otpError = '';
  }

  onOtpKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace') {
      if (!this.otpDigits[index] && index > 0) {
        const prevInput = this.getOtpInput(index - 1);
        prevInput?.focus();
      }
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      const prevInput = this.getOtpInput(index - 1);
      prevInput?.focus();
    }

    if (event.key === 'ArrowRight' && index < 5) {
      event.preventDefault();
      const nextInput = this.getOtpInput(index + 1);
      nextInput?.focus();
    }
  }

  onOtpPaste(event: ClipboardEvent) {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text') || '';
    const digits = pastedData.replace(/\D/g, '').split('').slice(0, 6);

    digits.forEach((digit, index) => {
      this.otpDigits[index] = digit;
    });

    const lastIndex = Math.min(digits.length, 5);
    const lastInput = this.getOtpInput(lastIndex);
    lastInput?.focus();

    if (this.isOtpComplete()) {
      setTimeout(() => this.onOtpSubmit(), 100);
    }

    this.otpError = '';
  }

  getOtpInput(index: number): HTMLInputElement | null {
    const inputs = [this.otp0, this.otp1, this.otp2, this.otp3, this.otp4, this.otp5];
    return inputs[index]?.nativeElement || null;
  }

  isOtpComplete(): boolean {
    return this.otpDigits.every((digit) => digit !== '');
  }

  getOtpCode(): string {
    return this.otpDigits.join('');
  }

  onOtpSubmit() {
    if (!this.isOtpComplete()) {
      this.otpError = 'Please enter all 6 digits';
      return;
    }

    const otpCode = this.getOtpCode();
    this.submitOtp.emit(otpCode);
  }

  onResendOtp(event: Event) {
    event.preventDefault();

    if (this.resendTimer > 0) return;
    this.resendTimer = 60;
    this.resendInterval = setInterval(() => {
      this.resendTimer--;
      if (this.resendTimer <= 0) {
        clearInterval(this.resendInterval);
      }
    }, 1000);

    this.otpDigits = ['', '', '', '', '', ''];
    this.otpError = '';

    setTimeout(() => this.otp0?.nativeElement?.focus(), 100);

    this.resendOtpClick.emit();
  }

  signInWithGoogle(): void {
    this.socialAuthService
      .signIn(GoogleLoginProvider.PROVIDER_ID)
      .then((user: SocialUser) => {
        this.socialLogin.emit({
          token: user.idToken ? user.idToken : '',
          userData: {
            email: user.email ? user.email : '',
            name: user.name ? user.name : '',
            firstName: user.firstName ? user.firstName : '',
            lastName: user.lastName ? user.lastName : '',
            photoUrl: user.photoUrl ? user.photoUrl : '',
          },
          provider: 'google',
        });
      })
      .catch((error) => {
        console.error('Google sign-in error:', error);

        if (
          error &&
          (error.error === 'popup_closed_by_user' ||
            error.error === 'popup_blocked_by_browser' ||
            error.message?.includes('popup') ||
            error.message?.includes('blocked'))
        ) {
          Swal.fire({
            icon: 'warning',
            title: 'Sign-in Cancelled',
            text: 'You closed the sign-in popup before completing the process.',
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Sign-in Failed',
            text: 'Google sign-in failed. Please try again or use email registration.',
          });
        }
      });
  }
  handleGoogleLogin() {}
  signInWithFacebook(): void {
    this.socialAuthService
      .signIn(FacebookLoginProvider.PROVIDER_ID)
      .then((user: SocialUser) => {
        this.socialLogin.emit({
          token: user.authToken ? user.authToken : '',
          userData: {
            email: user.email ? user.email : '',
            name: user.name ? user.name : '',
            photoUrl: user.photoUrl ? user.photoUrl : '',
            lastName: user.lastName ? user.lastName : '',
            firstName: user.firstName ? user.firstName : '',
          },
          provider: 'facebook',
        });
      })
      .catch((error) => {
        console.error('Facebook sign-in error:', error);
        Swal.fire({
          icon: 'error',
          title: 'Sign-in Failed',
          text: 'Facebook sign-in failed. Please try again or use email registration.',
        });
      });
  }

  clearError() {
    this.errorMessage = '';
    this.otpError = '';
  }

  resetOtp() {
    this.otpDigits = ['', '', '', '', '', ''];
    this.otpError = '';
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
      this.resendTimer = 0;
    }
  }

  backToLogin(event: Event) {
    event.preventDefault();
    this.showOtpInput = false;
    this.resetOtp();
    this.errorMessage = '';
  }
}
