import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
export interface Message {
  content: string;
  sendTo: string;
  from: string;
  timestamp?: string;
}

export interface UserStatus {
  userId: string;
  status: 'online' | 'offline';
  name: string;
}

export interface SystemMessage {
  type: string;
  message: string;
  timestamp: string;
}

export interface TypingStatus {
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface NotificationPayload {
  _id?: string;
  userId?: string;
  type?: string;
  title?: string;
  content?: string;
  message?: string;
  data?: {
    bookId?: string;
    bookName?: string;
    author?: string;
    oldPrice?: number;
    newPrice?: number;
    price?: number;
    discountPercentage?: number;
    savings?: number;
    stock?: number;
    coverImage?: string;
    [key: string]: any;
  };
  createdAt?: string;
  timestamp?: string;
  isRead?: boolean;
  priority?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket!: Socket;
  private messageSubject = new Subject<Message>();
  private successMessageSubject = new Subject<Message>();
  private userStatusSubject = new Subject<UserStatus>();
  private systemMessageSubject = new Subject<SystemMessage>();
  private notificationSubject = new Subject<NotificationPayload>();
  private errorSubject = new Subject<{ message: string }>();
  private connectionStatus = new BehaviorSubject<boolean>(false);
  private typingSubject = new Subject<TypingStatus>();

  public messages$ = this.messageSubject.asObservable();
  public successMessages$ = this.successMessageSubject.asObservable();
  public userStatus$ = this.userStatusSubject.asObservable();
  public systemMessages$ = this.systemMessageSubject.asObservable();
  public notifications$ = this.notificationSubject.asObservable();
  public errors$ = this.errorSubject.asObservable();
  public connectionStatus$ = this.connectionStatus.asObservable();
  public typing$ = this.typingSubject.asObservable();
  userStatusChanged$: any;

  constructor(private router: Router) {}

  connect(serverUrl: string, token: string): void {
    if (!token) {
      this.errorSubject.next({ message: 'No token provided' });
      return;
    }

    if (this.socket && this.socket.connected) {
      this.socket.disconnect();
    }

    this.socket = io(serverUrl, {
      extraHeaders: {
        authtoken: `Bearer ${token}`,
      },
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    this.socket.on('connect', () => {
      this.connectionStatus.next(true);
    });
    this.socket.on('force_logout', (data) => {
      this.handleForceLogout(data);
    });
    this.socket.on('disconnect', (reason) => {
      this.connectionStatus.next(false);
    });

    this.socket.on('connect_error', (error) => {
      this.errorSubject.next({ message: error.message });
      this.connectionStatus.next(false);
    });

    this.socket.on('connect_timeout', () => {
      this.connectionStatus.next(false);
    });
    this.socket.io.on('reconnect_failed', () => {
      this.connectionStatus.next(false);
    });

    this.socket.io.on('reconnect', (attempt) => {
      this.connectionStatus.next(true);
    });

    this.socket.on('newMessage', (data: Message) => {
      this.messageSubject.next(data);
    });

    this.socket.on('successMessage', (data: Message) => {
      this.successMessageSubject.next(data);
    });

    this.socket.on('userStatusChanged', (data: UserStatus) => {
      this.userStatusSubject.next(data);
    });

    this.socket.on('userStatus', (data: UserStatus) => {
      this.userStatusSubject.next(data);
    });

    this.socket.on('userDisconnected', (userId: string) => {
      try {
        const status: UserStatus = { userId, status: 'offline', name: '' };
        this.userStatusSubject.next(status);
      } catch (err) {
        console.error('Error handling userDisconnected:', err);
        this.errorSubject.next({ message: 'Error handling userDisconnected' });
      }
    });

    this.socket.on('systemMessage', (data: SystemMessage) => {
      this.systemMessageSubject.next(data);
    });

    this.socket.on('notification', (data: NotificationPayload) => {
      this.notificationSubject.next(data);
    });

    this.socket.on('error', (data: { message?: string } | string) => {
      console.error('Socket error:', data);
      if (typeof data === 'string') {
        this.errorSubject.next({ message: data });
      } else {
        this.errorSubject.next({ message: data?.message || 'Unknown socket error' });
      }
    });

    this.socket.on('userTyping', (data: TypingStatus) => {
      this.typingSubject.next(data);
    });
  }

  register(info: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('register', info);
    } else {
      console.error('Cannot register - socket not connected');
    }
  }
  private handleForceLogout(data: any) {
    localStorage.clear();
    sessionStorage.clear();
    if (this.socket) {
      this.socket.disconnect();
    }
    Swal.fire({
      icon: 'warning',
      title: 'Logged Out',
      text: data.message || 'Your account has been deleted. You have been logged out.',
      confirmButtonText: 'OK',
    }).then(() => {
      this.router.navigate(['/login'], {
        queryParams: { reason: 'account_deleted' },
      });
    });
  }
  sendMessage(recipientId: string, content: string): void {
    this.socket.emit('sendMessage', {
      sendTo: recipientId,
      content: content,
    });
  }

  emitTyping(recipientId: string, isTyping: boolean): void {
    this.socket.emit('typing', {
      recipientId,
      isTyping,
    });
  }

  receiveNotifications(): Observable<NotificationPayload> {
    return this.notifications$;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  isConnected(): boolean {
    const connected = this.socket?.connected || false;
    return connected;
  }
}
