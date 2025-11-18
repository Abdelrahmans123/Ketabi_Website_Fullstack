import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-topbar',
  imports: [],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css',
})
export class TopbarComponent {
  userName = '';
  role = '';
  isUserLoggedIn = false;
  constructor(private router: Router, private authService: AuthService) {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {;
      this.router.navigate(['/auth/login']);
      return;
    }
    this.isUserLoggedIn = true;
    this.role = currentUser.role;
    this.userName = currentUser.name || 'Admin User';
  }
}
