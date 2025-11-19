import { AuthService } from './../../../core/services/auth.service';
// chat.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SocketService, UserStatus } from '../../../core/services/socket.service';
import { environment } from '../../../../environments/environment';
import { ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';
interface ChatMessage {
  content: string;
  from: string;
  sendTo: string;
  timestamp: Date;
  isOwn: boolean;
  senderName?: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;
  private _cachedConversations: Array<{
    userId: string;
    name: string;
    unread: number;
    online: boolean;
  }> = [];
  private _conversationsNeedUpdate = true;
  isChatOpen: boolean = false;
  messages: ChatMessage[] = [];
  messageInput: string = '';
  recipientId: string = ''; // Will be set based on user role
  currentUserId: string = '';
  currentUserName: string = '';
  currentUserRole: string = '';
  recipientName: string = 'Support';
  isConnected: boolean = false;
  onlineUsers: Map<string, UserStatus> = new Map();
  systemMessages: string[] = [];
  unreadCount: number = 0;
  userId: string = '';
  isRecipientTyping: boolean = false;
  private typingTimeout: any;
  private subscriptions: Subscription[] = [];
  // Admin multi-conversation state
  private conversations: Map<string, ChatMessage[]> = new Map(); // userId -> messages
  private unreadByUser: Map<string, number> = new Map(); // userId -> unread count

  constructor(
    private socketService: SocketService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Get user info from auth service
    this.currentUserId = this.authService.getCurrentUserId() || '';
    this.currentUserName = this.authService.getCurrentUserName() || '';
    this.currentUserRole = this.authService.getCurrentUserRole() || '';
    const token = this.authService.getAccessToken() || '';
    if (this.currentUserRole === 'admin') {
      this.route.params.subscribe((params) => {
        const idFromParams = params['userId'] || params['id'];
        if (idFromParams) {
          this.recipientId = idFromParams;
          this.ensureConversation(this.recipientId);
          this.selectConversation(this.recipientId);
        }
      });

      if (!this.recipientId) {
        this.route.queryParams.subscribe((params) => {
          const idFromQuery = params['userId'] || params['id'];
          if (idFromQuery) {
            this.recipientId = idFromQuery;
            this.ensureConversation(this.recipientId);
            this.selectConversation(this.recipientId);
          }
        });
      }

      this.recipientName = 'User';
    } else {
      this.authService.getAdminId().subscribe({
        next: (adminId) => {
          this.recipientId = adminId;
          console.log('🚀 ~ ChatComponent ~ recipientId:', this.recipientId);

          // Now connect to socket after recipientId is set
          this.initializeSocketConnection(token);
        },
        error: (error) => {
          console.error('Failed to get admin ID:', error);
          // Handle error - maybe show a notification
          this.initializeSocketConnection(token);
        },
      });

      this.recipientName = 'Support';
    }

  const serverUrl = (environment.apiBaseUrl || window.location.origin).replace(/\/api\/?$/, '');
    this.subscriptions.push(
      this.socketService.connectionStatus$.subscribe((status) => {
        this.isConnected = status;
        if (status) {
          this.socketService.register('User connected');
        }
      })
    );
    this.subscriptions.push(
      this.socketService.messages$.subscribe((message) => {
        this.userId = message.from;
        if (this.currentUserRole === 'admin' && message.sendTo === this.currentUserId) {
          const fromUser = message.from;
          this.ensureConversation(fromUser);
          const conv = this.conversations.get(fromUser)!;
          conv.push({
            content: message.content,
            from: message.from,
            sendTo: message.sendTo,
            timestamp: new Date(),
            isOwn: false,
          });

          if (!this.recipientId) {
            this.selectConversation(fromUser);
          }

          if (this.recipientId === fromUser) {
            this.addMessage(conv[conv.length - 1]);
          } else {
            const prev = this.unreadByUser.get(fromUser) || 0;
            this.unreadByUser.set(fromUser, prev + 1);
            this.markConversationsStale();
          }

          if (!this.isChatOpen) {
            this.unreadCount++;
          }
          return;
        }
        const isIncomingMessage =
          message.from === this.recipientId && message.sendTo === this.currentUserId;
        const isRelevantToConversation =
          (message.from === this.recipientId || message.from === this.currentUserId) &&
          (message.sendTo === this.recipientId || message.sendTo === this.currentUserId);

        if (isIncomingMessage || isRelevantToConversation) {
          this.addMessage({
            content: message.content,
            from: message.from,
            sendTo: message.sendTo,
            timestamp: new Date(),
            isOwn: false,
          });
          if (!this.isChatOpen) this.unreadCount++;
        }
      })
    );
    this.subscriptions.push(
      this.socketService.successMessages$.subscribe((message) => {
        if (this.currentUserRole == 'user') {
          this.userId = this.currentUserId;
        }
        if (message.sendTo === this.recipientId) {
          const msg: ChatMessage = {
            content: message.content,
            from: message.from,
            sendTo: message.sendTo,
            timestamp: new Date(),
            isOwn: true,
          };
          this.addMessage(msg);
          if (this.currentUserRole === 'admin') {
            this.ensureConversation(this.recipientId);
            const conv = this.conversations.get(this.recipientId)!;
            conv.push(msg);
          }
        }
      })
    );

    this.subscriptions.push(
      this.socketService.userStatus$.subscribe((status) => {
        this.onlineUsers.set(status.userId, status);
        this.markConversationsStale();

        if (this.currentUserRole === 'admin' && status.userId !== this.currentUserId) {
          this.ensureConversation(status.userId);
        }

        if (
          this.currentUserRole === 'admin' &&
          !this.recipientId &&
          status.status === 'online' &&
          status.userId !== this.currentUserId
        ) {
          this.ensureConversation(status.userId);
          this.selectConversation(status.userId);
        }
      })
    );
    this.subscriptions.push(
      this.socketService.systemMessages$.subscribe((msg) => {
        this.addSystemMessage(msg.message);
      })
    );
    this.subscriptions.push(
      this.socketService.errors$.subscribe((error) => {
        console.error('Chat error:', error);
      })
    );
    this.subscriptions.push(
      this.socketService.typing$.subscribe((status) => {
        if (status.userId === this.recipientId) {
          this.isRecipientTyping = status.isTyping;
        }
      })
    );
    // Connect the socket to the computed server origin (strip any trailing /api)
    this.socketService.connect(serverUrl, token);
  }
  private markConversationsStale(): void {
    this._conversationsNeedUpdate = true;
  }
  private initializeSocketConnection(token: string): void {
  const serverUrl = 'http://localhost:3000';
  
  this.subscriptions.push(
    this.socketService.connectionStatus$.subscribe((status) => {
      this.isConnected = status;
      if (status) {
        this.socketService.register('User connected');
      }
    })
  );
  }
  ngOnDestroy(): void {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.socketService.disconnect();
  }

  toggleChat(): void {
    this.isChatOpen = !this.isChatOpen;
    if (this.isChatOpen) {
      this.unreadCount = 0;
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  closeChat(): void {
    this.isChatOpen = false;
  }

  sendMessage(): void {
    if (!this.messageInput.trim() || !this.recipientId) {
      console.error('Cannot send message:', {
        messageEmpty: !this.messageInput.trim(),
        noRecipient: !this.recipientId,
        recipientId: this.recipientId,
        currentUserId: this.currentUserId,
        currentUserRole: this.currentUserRole,
      });
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: 'Please enter a message and ensure recipient is set',
        confirmButtonText: 'OK',
      });
      return;
    }

    if (!this.isConnected) {
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: 'Not connected to chat server',
        confirmButtonText: 'OK',
      });
      return;
    }
    this.onTypingStop();

    this.socketService.sendMessage(this.recipientId, this.messageInput.trim());
    this.messageInput = '';
  }

  onMessageInput(): void {
    if (!this.recipientId) return;

    this.socketService.emitTyping(this.recipientId, true);

    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    this.typingTimeout = setTimeout(() => {
      this.onTypingStop();
    }, 2000);
  }

  private onTypingStop(): void {
    if (this.recipientId) {
      this.socketService.emitTyping(this.recipientId, false);
    }
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
  }

  private addMessage(message: ChatMessage): void {
    this.messages.push(message);
    setTimeout(() => this.scrollToBottom(), 100);
  }

  private addSystemMessage(message: string): void {
    this.systemMessages.push(message);
  }

  private ensureConversation(userId: string): void {
    if (!userId) return;
    const wasNew = !this.conversations.has(userId);
    if (!this.conversations.has(userId)) {
      this.conversations.set(userId, []);
    }
    if (!this.unreadByUser.has(userId)) {
      this.unreadByUser.set(userId, 0);
    }
    if (wasNew) {
      this.markConversationsStale();
    }
  }
  get userConversations(): Array<{
    userId: string;
    name: string;
    unread: number;
    online: boolean;
  }> {
    if (!this._conversationsNeedUpdate) {
      return this._cachedConversations;
    }

    const ids = new Set<string>();
    for (const userId of this.conversations.keys()) ids.add(userId);
    for (const [userId] of this.onlineUsers.entries()) {
      if (userId !== this.currentUserId) ids.add(userId);
    }

    const list: Array<{ userId: string; name: string; unread: number; online: boolean }> = [];
    ids.forEach((userId) => {
      const status = this.onlineUsers.get(userId);
      list.push({
        userId,
        name: status?.name || 'User',
        unread: this.unreadByUser.get(userId) || 0,
        online: status?.status === 'online',
      });
    });

    this._cachedConversations = list.sort(
      (a, b) =>
        b.unread - a.unread ||
        (a.online === b.online ? a.name.localeCompare(b.name) : a.online ? -1 : 1)
    );
    this._conversationsNeedUpdate = false;
    return this._cachedConversations;
  }

  onRecipientChange(userId: string): void {
    this.selectConversation(userId);
  }

  private selectConversation(userId: string): void {
    if (!userId) return;
    this.recipientId = userId;
    const status = this.onlineUsers.get(userId);
    this.recipientName = status?.name || 'User';
    this.ensureConversation(userId);
    const conv = this.conversations.get(userId)!;
    this.messages = [...conv];

    const hadUnread = this.unreadByUser.get(userId) || 0;
    this.unreadByUser.set(userId, 0);
    if (hadUnread > 0) {
      this.markConversationsStale();
    }

    setTimeout(() => this.scrollToBottom(), 50);
  }

  private scrollToBottom(): void {
    try {
      if (this.messageContainer) {
        this.messageContainer.nativeElement.scrollTop =
          this.messageContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Scroll error:', err);
    }
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  isRecipientOnline(): boolean {
    const status = this.onlineUsers.get(this.recipientId);
    return status?.status === 'online';
  }
}
