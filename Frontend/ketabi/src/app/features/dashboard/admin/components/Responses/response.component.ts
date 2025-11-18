import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ResponseService } from '../../../../../core/services/response.service';
import { ChatComponent } from '../../../../../shared/components/chat/chat.component';
import Swal from 'sweetalert2';
import { SidebarComponent } from '../../../../../shared/components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../../../shared/components/topbar/topbar.component';
interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  avatar?: string;
}

interface Response {
  _id: string;
  userId: string;
  user?: User;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-publisher-requests',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ChatComponent,
    SidebarComponent,
    TopbarComponent,
  ],
  templateUrl: './response.component.html',
  styleUrls: ['./response.component.css'],
})
export class PublisherRequestsComponent implements OnInit, OnDestroy {
  // Sidebar and Navigation
  sidebarCollapsed = false;
  isUserLoggedIn = true;
  role = 'admin';
  isAdmin = false;
  userName = 'Admin User';
  notificationCount = 3;
  selectedRequest: Response | null = null;
  menuItems: MenuItem[] = [
    { icon: 'fa-th-large', label: 'Dashboard', route: '/admin/dashboard' },
    { icon: 'fa-book', label: 'Books', route: '/admin/books' },
    { icon: 'fa-users', label: 'Users', route: '/admin/users' },
    { icon: 'fa-comments', label: 'Responses', route: '/admin/responses' },
  ];

  // Stats (Admin)
  totalRequests = 0;
  pendingRequests = 0;
  approvedRequests = 0;
  rejectedRequests = 0;

  // Data
  requests: Response[] = [];
  filteredRequests: Response[] = [];

  // User's Request
  userRequest: Response | null = null;
  hasActiveRequest = false;

  // Filters (Admin)
  searchTerm = '';
  selectedStatus = '';
  sortBy = 'newest';

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  Math = Math;

  // UI State
  loading = true;
  error = '';
  showRequestModal = false;
  showDetailModal = false;
  requestMessage = '';

  private destroy$ = new Subject<void>();

  constructor(private responseService: ResponseService, private router: Router) {}

