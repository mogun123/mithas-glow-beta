import type { Message, ChatUser } from '../components/chat/data';

// ZegoCloud SDK interface (simplified for implementation)
interface ZegoCloudSDK {
  initialize(appId: number, server: string): Promise<void>;
  login(userId: string, token: string): Promise<void>;
  logout(): Promise<void>;
  sendPeerMessage(userId: string, message: string): Promise<void>;
  onPeerMessageReceived(callback: (fromUserId: string, message: string) => void): void;
  sendTypingIndicator(userId: string, isTyping: boolean): Promise<void>;
  onTypingIndicatorReceived(callback: (fromUserId: string, isTyping: boolean) => void): void;
  getUserInfo(userId: string): Promise<any>;
  updateUserStatus(status: string): Promise<void>;
}

class ZegoService implements ZegoCloudSDK {
  private appId: number = 0;
  private server: string = '';
  private currentUserId: string | null = null;
  private token: string | null = null;
  private messageCallbacks: Map<string, (message: Message) => void> = new Map();
  private typingCallbacks: Map<string, (isTyping: boolean) => void> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    // Initialize with environment variables
    this.appId = parseInt(import.meta.env.VITE_ZEGO_APP_ID || '0');
    this.server = import.meta.env.VITE_ZEGO_SERVER || '';
  }

  async initialize(): Promise<void> {
    try {
      if (!this.appId || !this.server) {
        throw new Error('ZegoCloud credentials not configured');
      }

      // In production, initialize actual ZegoCloud SDK
      // For now, we'll simulate the initialization
      console.log('ZegoCloud service initialized');
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize ZegoCloud service:', error);
      throw error;
    }
  }

  async login(userId: string, token: string): Promise<void> {
    try {
      this.currentUserId = userId;
      this.token = token;

      // In production, use actual ZegoCloud login
      console.log(`User ${userId} logged into ZegoCloud`);
    } catch (error) {
      console.error('Failed to login to ZegoCloud:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      this.currentUserId = null;
      this.token = null;
      
      // Clear all callbacks
      this.messageCallbacks.clear();
      this.typingCallbacks.clear();
      
      console.log('Logged out from ZegoCloud');
    } catch (error) {
      console.error('Failed to logout from ZegoCloud:', error);
      throw error;
    }
  }

  async sendPeerMessage(userId: string, message: string): Promise<void> {
    try {
      if (!this.currentUserId || !this.isInitialized) {
        throw new Error('ZegoCloud not initialized or user not logged in');
      }

      // In production, use actual ZegoCloud sendPeerMessage
      // For now, simulate by storing in database
      await this.storeMessage(this.currentUserId, userId, message);
    } catch (error) {
      console.error('Failed to send peer message:', error);
      throw error;
    }
  }

  onPeerMessageReceived(callback: (fromUserId: string, message: string) => void): void {
    // In production, use actual ZegoCloud event listener
    // For now, we'll simulate with database polling
    console.log('Peer message listener registered');
  }

  async sendTypingIndicator(userId: string, isTyping: boolean): Promise<void> {
    try {
      if (!this.currentUserId) return;

      // Store typing indicator in database
      await this.storeTypingIndicator(this.currentUserId, userId, isTyping);
    } catch (error) {
      console.error('Failed to send typing indicator:', error);
    }
  }

  onTypingIndicatorReceived(callback: (fromUserId: string, isTyping: boolean) => void): void {
    // In production, use actual ZegoCloud event listener
    console.log('Typing indicator listener registered');
  }

  async getUserInfo(userId: string): Promise<any> {
    try {
      // Get user info from database
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error('Failed to get user info');
      return response.json();
    } catch (error) {
      console.error('Failed to get user info:', error);
      throw error;
    }
  }

  async updateUserStatus(status: string): Promise<void> {
    try {
      if (!this.currentUserId) return;

      // Update user status in database
      await fetch(`/api/users/${this.currentUserId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  }

  async getChatUsers(): Promise<ChatUser[]> {
    try {
      // Get users for messenger tab (social discovery)
      const response = await fetch('/api/messenger/users');
      if (!response.ok) throw new Error('Failed to get messenger users');
      
      const users = await response.json();
      
      // Transform to ChatUser format
      return users.map((user: any) => ({
        id: user.id,
        name: user.username,
        status: user.online_status === 'online' ? 'Online' : `Active ${this.formatLastSeen(user.last_seen)}`,
        verified: user.verified,
        lastMessage: user.last_message || 'No messages yet',
        tab: 'messenger' as const,
        avatarColor: this.getAvatarColor(user.id),
        followers: user.followers_count ? `${user.followers_count}` : undefined,
        bio: user.bio,
      }));
    } catch (error) {
      console.warn('API endpoint not available, using mock data for messenger users');
      
      // Return mock data when API is not available
      return [
        {
          id: 'messenger-1',
          name: '@fashionista',
          status: 'Online',
          verified: true,
          lastMessage: 'Love your new collection! 🔥',
          tab: 'messenger' as const,
          avatarColor: 'bg-pink-500',
          followers: '12.5K',
          bio: 'Fashion influencer | Style tips daily',
        },
        {
          id: 'messenger-2',
          name: '@glow_stylist',
          status: 'Active 2h ago',
          verified: true,
          lastMessage: 'Thanks for the collab! 💕',
          tab: 'messenger' as const,
          avatarColor: 'bg-purple-500',
          followers: '8.3K',
          bio: 'Personal stylist | Makeovers',
        },
        {
          id: 'messenger-3',
          name: '@trendsetter',
          status: 'Active 5h ago',
          verified: false,
          lastMessage: 'When are you dropping new fits?',
          tab: 'messenger' as const,
          avatarColor: 'bg-blue-500',
          followers: '3.2K',
          bio: 'Streetwear enthusiast',
        },
        {
          id: 'messenger-4',
          name: '@style_guru',
          status: 'Message Request',
          verified: false,
          lastMessage: 'Hey, love your vibe!',
          tab: 'messenger' as const,
          avatarColor: 'bg-green-500',
          followers: '1.1K',
          bio: 'Fashion blogger | Daily looks',
        },
      ];
    }
  }

  async getMessages(userId: string): Promise<Message[]> {
    try {
      if (!this.currentUserId) throw new Error('User not logged in');

      // Get messages from database
      const response = await fetch(`/api/messenger/messages/${userId}`);
      if (!response.ok) throw new Error('Failed to get messages');
      
      const messages = await response.json();
      
      // Transform to Message format
      return messages.map((msg: any) => ({
        id: msg.id,
        text: msg.content,
        senderId: msg.sender_id,
        timestamp: new Date(msg.created_at).getTime(),
        isMine: msg.sender_id === this.currentUserId,
        status: msg.read_at ? 'seen' : 'sent',
      }));
    } catch (error) {
      console.warn('API endpoint not available, using mock data for messenger messages');
      
      // Return mock data when API is not available
      const now = Date.now();
      return [
        {
          id: 'msg-1',
          text: 'Hey! Love your new collection 🔥',
          senderId: userId,
          timestamp: now - 3600000, // 1 hour ago
          isMine: false,
          status: 'seen',
        },
        {
          id: 'msg-2',
          text: 'Thank you! Just dropped some new pieces',
          senderId: this.currentUserId || 'current-user',
          timestamp: now - 3000000, // 50 minutes ago
          isMine: true,
          status: 'seen',
        },
        {
          id: 'msg-3',
          text: 'When are you hosting the next livestream?',
          senderId: userId,
          timestamp: now - 1800000, // 30 minutes ago
          isMine: false,
          status: 'sent',
        },
        {
          id: 'msg-4',
          text: 'This Friday at 7 PM! Be there 💕',
          senderId: this.currentUserId || 'current-user',
          timestamp: now - 900000, // 15 minutes ago
          isMine: true,
          status: 'sent',
        },
      ];
    }
  }

  async sendMessage(userId: string, text: string): Promise<Message> {
    try {
      if (!this.currentUserId) throw new Error('User not logged in');

      // Send message via ZegoCloud
      await this.sendPeerMessage(userId, text);

      // Store message in database
      const messageData = await this.storeMessage(this.currentUserId, userId, text);

      return {
        id: messageData.id,
        text: text,
        senderId: this.currentUserId,
        timestamp: new Date(messageData.created_at).getTime(),
        isMine: true,
        status: 'sent',
      };
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  async markAsRead(messageId: string): Promise<void> {
    try {
      // Mark message as read in database
      await fetch(`/api/messenger/messages/${messageId}/read`, {
        method: 'PUT',
      });
    } catch (error) {
      console.error('Failed to mark message as read:', error);
      throw error;
    }
  }

  subscribeToMessages(userId: string, callback: (message: Message) => void): () => void {
    if (!this.currentUserId) return () => {};

    const subscriptionKey = `${this.currentUserId}-${userId}`;
    this.messageCallbacks.set(subscriptionKey, callback);

    // Simulate real-time message subscription
    // In production, use actual ZegoCloud real-time events
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/messenger/messages/${userId}/unread`);
        if (response.ok) {
          const messages = await response.json();
          messages.forEach((msg: any) => {
            const message: Message = {
              id: msg.id,
              text: msg.content,
              senderId: msg.sender_id,
              timestamp: new Date(msg.created_at).getTime(),
              isMine: false,
              status: 'sent',
            };
            callback(message);
          });
        }
      } catch (error) {
        console.error('Error polling for messages:', error);
      }
    }, 3000); // Poll every 3 seconds

    return () => {
      clearInterval(pollInterval);
      this.messageCallbacks.delete(subscriptionKey);
    };
  }

  async getMessageRequests(): Promise<ChatUser[]> {
    try {
      // Get message requests (users who sent messages but aren't in contacts)
      const response = await fetch('/api/messenger/requests');
      if (!response.ok) throw new Error('Failed to get message requests');
      
      const requests = await response.json();
      
      return requests.map((user: any) => ({
        id: user.id,
        name: user.username,
        status: 'Message Request',
        verified: false,
        lastMessage: user.last_message || 'Sent you a message',
        tab: 'messenger' as const,
        avatarColor: this.getAvatarColor(user.id),
        bio: user.bio,
      }));
    } catch (error) {
      console.error('Failed to get message requests:', error);
      throw error;
    }
  }

  async acceptMessageRequest(userId: string): Promise<void> {
    try {
      await fetch(`/api/messenger/requests/${userId}/accept`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to accept message request:', error);
      throw error;
    }
  }

  async blockUser(userId: string): Promise<void> {
    try {
      await fetch(`/api/messenger/users/${userId}/block`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to block user:', error);
      throw error;
    }
  }

  private async storeMessage(senderId: string, receiverId: string, content: string): Promise<any> {
    try {
      const response = await fetch('/api/messenger/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: senderId,
          receiver_id: receiverId,
          content,
        }),
      });

      if (!response.ok) throw new Error('Failed to store message');
      return response.json();
    } catch (error) {
      console.error('Failed to store message:', error);
      throw error;
    }
  }

  private async storeTypingIndicator(senderId: string, receiverId: string, isTyping: boolean): Promise<void> {
    try {
      await fetch('/api/messenger/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: senderId,
          receiver_id: receiverId,
          is_typing: isTyping,
        }),
      });
    } catch (error) {
      console.error('Failed to store typing indicator:', error);
    }
  }

  private formatLastSeen(lastSeen: string): string {
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  }

  private getAvatarColor(userId: string): string {
    const colors = [
      'bg-pink-600', 'bg-blue-600', 'bg-red-600', 
      'bg-purple-600', 'bg-green-600', 'bg-yellow-600'
    ];
    const index = userId.charCodeAt(0) % colors.length;
    return colors[index];
  }
}

export const zegoService = new ZegoService();
