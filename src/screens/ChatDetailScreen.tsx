import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../hooks/useAuth';
import { ChatMessage } from '../services/chatService';
import { Ionicons } from '@expo/vector-icons';

type ChatDetailScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ChatDetail'>;
  route: RouteProp<RootStackParamList, 'ChatDetail'>;
};

/**
 * Chat detail screen for individual conversations
 * Shows messages and allows sending new messages
 */
export default function ChatDetailScreen({ navigation, route }: ChatDetailScreenProps) {
  const { conversationId, recipientId, recipientName } = route.params;
  const { user } = useAuth();
  const {
    messages,
    messagesLoading,
    sendMessage,
    loadMessages,
    markConversationAsRead,
    isMessageFromCurrentUser
  } = useChat();

  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Load messages when screen mounts
  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId);
      
      // Mark conversation as read when opened
      if (user?.id) {
        markConversationAsRead(conversationId);
      }
    }
  }, [conversationId, user?.id]);

  // Set navigation title
  useEffect(() => {
    navigation.setOptions({
      title: recipientName,
      headerBackTitle: 'Messages'
    });
  }, [navigation, recipientName]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  /**
   * Send a new message
   */
  const handleSendMessage = async () => {
    if (!inputText.trim() || sending) return;

    const messageToSend = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const success = await sendMessage(recipientId, recipientName, messageToSend);
      
      if (!success) {
        // Restore input text if sending failed
        setInputText(messageToSend);
        Alert.alert('Error', 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setInputText(messageToSend);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  /**
   * Format timestamp for message display
   */
  const formatMessageTime = (date: Date): string => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  /**
   * Render individual message item
   */
  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isCurrentUser = isMessageFromCurrentUser(item);
    const showTimestamp = index === 0 || 
      Math.abs(item.createdAt.getTime() - messages[index - 1].createdAt.getTime()) > 5 * 60 * 1000; // 5 minutes

    return (
      <View style={styles.messageContainer}>
        {showTimestamp && (
          <View style={styles.timestampContainer}>
            <Text style={styles.timestampText}>
              {formatMessageTime(item.createdAt)}
            </Text>
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
        ]}>
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserText : styles.otherUserText
          ]}>
            {item.messageText}
          </Text>
          
          {isCurrentUser && (
            <View style={styles.messageStatus}>
              {item.deliveredAt && (
                <Ionicons 
                  name="checkmark" 
                  size={12} 
                  color={item.readAt ? "#6366f1" : "#9ca3af"} 
                />
              )}
              {item.readAt && (
                <Ionicons 
                  name="checkmark" 
                  size={12} 
                  color="#6366f1" 
                  style={{ marginLeft: -4 }}
                />
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  /**
   * Render empty state when no messages
   */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color="#d1d5db" />
      <Text style={styles.emptyStateText}>
        Start your conversation with {recipientName}
      </Text>
      <Text style={styles.emptyStateSubtext}>
        Say hello and start chatting about juggling!
      </Text>
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Please sign in to chat</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={messages.length === 0 ? styles.emptyContainer : styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder={`Message ${recipientName}...`}
              placeholderTextColor="#9ca3af"
              multiline
              maxLength={1000}
              editable={!sending}
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || sending) && styles.sendButtonDisabled
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || sending}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={(!inputText.trim() || sending) ? "#d1d5db" : "white"} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 8,
  },
  timestampContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  timestampText: {
    fontSize: 12,
    color: '#9ca3af',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  currentUserBubble: {
    backgroundColor: '#6366f1',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
  },
  otherUserBubble: {
    backgroundColor: 'white',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    flex: 1,
  },
  currentUserText: {
    color: 'white',
  },
  otherUserText: {
    color: '#1f2937',
  },
  messageStatus: {
    flexDirection: 'row',
    marginLeft: 8,
    alignItems: 'flex-end',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4b5563',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f9fafb',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    maxHeight: 100,
    minHeight: 24,
    paddingVertical: 4,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#f3f4f6',
  },
});
