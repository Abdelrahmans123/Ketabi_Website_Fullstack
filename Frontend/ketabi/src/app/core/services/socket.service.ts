import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject, BehaviorSubject } from 'rxjs';

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

// Notification payload emitted from server (stored Notification document)
export interface NotificationPayload {
  _id?: string;
  userId?: string;
  type?: string;
  title?: string;
  content?: string;
  message?: string; // Added for compatibility
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
    [key: string]: any; // Allow other properties
  };
  createdAt?: string;
  timestamp?: string; // Added for compatibility
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

  constructor() {
    console.log('🔌 SocketService instantiated');
  }

  connect(serverUrl: string, token: string): void {
    console.log('🔌 Attempting to connect socket to:', serverUrl);

    if (!token) {
      console.error('❌ No token provided for socket connection');
      this.errorSubject.next({ message: 'No token provided' });
      return;
    }

    // Disconnect existing socket if any
    if (this.socket && this.socket.connected) {
      console.log('🔌 Disconnecting existing socket');
      this.socket.disconnect();
    }

    this.socket = io(serverUrl, {
      extraHeaders: {
        authtoken: `Bearer ${token}`,
      },
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
    });

    console.log('🔌 Socket instance created, setting up listeners');
    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    console.log('🎧 Setting up socket listeners');

    this.socket.on('connect', () => {
      console.log('✅ Socket connected! Socket ID:', this.socket.id);
      this.connectionStatus.next(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected. Reason:', reason);
      this.connectionStatus.next(false);
    });

    this.socket.on('newMessage', (data: Message) => {
      console.log('📨 New message received:', data);
      this.messageSubject.next(data);
    });

    this.socket.on('successMessage', (data: Message) => {
      console.log('✅ Success message received:', data);
      this.successMessageSubject.next(data);
    });

    this.socket.on('userStatusChanged', (data: UserStatus) => {
      console.log('👤 User status changed:', data);
      this.userStatusSubject.next(data);
    });

    this.socket.on('userStatus', (data: UserStatus) => {
      console.log('👤 User status:', data);
      this.userStatusSubject.next(data);
    });

    this.socket.on('userDisconnected', (userId: string) => {
      console.log('👤 User disconnected:', userId);
      try {
        const status: UserStatus = { userId, status: 'offline', name: '' };
        this.userStatusSubject.next(status);
      } catch (err) {
        console.error('❌ Error handling userDisconnected:', err);
        this.errorSubject.next({ message: 'Error handling userDisconnected' });
      }
    });

    this.socket.on('systemMessage', (data: SystemMessage) => {
      console.log('📢 System message received:', data);
      this.systemMessageSubject.next(data);
    });

    // Server-side business notifications (persisted)
    this.socket.on('notification', (data: NotificationPayload) => {
      console.log('🔔 NOTIFICATION RECEIVED:', data);
      console.log('🔔 Notification details:', {
        id: data._id,
        userId: data.userId,
        type: data.type,
        title: data.title,
        content: data.content,
      });
      this.notificationSubject.next(data);
      console.log('✅ Notification emitted to subscribers');
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      this.errorSubject.next({ message: error.message });
    });

    this.socket.on('error', (data: { message?: string } | string) => {
      console.error('❌ Socket error:', data);
      if (typeof data === 'string') {
        this.errorSubject.next({ message: data });
      } else {
        this.errorSubject.next({ message: data?.message || 'Unknown socket error' });
      }
    });

    this.socket.on('userTyping', (data: TypingStatus) => {
      console.log('⌨️ User typing:', data);
      this.typingSubject.next(data);
    });

    console.log('✅ All socket listeners registered');
  }

  register(info: string) {
    console.log('📝 Registering with info:', info);
    this.socket.emit('register', info);
  }

  sendMessage(recipientId: string, content: string): void {
    console.log('📤 Sending message to:', recipientId);
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
    console.log('👂 Notification observable requested');
    return this.notifications$;
  }

  disconnect(): void {
    console.log('🔌 Disconnecting socket');
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  // Helper method to check if socket is connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}