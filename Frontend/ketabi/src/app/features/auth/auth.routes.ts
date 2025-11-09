import { Routes } from '@angular/router';
import { LoginGuard } from '../../core/guards/login.guard';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginPageComponent),
    title: 'Login',
    canActivate: [LoginGuard],
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.component').then((m) => m.RegisterPageComponent),
    title: 'Register',
  },
  //   {
  //     path: 'forgot-password',
  //     loadComponent: () =>
  //       import('./pages/forgot-password-page/forgot-password-page.component').then(
  //         (m) => m.ForgotPasswordPageComponent
  //       ),
  //     title: 'Forgot Password',
  //   },
  //   {
  //     path: 'reset-password/:token',
  //     loadComponent: () =>
  //       import('./pages/reset-password-page/reset-password-page.component').then(
  //         (m) => m.ResetPasswordPageComponent
  //       ),
  //     title: 'Reset Password',
  //   },
];
