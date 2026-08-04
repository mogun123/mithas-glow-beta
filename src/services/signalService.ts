import { createClient } from '@supabase/supabase-js';
import type { Message, ChatUser } from '../components/chat/data';

// Signal Protocol interface (simplified for implementation)
interface SignalProtocol {
  encryptMessage(message: string, recipientId: string): Promise<string>;
  decryptMessage(encryptedMessage: string, senderId: string): Promise<string>;
  generateIdentityKeyPair(): Promise<{ publicKey: string; privateKey: string }>;
  generatePreKey(): Promise<{ keyId: number; keyPair: { publicKey: string; privateKey: string } }>;
  generateSignedPreKey(identityKeyPair: any): Promise<{ keyId: number; keyPair: { publicKey: string; privateKey: string } }>;
}

class SignalService implements SignalProtocol {
  private supabase: any;
  private currentUserId: string | null = null;
  private identityKeyPair: any = null;
  private messageSubscriptions: Map<string, any> = new Map();

  constructor() {
    // Initialize Supabase client
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async initialize(): Promise<void> {
    try {
      // Get current user
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      this.currentUserId = user.id;
      
      // Initialize or load Signal Protocol keys
      await this.initializeSignalKeys();
      
      console.log('Signal service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Signal service:', error);
      throw error;
    }
  }

  private async initializeSignalKeys(): Promise<void> {
    if (!this.currentUserId) return;

    try {
      // Check if keys already exist
      const { data: existingKeys } = await this.supabase
        .from('signal_keys')
        .select('*')
        .eq('user_id', this.currentUserId)
        .single();

      if (existingKeys) {
        this.identityKeyPair = {
          publicKey: existingKeys.public_key,
          privateKey: existingKeys.private_key,
        };
      } else {
        // Generate new keys
        this.identityKeyPair = await this.generateIdentityKeyPair();
        
        // Store keys in database
        await this.supabase.from('signal_keys').insert({
          user_id: this.currentUserId,
          public_key: this.identityKeyPair.publicKey,
          private_key: this.identityKeyPair.privateKey,
        });
      }
    } catch (error) {
      console.error('Failed to initialize Signal keys:', error);
      throw error;
    }
  }

  async encryptMessage(message: string, recipientId: string): Promise<string> {
    try {
      // Get recipient's public key
      const { data: recipientKey } = await this.supabase
        .from('signal_keys')
        .select('public_key')
        .eq('user_id', recipientId)
        .single();

      if (!recipientKey) {
        throw new Error('Recipient public key not found');
      }

      // Simplified encryption (in production, use proper Signal Protocol)
      const encrypted = btoa(JSON.stringify({
        message,
        timestamp: Date.now(),
        recipient: recipientId,
      }));

      return encrypted;
    } catch (error) {
      console.error('Failed to encrypt message:', error);
      throw error;
    }
  }

  async decryptMessage(encryptedMessage: string, senderId: string): Promise<string> {
    try {
      // Simplified decryption (in production, use proper Signal Protocol)
      const decrypted = JSON.parse(atob(encryptedMessage));
      return decrypted.message;
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      throw error;
    }
  }

  async generateIdentityKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    // In production, use proper Signal Protocol key generation
    const keyPair = {
      publicKey: btoa(`public_${Date.now()}_${Math.random()}`),
      privateKey: btoa(`private_${Date.now()}_${Math.random()}`),
    };
    return keyPair;
  }

  async generatePreKey(): Promise<{ keyId: number; keyPair: { publicKey: string; privateKey: string } }> {
    const keyId = Math.floor(Math.random() * 10000);
    const keyPair = await this.generateIdentityKeyPair();
    return { keyId, keyPair };
  }

  async generateSignedPreKey(identityKeyPair: any): Promise<{ keyId: number; keyPair: { publicKey: string; privateKey: string } }> {
    const keyId = Math.floor(Math.random() * 10000);
    const keyPair = await this.generateIdentityKeyPair();
    return { keyId, keyPair };
  }

