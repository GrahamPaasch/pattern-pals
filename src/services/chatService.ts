import { supabase, isSupabaseConfigured } from './supabase';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  messageText: string;
  messageType: 'text' | 'image' | 'pattern_share' | 'session_invite';
  readAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  metadata?: any;
}

export interface ChatConversation {
  id: string;
  user1Id: string;
  user2Id: string;
  user1Name: string;
  user2Name: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
  lastMessage?: string;
  lastMessageSenderId?: string;
  unreadCount?: number;
}

export interface ChatPreferences {
  id: string;
  userId: string;
  conversationId: string;
  isMuted: boolean;
  isPinned: boolean;
  lastReadMessageId?: string;
  notificationEnabled: boolean;
  updatedAt: Date;
}

/**
 * Service for managing in-app chat between connected users
 * Provides real-time messaging capabilities with offline support
 */
export class ChatService {
  private static conversationListeners: Map<string, any> = new Map();
  private static messageListeners: Map<string, any> = new Map();

  /**
   * Get all conversations for the current user
   */
  static async getConversations(userId: string): Promise<ChatConversation[]> {
    try {
      if (!isSupabaseConfigured() || !supabase) {
        console.log('💬 Chat: Supabase not configured, using demo conversations');
        return this.getDemoConversations(userId);
      }

      const { data, error } = await supabase
        .from('chat_conversations')
        .select(`
          id,
          user1_id,
          user2_id,
          user1_name,
          user2_name,
          created_at,
          updated_at,
          last_message_at,
          last_message,
          last_message_sender_id
        `)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('💬 Chat: Error fetching conversations:', error);
        return this.getDemoConversations(userId);
      }

      // Get unread count for each conversation
      const conversations: ChatConversation[] = await Promise.all(
        (data || []).map(async (conv: any) => {
          const unreadCount = await this.getUnreadMessageCount(userId, conv.id);
          
          return {
            id: conv.id,
            user1Id: conv.user1_id,
            user2Id: conv.user2_id,
            user1Name: conv.user1_name,
            user2Name: conv.user2_name,
            createdAt: new Date(conv.created_at),
            updatedAt: new Date(conv.updated_at),
            lastMessageAt: new Date(conv.last_message_at),
            lastMessage: conv.last_message,
            lastMessageSenderId: conv.last_message_sender_id,
            unreadCount
          };
        })
      );

      console.log(`💬 Chat: Loaded ${conversations.length} conversations for user`);
      return conversations;

    } catch (error) {
      console.error('💬 Chat: Error in getConversations:', error);
      return this.getDemoConversations(userId);
    }
  }

  /**
   * Get messages for a specific conversation
   */
  static async getMessages(
    conversationId: string, 
    limit: number = 50,
    offset: number = 0
  ): Promise<ChatMessage[]> {
    try {
      if (!isSupabaseConfigured() || !supabase) {
        console.log('💬 Chat: Supabase not configured, using demo messages');
        return this.getDemoMessages(conversationId);
      }

      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          sender_name,
          recipient_id,
          message_text,
          message_type,
          read_at,
          delivered_at,
          created_at,
          metadata
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit)
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('💬 Chat: Error fetching messages:', error);
        return this.getDemoMessages(conversationId);
      }

      const messages: ChatMessage[] = (data || []).map((msg: any) => ({
        id: msg.id,
        conversationId: msg.conversation_id,
        senderId: msg.sender_id,
        senderName: msg.sender_name,
        recipientId: msg.recipient_id,
        messageText: msg.message_text,
        messageType: msg.message_type,
        readAt: msg.read_at ? new Date(msg.read_at) : undefined,
        deliveredAt: msg.delivered_at ? new Date(msg.delivered_at) : undefined,
        createdAt: new Date(msg.created_at),
        metadata: msg.metadata
      })).reverse(); // Reverse to show oldest first

      console.log(`💬 Chat: Loaded ${messages.length} messages for conversation ${conversationId}`);
      return messages;

    } catch (error) {
      console.error('💬 Chat: Error in getMessages:', error);
      return this.getDemoMessages(conversationId);
    }
  }

  /**
   * Send a message to another user
   */
  static async sendMessage(
    senderId: string,
    senderName: string,
    recipientId: string,
    messageText: string,
    messageType: ChatMessage['messageType'] = 'text',
    metadata?: any
  ): Promise<ChatMessage | null> {
    try {
      if (!isSupabaseConfigured() || !supabase) {
        console.log('💬 Chat: Supabase not configured, creating demo message');
        return this.createDemoMessage(senderId, senderName, recipientId, messageText, messageType);
      }

      // First, ensure users are connected
      const areConnected = await this.checkUsersConnected(senderId, recipientId);
      if (!areConnected) {
        console.error('💬 Chat: Users are not connected, cannot send message');
        throw new Error('You can only send messages to connected users');
      }

      // Get or create conversation
      const conversationId = await this.getOrCreateConversation(senderId, recipientId);

      // Send the message
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          sender_name: senderName,
          recipient_id: recipientId,
          message_text: messageText,
          message_type: messageType,
          metadata
        })
        .select()
        .single();

      if (error) {
        console.error('💬 Chat: Error sending message:', error);
        throw error;
      }

      const message: ChatMessage = {
        id: data.id,
        conversationId: data.conversation_id,
        senderId: data.sender_id,
        senderName: data.sender_name,
        recipientId: data.recipient_id,
        messageText: data.message_text,
        messageType: data.message_type,
        readAt: data.read_at ? new Date(data.read_at) : undefined,
        deliveredAt: data.delivered_at ? new Date(data.delivered_at) : undefined,
        createdAt: new Date(data.created_at),
        metadata: data.metadata
      };

      console.log(`💬 Chat: Message sent successfully from ${senderName} to recipient ${recipientId}`);

      // Send real-time notification
      await this.sendMessageNotification(recipientId, senderName, messageText);

      return message;

    } catch (error) {
      console.error('💬 Chat: Error in sendMessage:', error);
      throw error;
    }
  }

  /**
   * Mark a message as read
   */
  static async markMessageAsRead(messageId: string, userId: string): Promise<boolean> {
    try {
      if (!isSupabaseConfigured() || !supabase) {
        console.log('💬 Chat: Supabase not configured, marking demo message as read');
        return true;
      }

      const { error } = await supabase
        .from('chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('recipient_id', userId); // Only recipient can mark as read

      if (error) {
        console.error('💬 Chat: Error marking message as read:', error);
        return false;
      }

      console.log(`💬 Chat: Message ${messageId} marked as read`);
      return true;

    } catch (error) {
      console.error('💬 Chat: Error in markMessageAsRead:', error);
      return false;
    }
  }

  /**
   * Mark all messages in a conversation as read
   */
  static async markConversationAsRead(conversationId: string, userId: string): Promise<boolean> {
    try {
      if (!isSupabaseConfigured() || !supabase) {
        console.log('💬 Chat: Supabase not configured, marking demo conversation as read');
        return true;
      }

      const { error } = await supabase
        .from('chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('recipient_id', userId)
        .is('read_at', null); // Only update unread messages

      if (error) {
        console.error('💬 Chat: Error marking conversation as read:', error);
        return false;
      }

      console.log(`💬 Chat: Conversation ${conversationId} marked as read`);
      return true;

    } catch (error) {
      console.error('💬 Chat: Error in markConversationAsRead:', error);
      return false;
    }
  }

  /**
   * Get unread message count for a user in a specific conversation
   */
  static async getUnreadMessageCount(userId: string, conversationId?: string): Promise<number> {
    try {
      if (!isSupabaseConfigured() || !supabase) {
        return 0;
      }

      let query = supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .is('read_at', null);

      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      }

      const { count, error } = await query;

      if (error) {
        console.error('💬 Chat: Error getting unread count:', error);
        return 0;
      }

      return count || 0;

    } catch (error) {
      console.error('💬 Chat: Error in getUnreadMessageCount:', error);
      return 0;
    }
  }

  /**
   * Subscribe to real-time conversation updates
   */
  static subscribeToConversations(
    userId: string,
    onUpdate: (conversations: ChatConversation[]) => void
  ): () => void {
    if (!isSupabaseConfigured() || !supabase) {
      console.log('💬 Chat: Supabase not configured, no real-time conversation updates');
      return () => {};
    }

    try {
      const subscription = supabase
        .channel(`conversations_${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_conversations',
            filter: `user1_id=eq.${userId},user2_id=eq.${userId}`
          },
          async () => {
            console.log('💬 Chat: Conversation updated, refreshing...');
            const conversations = await this.getConversations(userId);
            onUpdate(conversations);
          }
        )
        .subscribe();

      this.conversationListeners.set(userId, subscription);

      return () => {
        subscription.unsubscribe();
        this.conversationListeners.delete(userId);
      };

    } catch (error) {
      console.error('💬 Chat: Error subscribing to conversations:', error);
      return () => {};
    }
  }

  /**
   * Subscribe to real-time message updates for a specific conversation
   */
  static subscribeToMessages(
    conversationId: string,
    onNewMessage: (message: ChatMessage) => void
  ): () => void {
    if (!isSupabaseConfigured() || !supabase) {
      console.log('💬 Chat: Supabase not configured, no real-time message updates');
      return () => {};
    }

    try {
      const subscription = supabase
        .channel(`messages_${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload: any) => {
            console.log('💬 Chat: New message received via real-time:', payload);
            const data = payload.new;
            const message: ChatMessage = {
              id: data.id,
              conversationId: data.conversation_id,
              senderId: data.sender_id,
              senderName: data.sender_name,
              recipientId: data.recipient_id,
              messageText: data.message_text,
              messageType: data.message_type,
              readAt: data.read_at ? new Date(data.read_at) : undefined,
              deliveredAt: data.delivered_at ? new Date(data.delivered_at) : undefined,
              createdAt: new Date(data.created_at),
              metadata: data.metadata
            };
            onNewMessage(message);
          }
        )
        .subscribe();

      this.messageListeners.set(conversationId, subscription);

      return () => {
        subscription.unsubscribe();
        this.messageListeners.delete(conversationId);
      };

    } catch (error) {
      console.error('💬 Chat: Error subscribing to messages:', error);
      return () => {};
    }
  }

  /**
   * Get or create a conversation between two users
   */
  static async getOrCreateConversation(user1Id: string, user2Id: string): Promise<string> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase not configured');
    }

    try {
      // Call the database function to get or create conversation
      const { data, error } = await supabase
        .rpc('get_or_create_conversation', {
          user1_uuid: user1Id,
          user2_uuid: user2Id
        });

      if (error) {
        console.error('💬 Chat: Error getting/creating conversation:', error);
        throw error;
      }

      return data;

    } catch (error) {
      console.error('💬 Chat: Error in getOrCreateConversation:', error);
      throw error;
    }
  }

  /**
   * Check if two users are connected (can chat)
   */
  private static async checkUsersConnected(user1Id: string, user2Id: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase) {
      return true; // Allow demo messages
    }

    try {
      const { data, error } = await supabase
        .from('connections')
        .select('id')
        .or(
          `and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`
        )
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('💬 Chat: Error checking connection:', error);
        return false;
      }

      return !!data;

    } catch (error) {
      console.error('💬 Chat: Error in checkUsersConnected:', error);
      return false;
    }
  }

  /**
   * Send notification for new chat message
   */
  private static async sendMessageNotification(
    recipientId: string,
    senderName: string,
    messageText: string
  ): Promise<void> {
    try {
      // Import notification service dynamically to avoid circular dependency
      const { RealTimeNotificationManager } = await import('./realTimeNotificationManager');
      
      await RealTimeNotificationManager.sendRealTimeNotification(
        recipientId,
        'chat_message',
        `New message from ${senderName}`,
        messageText.length > 50 ? `${messageText.substring(0, 50)}...` : messageText,
        {
          type: 'chat_message',
          senderId: recipientId,
          senderName,
          messagePreview: messageText.substring(0, 100)
        },
        'normal'
      );

    } catch (error) {
      console.error('💬 Chat: Error sending message notification:', error);
    }
  }

  /**
   * Demo conversation data for offline mode
   */
  private static getDemoConversations(userId: string): ChatConversation[] {
    return [
      {
        id: 'demo_conv_1',
        user1Id: userId,
        user2Id: 'demo_user_1',
        user1Name: 'You',
        user2Name: 'Alex Chen',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        lastMessage: "Let's practice the 4-ball column pattern together!",
        lastMessageSenderId: 'demo_user_1',
        unreadCount: 2
      },
      {
        id: 'demo_conv_2',
        user1Id: userId,
        user2Id: 'demo_user_2',
        user1Name: 'You',
        user2Name: 'Sarah Williams',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        lastMessageAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        lastMessage: "Thanks for the juggling tips! Really helpful.",
        lastMessageSenderId: userId,
        unreadCount: 0
      }
    ];
  }

  /**
   * Demo message data for offline mode
   */
  private static getDemoMessages(conversationId: string): ChatMessage[] {
    const baseTime = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
    
    return [
      {
        id: 'demo_msg_1',
        conversationId,
        senderId: 'demo_user_1',
        senderName: 'Alex Chen',
        recipientId: 'current_user',
        messageText: "Hey! I saw your pattern interests. Want to practice together?",
        messageType: 'text',
        deliveredAt: new Date(baseTime),
        createdAt: new Date(baseTime),
        readAt: new Date(baseTime + 5 * 60 * 1000)
      },
      {
        id: 'demo_msg_2',
        conversationId,
        senderId: 'current_user',
        senderName: 'You',
        recipientId: 'demo_user_1',
        messageText: "Absolutely! I've been working on the 4-ball column.",
        messageType: 'text',
        deliveredAt: new Date(baseTime + 10 * 60 * 1000),
        createdAt: new Date(baseTime + 10 * 60 * 1000),
        readAt: new Date(baseTime + 12 * 60 * 1000)
      },
      {
        id: 'demo_msg_3',
        conversationId,
        senderId: 'demo_user_1',
        senderName: 'Alex Chen',
        recipientId: 'current_user',
        messageText: "Perfect! Let's practice the 4-ball column pattern together!",
        messageType: 'text',
        deliveredAt: new Date(baseTime + 20 * 60 * 1000),
        createdAt: new Date(baseTime + 20 * 60 * 1000)
        // Not read yet
      }
    ];
  }

  /**
   * Create demo message for offline mode
   */
  private static createDemoMessage(
    senderId: string,
    senderName: string,
    recipientId: string,
    messageText: string,
    messageType: ChatMessage['messageType']
  ): ChatMessage {
    return {
      id: `demo_msg_${Date.now()}`,
      conversationId: 'demo_conv_1',
      senderId,
      senderName,
      recipientId,
      messageText,
      messageType,
      deliveredAt: new Date(),
      createdAt: new Date()
    };
  }

  /**
   * Cleanup subscriptions
   */
  static cleanup(): void {
    this.conversationListeners.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.conversationListeners.clear();

    this.messageListeners.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.messageListeners.clear();
  }
}
