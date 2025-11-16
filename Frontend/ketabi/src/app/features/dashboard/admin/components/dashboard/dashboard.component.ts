import { Component } from '@angular/core';
import { ChatComponent } from '../../../../../shared/components/chat/chat.component';

@Component({
  selector: 'app-dashboard.component',
  imports: [ChatComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  isUserLoggedIn = false;
  role: string | null = null;

  constructor() {
    // You would typically get these values from an AuthService
    // For demonstration, we'll set them statically
    this.isUserLoggedIn = true; // Set to true or false based on actual auth state
    this.role = 'admin'; // Set to 'user', 'admin', etc. based on actual user role
  }
}