  ngOnInit() {
    // Set isAdmin based on role
    this.isAdmin = this.role === 'admin';

    if (this.isAdmin) {
      this.loadRequests();
    } else {
      this.loadUserRequest();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRequests() {
    this.loading = true;
    this.error = ''; 


    this.responseService
      .getAllResponses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.status?.toLowerCase() === 'success') {
            const data = response.data || [];
            this.requests = Array.isArray(data)
              ? data.map((r: any) => {
                  const user = r.userId && typeof r.userId === 'object' ? r.userId : null;
                  return {
                    _id: r._id || '',
                    userId: typeof r.userId === 'string' ? r.userId : user?._id || '',
                    user: user
                      ? {
                          _id: user._id || '',
                          name: user.name || 'Unknown User',
                          email: user.email || 'N/A',
                          phone: user.phone,
                          role: user.role || 'user',
                          avatar: user.avatar,
                        }
                      : undefined,
                    message: r.message || '',
                    status: ['approved', 'rejected', 'pending'].includes(r.status)
                      ? r.status
                      : 'pending',
                    createdAt: r.createdAt || new Date().toISOString(),
                    updatedAt: r.updatedAt || new Date().toISOString(),
                  };
                })
              : [];

            this.filteredRequests = [...this.requests];
            this.updateStats();
            this.applyFilters();
            this.updatePagination();
            this.loading = false;
          } else {
            this.error = response.message || 'Failed to load requests';
            console.error('API returned non-success status:', response.status);
            this.loading = false;
          }
        },
        error: (error) => {
          console.error('Error loading requests:', error);
          this.error = error.error?.message || 'Failed to load requests. Please try again.';
          this.loading = false;
          this.requests = [];
          this.filteredRequests = [];
          this.updateStats();
        },
      });
  }

  loadUserRequest() {
    this.loading = true;
    this.error = '';

    this.responseService
      .getUserResponses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.status === 'success' && response.data.length > 0) {
            this.userRequest = response.data[0];
            this.hasActiveRequest = true;
          } else {
            this.userRequest = null;
            this.hasActiveRequest = false;
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading user request:', error);
          this.error = error.error?.message || 'Failed to load your request. Please try again.';
          this.loading = false;
        },
      });
  }

  updateStats() {
    this.totalRequests = this.requests.length;
    this.pendingRequests = this.requests.filter((r) => r.status === 'pending').length;
    this.approvedRequests = this.requests.filter((r) => r.status === 'approved').length;
    this.rejectedRequests = this.requests.filter((r) => r.status === 'rejected').length;
  }


  onSearch() {
    this.applyFilters();
  }

  onFilterChange() {
    this.currentPage = 1;
    this.applyFilters();
  }

  onSortChange() {
    this.applyFilters();
  }

  applyFilters() {
    this.filteredRequests = this.requests.filter((request) => {
      const matchesSearch =
        !this.searchTerm ||
        request.user?.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        request.message.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus = !this.selectedStatus || request.status === this.selectedStatus;

      return matchesSearch && matchesStatus;
    });

    // Apply sorting
    if (this.sortBy === 'newest') {
      this.filteredRequests.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else {
      this.filteredRequests.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }

    this.updatePagination();
  }

  resetFilters() {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.sortBy = 'newest';
    this.currentPage = 1;
    this.applyFilters();
  }

  // Pagination
  updatePagination() {
    this.totalPages = Math.ceil(this.filteredRequests.length / this.pageSize);
    if (this.currentPage > this.totalPages) {
      this.currentPage = Math.max(1, this.totalPages);
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;

    if (this.totalPages <= maxVisible) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      let start = Math.max(2, this.currentPage - 1);
      let end = Math.min(this.totalPages - 1, this.currentPage + 1);

      if (this.currentPage <= 3) {
        end = 4;
      } else if (this.currentPage >= this.totalPages - 2) {
        start = this.totalPages - 3;
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      pages.push(this.totalPages);
    }

    return pages;
  }

  onPageSizeChange() {
    this.currentPage = 1;
    this.updatePagination();
  }

  // Request Actions (User)
  openRequestModal() {
    this.requestMessage = '';
    this.showRequestModal = true;
  }

  closeRequestModal() {
    this.showRequestModal = false;
    this.requestMessage = '';
  }

  submitRequest() {
    if (this.requestMessage.length < 50) {
      return;
    }

    this.responseService
      .createResponse({ message: this.requestMessage })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.status === 'success') {
            this.userRequest = response.data;
            this.hasActiveRequest = true;
            this.closeRequestModal();
            Swal.fire({
              icon: 'success',
              title: 'Success!',
              text: 'Your publisher request has been submitted successfully!',
              confirmButtonText: 'OK',
            });
          } else {
            Swal.fire({
              icon: 'error',
              title: 'Error!',
              text: response.message || 'Failed to submit request',
              confirmButtonText: 'OK',
            });
          }
        },
        error: (error) => {
          console.error('Error submitting request:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: error.error?.message || 'Failed to submit request',
            confirmButtonText: 'OK',
          });
        },
      });
  }

  // Request Actions (Admin)
  viewRequest(request: Response) {
    this.selectedRequest = request;
    this.showDetailModal = true;
  }

  closeDetailModal() {
    this.showDetailModal = false;
    this.selectedRequest = null;
  }

  approveRequest(request: Response) {
    Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to approve ${request.user?.name}'s publisher request?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, approve it!',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.responseService
          .updateResponse(request._id, { status: 'approved' })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              // Fix: Case-insensitive check
              if (response.status?.toLowerCase() === 'success') {
                const index = this.requests.findIndex((r) => r._id === request._id);
                if (index !== -1) {
                  this.requests[index].status = 'approved';
                }
                this.applyFilters();
                this.updateStats();
                this.closeDetailModal();
                Swal.fire({
                  icon: 'success',
                  title: 'Success!',
                  text: 'Publisher request approved successfully!',
                  confirmButtonText: 'OK',
                });
              } else {
                Swal.fire({
                  icon: 'error',
                  title: 'Error!',
                  text: response.message || 'Failed to approve request',
                  confirmButtonText: 'OK',
                });
              }
            },
            error: (error) => {
              console.error('Error approving request:', error);
              Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: error.error?.message || 'Failed to approve request',
                confirmButtonText: 'OK',
              });
            },
          });
      }
    });
  }

  rejectRequest(request: Response) {
    Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to reject ${request.user?.name}'s publisher request?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, reject it!',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.responseService
          .updateResponse(request._id, { status: 'rejected' })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              // Fix: Case-insensitive check
              if (response.status?.toLowerCase() === 'success') {
                const index = this.requests.findIndex((r) => r._id === request._id);
                if (index !== -1) {
                  this.requests[index].status = 'rejected';
                }
                this.applyFilters();
                this.updateStats();
                this.closeDetailModal();
                Swal.fire({
                  icon: 'success',
                  title: 'Success!',
                  text: 'Publisher request rejected.',
                  confirmButtonText: 'OK',
                });
              } else {
                Swal.fire({
                  icon: 'error',
                  title: 'Error!',
                  text: response.message || 'Failed to reject request',
                  confirmButtonText: 'OK',
                });
              }
            },
            error: (error) => {
              console.error('Error rejecting request:', error);
              Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: error.error?.message || 'Failed to reject request',
                confirmButtonText: 'OK',
              });
            },
          });
      }
    });
  }

  deleteRequest(request: Response) {
    Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete ${request.user?.name}'s publisher request? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.responseService
          .deleteResponse(request._id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              // Fix: Case-insensitive check
              if (response.status?.toLowerCase() === 'success') {
                this.requests = this.requests.filter((r) => r._id !== request._id);
                this.applyFilters();
                this.updateStats();
                Swal.fire({
                  icon: 'success',
                  title: 'Success!',
                  text: 'Request deleted successfully!',
                  confirmButtonText: 'OK',
                });
              } else {
                Swal.fire({
                  icon: 'error',
                  title: 'Error!',
                  text: response.message || 'Failed to delete request',
                  confirmButtonText: 'OK',
                });
              }
            },
            error: (error) => {
              console.error('Error deleting request:', error);
              Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: error.error?.message || 'Failed to delete request',
                confirmButtonText: 'OK',
              });
            },
          });
      }
    });
  }
  getPaginatedRequests(): Response[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredRequests.slice(startIndex, endIndex);
  }
  // Helper Methods
  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      pending: 'fas fa-clock',
      approved: 'fas fa-check-circle',
      rejected: 'fas fa-times-circle',
    };
    return icons[status] || 'fas fa-question-circle';
  }

  truncateMessage(message: string, length: number = 100): string {
    if (message.length <= length) return message;
    return message.substring(0, length) + '...';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatRelativeDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }
}
