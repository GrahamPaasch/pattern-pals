import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Alert
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../hooks/useAuth';
import { ChatConversation } from '../services/chatService';

type ChatScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Chat'>;
};

/**
 * Main chat screen showing list of conversations
 * Users can see all their chat conversations and start new ones
 */
export default function ChatScreen({ navigation }: ChatScreenProps) {
  const { user } = useAuth();
  const {
    conversations,
    conversationsLoading,
    refreshConversations,
    totalUnreadCount,
    getOtherUser
  } = useChat();

  // Set up navigation options
  useEffect(() => {
    navigation.setOptions({
      title: 'Messages',
      headerRight: () => totalUnreadCount > 0 && (
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{totalUnreadCount}</Text>
        </View>
      ),
    });
  }, [navigation, totalUnreadCount]);

  /**
   * Handle conversation tap - navigate to chat detail screen
   */
  const handleConversationPress = (conversation: ChatConversation) => {
    const otherUser = getOtherUser(conversation);
    
    navigation.navigate('ChatDetail', {
      conversationId: conversation.id,
      recipientId: otherUser.id,
      recipientName: otherUser.name
    });
  };

  /**
   * Format timestamp for conversation list
   */
  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60);
      return minutes === 0 ? 'Just now' : `${minutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      const days = Math.floor(diffInHours / 24);
      return `${days}d ago`;
    }
  };

  /**
   * Render conversation item
   */
  const renderConversation = ({ item }: { item: ChatConversation }) => {
    const otherUser = getOtherUser(item);
    const hasUnread = (item.unreadCount || 0) > 0;
    const isFromCurrentUser = item.lastMessageSenderId === user?.id;
    
    return (
      <TouchableOpacity
        style={[styles.conversationItem, hasUnread && styles.unreadConversation]}
        onPress={() => handleConversationPress(item)}
        activeOpacity={0.7}
      >
        {/* User Avatar/Initial */}
        <View style={[styles.avatar, hasUnread && styles.unreadAvatar]}>
          <Text style={[styles.avatarText, hasUnread && styles.unreadAvatarText]}>
            {otherUser.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        {/* Conversation Details */}
        <View style={styles.conversationDetails}>
          <View style={styles.headerRow}>
            <Text style={[styles.userName, hasUnread && styles.unreadUserName]}>
              {otherUser.name}
            </Text>
            <Text style={[styles.timestamp, hasUnread && styles.unreadTimestamp]}>
              {formatTimestamp(item.lastMessageAt)}
            </Text>
          </View>
          
          <View style={styles.messageRow}>
            <Text 
              style={[styles.lastMessage, hasUnread && styles.unreadLastMessage]}
              numberOfLines={2}
            >
              {isFromCurrentUser && (item.lastMessage ? 'You: ' : '')}
              {item.lastMessage || 'No messages yet'}
            </Text>
            
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {item.unreadCount! > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  /**
   * Handle new conversation creation
   */
  const handleNewConversation = () => {
    Alert.alert(
      'Start New Chat',
      'To start a new conversation, go to the Matches screen and connect with someone first!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Go to Matches',
          onPress: () => navigation.navigate('MainTabs')
        }
      ]
    );
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No conversations yet</Text>
      <Text style={styles.emptyStateSubtitle}>
        Connect with other jugglers to start chatting!
      </Text>
      <TouchableOpacity style={styles.emptyStateButton} onPress={handleNewConversation}>
        <Text style={styles.emptyStateButtonText}>Find Juggling Partners</Text>
      </TouchableOpacity>
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>Please sign in</Text>
          <Text style={styles.emptyStateSubtitle}>
            You need to be signed in to access your messages
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        refreshControl={
          <RefreshControl
            refreshing={conversationsLoading}
            onRefresh={refreshConversations}
            tintColor="#6366f1"
          />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={conversations.length === 0 ? styles.emptyContainer : undefined}
        showsVerticalScrollIndicator={false}
      />
      
      {conversations.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleNewConversation}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  emptyContainer: {
    flex: 1,
  },
  headerBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  unreadConversation: {
    backgroundColor: '#f0f9ff',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  unreadAvatar: {
    backgroundColor: '#6366f1',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  unreadAvatarText: {
    color: 'white',
  },
  conversationDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  unreadUserName: {
    fontWeight: 'bold',
    color: '#111827',
  },
  timestamp: {
    fontSize: 12,
    color: '#9ca3af',
  },
  unreadTimestamp: {
    color: '#6366f1',
    fontWeight: '600',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
    marginRight: 8,
  },
  unreadLastMessage: {
    color: '#4b5563',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyStateButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
