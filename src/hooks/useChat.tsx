import { useState, useEffect, useCallback } from 'react';
import { ChatService, ChatMessage, ChatConversation } from '../services/chatService';
import { useAuth } from './useAuth';

interface UseChatResult {
  // Conversation management
  conversations: ChatConversation[];
  conversationsLoading: boolean;
  refreshConversations: () => Promise<void>;
  
  // Message management
  messages: ChatMessage[];
  messagesLoading: boolean;
  currentConversationId: string | null;
  
  // Actions
  sendMessage: (recipientId: string, recipientName: string, messageText: string) => Promise<boolean>;
  markAsRead: (messageId: string) => Promise<boolean>;
  markConversationAsRead: (conversationId: string) => Promise<boolean>;
  loadMessages: (conversationId: string) => Promise<void>;
  
  // Real-time features
  startConversation: (recipientId: string, recipientName: string, initialMessage?: string) => Promise<string | null>;
  
  // Statistics
  totalUnreadCount: number;
  
  // Utilities
  getOtherUser: (conversation: ChatConversation) => { id: string; name: string };
  isMessageFromCurrentUser: (message: ChatMessage) => boolean;
}

/**
 * React hook for managing chat functionality
 * Provides conversation management, messaging, and real-time updates
 */
export function useChat(): UseChatResult {
  const { user } = useAuth();
  
  // State
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  // Load conversations on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      loadConversations();
      
      // Subscribe to real-time conversation updates
      const unsubscribe = ChatService.subscribeToConversations(user.id, (updatedConversations) => {
        setConversations(updatedConversations);
        updateUnreadCount(updatedConversations);
      });

      return unsubscribe;
    } else {
      setConversations([]);
      setTotalUnreadCount(0);
    }
  }, [user?.id]);

  // Subscribe to message updates for current conversation
  useEffect(() => {
    if (currentConversationId) {
      const unsubscribe = ChatService.subscribeToMessages(currentConversationId, (newMessage) => {
        setMessages(prev => [...prev, newMessage]);
        
        // Auto-mark as read if it's for the current user and conversation is open
        if (newMessage.recipientId === user?.id && newMessage.senderId !== user?.id) {
          setTimeout(() => {
            ChatService.markMessageAsRead(newMessage.id, user?.id || '');
          }, 1000); // Mark as read after 1 second of viewing
        }
      });

      return unsubscribe;
    }
  }, [currentConversationId, user?.id]);

  /**
   * Load conversations for the current user
   */
  const loadConversations = useCallback(async () => {
    if (!user?.id) return;

    try {
      setConversationsLoading(true);
      const loadedConversations = await ChatService.getConversations(user.id);
      setConversations(loadedConversations);
      updateUnreadCount(loadedConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setConversationsLoading(false);
    }
  }, [user?.id]);

  /**
   * Refresh conversations manually
   */
  const refreshConversations = useCallback(async () => {
    await loadConversations();
  }, [loadConversations]);

  /**
   * Load messages for a specific conversation
   */
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      setMessagesLoading(true);
      setCurrentConversationId(conversationId);
      
      const loadedMessages = await ChatService.getMessages(conversationId);
      setMessages(loadedMessages);
      
      // Mark conversation as read when opened
      if (user?.id) {
        await ChatService.markConversationAsRead(conversationId, user.id);
        // Refresh conversations to update unread count
        await loadConversations();
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  }, [user?.id, loadConversations]);

  /**
   * Send a message to another user
   */
  const sendMessage = useCallback(async (
    recipientId: string,
    recipientName: string,
    messageText: string
  ): Promise<boolean> => {
    if (!user?.id || !user?.name) {
      console.error('User not authenticated');
      return false;
    }

    if (!messageText.trim()) {
      console.error('Message text is empty');
      return false;
    }

    try {
      const message = await ChatService.sendMessage(
        user.id,
        user.name,
        recipientId,
        messageText.trim(),
        'text'
      );

      if (message) {
        // If this is the current conversation, add message to local state
        if (message.conversationId === currentConversationId) {
          setMessages(prev => [...prev, message]);
        }
        
        // Refresh conversations to update last message
        await loadConversations();
        
        console.log(`Message sent successfully to ${recipientName}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }, [user?.id, user?.name, currentConversationId, loadConversations]);

  /**
   * Start a new conversation with a user
   */
  const startConversation = useCallback(async (
    recipientId: string,
    recipientName: string,
    initialMessage?: string
  ): Promise<string | null> => {
    if (!user?.id || !user?.name) {
      console.error('User not authenticated');
      return null;
    }

    try {
      // Check if conversation already exists
      const existingConversation = conversations.find(conv => 
        (conv.user1Id === user.id && conv.user2Id === recipientId) ||
        (conv.user1Id === recipientId && conv.user2Id === user.id)
      );

      if (existingConversation) {
        // Load existing conversation
        await loadMessages(existingConversation.id);
        
        // Send initial message if provided
        if (initialMessage) {
          await sendMessage(recipientId, recipientName, initialMessage);
        }
        
        return existingConversation.id;
      }

      // Create new conversation by sending first message
      const firstMessage = initialMessage || "Hi! Let's chat about juggling! 🤹‍♀️";
      const success = await sendMessage(recipientId, recipientName, firstMessage);
      
      if (success) {
        // Refresh conversations to get the new one
        await loadConversations();
        
        // Find and load the new conversation
        const newConversation = conversations.find(conv => 
          (conv.user1Id === user.id && conv.user2Id === recipientId) ||
          (conv.user1Id === recipientId && conv.user2Id === user.id)
        );
        
        if (newConversation) {
          await loadMessages(newConversation.id);
          return newConversation.id;
        }
      }

      return null;
    } catch (error) {
      console.error('Error starting conversation:', error);
      return null;
    }
  }, [user?.id, user?.name, conversations, loadMessages, sendMessage, loadConversations]);

  /**
   * Mark a specific message as read
   */
  const markAsRead = useCallback(async (messageId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const success = await ChatService.markMessageAsRead(messageId, user.id);
      
      if (success) {
        // Update local message state
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, readAt: new Date() }
            : msg
        ));
        
        // Refresh conversations to update unread count
        await loadConversations();
      }
      
      return success;
    } catch (error) {
      console.error('Error marking message as read:', error);
      return false;
    }
  }, [user?.id, loadConversations]);

  /**
   * Mark all messages in a conversation as read
   */
  const markConversationAsRead = useCallback(async (conversationId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const success = await ChatService.markConversationAsRead(conversationId, user.id);
      
      if (success) {
        // Update local message state
        setMessages(prev => prev.map(msg => 
          msg.conversationId === conversationId && msg.recipientId === user.id
            ? { ...msg, readAt: new Date() }
            : msg
        ));
        
        // Refresh conversations to update unread count
        await loadConversations();
      }
      
      return success;
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      return false;
    }
  }, [user?.id, loadConversations]);

  /**
   * Get the other user in a conversation (not the current user)
   */
  const getOtherUser = useCallback((conversation: ChatConversation) => {
    if (!user?.id) {
      return { id: '', name: 'Unknown' };
    }

    if (conversation.user1Id === user.id) {
      return { id: conversation.user2Id, name: conversation.user2Name };
    } else {
      return { id: conversation.user1Id, name: conversation.user1Name };
    }
  }, [user?.id]);

  /**
   * Check if a message is from the current user
   */
  const isMessageFromCurrentUser = useCallback((message: ChatMessage): boolean => {
    return message.senderId === user?.id;
  }, [user?.id]);

  /**
   * Update total unread count
   */
  const updateUnreadCount = useCallback((conversationList: ChatConversation[]) => {
    const total = conversationList.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
    setTotalUnreadCount(total);
  }, []);

  return {
    // Conversation management
    conversations,
    conversationsLoading,
    refreshConversations,
    
    // Message management
    messages,
    messagesLoading,
    currentConversationId,
    
    // Actions
    sendMessage,
    markAsRead,
    markConversationAsRead,
    loadMessages,
    
    // Real-time features
    startConversation,
    
    // Statistics
    totalUnreadCount,
    
    // Utilities
    getOtherUser,
    isMessageFromCurrentUser
  };
}