  async getContacts(): Promise<ChatUser[]> {
    try {
      if (!this.currentUserId) throw new Error('User not authenticated');

      // Get contacts from profiles table that match phone contacts
      const { data: contacts, error } = await this.supabase
        .from('profiles')
        .select(`
          id,
          username,
          full_name,
          avatar_url,
          phone,
          last_seen,
          online_status
        `)
        .neq('user_id', this.currentUserId)
        .order('last_seen', { ascending: false });

      // If there's an error or no profiles exist, use mock data
      if (error || !contacts || contacts.length === 0) {
        console.warn('No contacts found or profiles table not ready, using mock data');
        return this.getMockContacts();
      }

      // Get last messages for each contact
      const contactsWithMessages = await Promise.all(
        contacts.map(async (contact: any) => {
          const { data: lastMessage } = await this.supabase
            .from('messages')
            .select('content, created_at, encrypted')
            .or(`sender_id.eq.${this.currentUserId},receiver_id.eq.${this.currentUserId}`)
            .or(`sender_id.eq.${contact.user_id},receiver_id.eq.${contact.user_id}`)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          let lastMessageText = 'No messages yet';
          if (lastMessage) {
            if (lastMessage.encrypted) {
              lastMessageText = await this.decryptMessage(lastMessage.content, contact.user_id);
            } else {
              lastMessageText = lastMessage.content;
            }
          }

          return {
            id: contact.id,
            name: contact.full_name || contact.username,
            status: contact.online_status === 'online' ? 'Online' : `Active ${this.formatLastSeen(contact.last_seen)}`,
            verified: false,
            lastMessage: lastMessageText,
            tab: 'contacts' as const,
            avatarColor: this.getAvatarColor(contact.id),
          };
        })
      );

      return contactsWithMessages;
    } catch (error) {
      console.error('Failed to get contacts:', error);
      return this.getMockContacts();
    }
  }

  private getMockContacts(): ChatUser[] {
    return [
      {
        id: 'contact-1',
        name: 'Alice Johnson',
        status: 'Online',
        verified: true,
        lastMessage: 'Hey! How are you doing? 👋',
        tab: 'contacts' as const,
        avatarColor: 'bg-purple-500',
      },
      {
        id: 'contact-2',
        name: 'Bob Smith',
        status: 'Active 5m ago',
        verified: false,
        lastMessage: 'See you tomorrow!',
        tab: 'contacts' as const,
        avatarColor: 'bg-blue-500',
      },
      {
        id: 'contact-3',
        name: 'Carol Davis',
        status: 'Active 2h ago',
        verified: true,
        lastMessage: 'Thanks for the help!',
        tab: 'contacts' as const,
        avatarColor: 'bg-green-500',
      },
      {
        id: 'contact-4',
        name: 'David Wilson',
        status: 'Active 1d ago',
        verified: false,
        lastMessage: 'Let me check and get back to you',
        tab: 'contacts' as const,
        avatarColor: 'bg-pink-500',
      },
    ];
  }

  async getMessages(userId: string): Promise<Message[]> {
    try {
      if (!this.currentUserId) throw new Error('User not authenticated');

      const { data: messages, error } = await this.supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${this.currentUserId},receiver_id.eq.${this.currentUserId}`)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: true });

      // If there's an error or no messages exist, use mock data
      if (error || !messages || messages.length === 0) {
        console.warn('No messages found or messages table not ready, using mock data');
        return this.getMockMessages(userId);
      }

      const decryptedMessages = await Promise.all(
        messages.map(async (msg: any) => {
          let content = msg.content;
          if (msg.encrypted && msg.sender_id !== this.currentUserId) {
            content = await this.decryptMessage(msg.content, msg.sender_id);
          }

          return {
            id: msg.id,
            text: content,
            senderId: msg.sender_id,
            timestamp: new Date(msg.created_at).getTime(),
            isMine: msg.sender_id === this.currentUserId,
            status: msg.read_at ? 'seen' : 'sent',
          };
        })
      );

      return decryptedMessages;
    } catch (error) {
      console.error('Failed to get messages:', error);
      return this.getMockMessages(userId);
    }
  }

  private getMockMessages(userId: string): Message[] {
    const now = Date.now();
    return [
      {
        id: 'contact-msg-1',
        text: 'Hey! How are you doing? 👋',
        senderId: userId,
        timestamp: now - 3600000, // 1 hour ago
        isMine: false,
        status: 'seen',
      },
      {
        id: 'contact-msg-2',
        text: "I'm doing great! Just finished a new project",
        senderId: this.currentUserId || 'current-user',
        timestamp: now - 3000000, // 50 minutes ago
        isMine: true,
        status: 'seen',
      },
      {
        id: 'contact-msg-3',
        text: 'That sounds amazing! Tell me more about it',
        senderId: userId,
        timestamp: now - 2400000, // 40 minutes ago
        isMine: false,
        status: 'seen',
      },
      {
        id: 'contact-msg-4',
        text: 'It\'s a fashion app with AI styling recommendations',
        senderId: this.currentUserId || 'current-user',
        timestamp: now - 1800000, // 30 minutes ago
        isMine: true,
        status: 'sent',
      },
    ];
  }

  async sendMessage(recipientId: string, text: string): Promise<Message> {
    try {
      if (!this.currentUserId) throw new Error('User not authenticated');

      // Encrypt message
      const encryptedContent = await this.encryptMessage(text, recipientId);

      // Insert encrypted message
      const { data: message, error } = await this.supabase
        .from('messages')
        .insert({
          sender_id: this.currentUserId,
          receiver_id: recipientId,
          content: encryptedContent,
          encrypted: true,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Update presence
      await this.updatePresence();

      return {
        id: message.id,
        text: text, // Return plain text for UI
        senderId: message.sender_id,
        timestamp: new Date(message.created_at).getTime(),
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
      await this.supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId);
    } catch (error) {
      console.error('Failed to mark message as read:', error);
      throw error;
    }
  }

  subscribeToMessages(userId: string, callback: (message: Message) => void): () => void {
    if (!this.currentUserId) return () => {};

    const subscriptionKey = `${this.currentUserId}-${userId}`;
    
    // Subscribe to real-time messages
    const subscription = this.supabase
      .channel(`messages:${subscriptionKey}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${this.currentUserId}`,
        },
        async (payload: any) => {
          if (payload.new.sender_id === userId) {
            let content = payload.new.content;
            if (payload.new.encrypted) {
              content = await this.decryptMessage(payload.new.content, userId);
            }

            const message: Message = {
              id: payload.new.id,
              text: content,
              senderId: payload.new.sender_id,
              timestamp: new Date(payload.new.created_at).getTime(),
              isMine: false,
              status: 'sent',
            };

            callback(message);
          }
        }
      )
      .subscribe();

    this.messageSubscriptions.set(subscriptionKey, subscription);

    return () => {
      subscription.unsubscribe();
      this.messageSubscriptions.delete(subscriptionKey);
    };
  }

  async sendTypingIndicator(userId: string, isTyping: boolean): Promise<void> {
    try {
      if (!this.currentUserId) return;

      await this.supabase
        .from('typing_indicators')
        .upsert({
          user_id: this.currentUserId,
          receiver_id: userId,
          is_typing: isTyping,
          updated_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to send typing indicator:', error);
    }

    try {
      // First try to update the profile
      const { error } = await this.supabase
        .from('profiles')
        .update({
          online_status: 'online',
          last_seen: new Date().toISOString(),
        })
        .eq('user_id', this.currentUserId);

      // If profile doesn't exist, create it
      if (error && error.code === 'PGRST116') {
        console.log('Profile not found, creating new profile...');
        await this.supabase
          .from('profiles')
          .insert({
            user_id: this.currentUserId,
            online_status: 'online',
            last_seen: new Date().toISOString(),
          });
      } else if (error) {
        console.error('Failed to update presence:', error);
      }
    } catch (error) {
      console.error('Failed to update presence:', error);
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
      'bg-purple-600', 'bg-green-600', 'bg-blue-600', 
      'bg-red-600', 'bg-yellow-600', 'bg-indigo-600'
    ];
    const index = userId.charCodeAt(0) % colors.length;
    return colors[index];
  }
}

export const signalService = new SignalService();
