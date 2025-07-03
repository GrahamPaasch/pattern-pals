import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { patterns } from '../data/patterns';
import { ConnectionService } from '../services';
import { useAuth } from '../hooks/useAuth';

interface UserProfileViewProps {
  route: {
    params: {
      userId: string;
      name: string;
      experience: string;
      score: number;
      sharedPatterns: string[];
      canTeach: string[];
      canLearn: string[];
      distance: string;
      lastActive: string;
    };
  };
  navigation: any;
}

export default function UserProfileViewScreen({ route, navigation }: UserProfileViewProps) {
  const { userId, name, experience, score, sharedPatterns, canTeach, canLearn, distance, lastActive } = route.params;
  const [connectionSent, setConnectionSent] = useState(false);
  const { user, userProfile } = useAuth();

  console.log('UserProfileViewScreen rendered for user:', name);
  console.log('Route params:', route.params);

  const getExperienceColor = (experience: string) => {
    switch (experience) {
      case 'Beginner':
        return '#10b981';
      case 'Intermediate':
        return '#f59e0b';
      case 'Advanced':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#10b981';
    if (score >= 75) return '#f59e0b';
    return '#6b7280';
  };

  const handleConnect = async () => {
    if (!user || !userProfile) {
      Alert.alert('Error', 'You must be logged in to send connection requests.');
      return;
    }

    // Check if request already sent
    const hasPending = await ConnectionService.hasPendingRequest(user.id, userId);
    if (hasPending) {
      Alert.alert('Request Already Sent', `You've already sent a connection request to ${name}.`);
      return;
    }

    Alert.alert(
      'Send Connection Request',
      `Would you like to send a connection request to ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          onPress: async () => {
            try {
              const success = await ConnectionService.sendConnectionRequest(
                user.id,
                userId,
                userProfile.name,
                name
              );

              if (success) {
                setConnectionSent(true);
                Alert.alert(
                  'Request Sent!',
                  `Your connection request has been sent to ${name}. They will be notified and can accept or decline your request.`,
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert(
                  'Error',
                  'Failed to send connection request. Please try again.',
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              console.error('Error sending connection request:', error);
              Alert.alert(
                'Error',
                'Failed to send connection request. Please try again.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  const handleMessage = async () => {
    if (!user || !userProfile) {
      Alert.alert('Error', 'You must be logged in to send messages.');
      return;
    }

    try {
      // Check if users are connected first
      const { ConnectionService } = await import('../services/connections');
      const connections = await ConnectionService.getConnectionsForUser(user.id);
      const isConnected = connections.some(conn => 
        (conn.userId1 === user.id && conn.userId2 === userId) ||
        (conn.userId1 === userId && conn.userId2 === user.id)
      );

      if (!isConnected) {
        Alert.alert(
          'Not Connected',
          'You need to connect with this user before you can send them messages.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Navigate to chat or create new conversation
      const { ChatService } = await import('../services/chatService');
      const conversationId = await ChatService.getOrCreateConversation(user.id, userId);
      
      // Navigate to ChatDetail screen
      navigation.navigate('ChatDetail', {
        conversationId,
        recipientId: userId,
        recipientName: name
      });

    } catch (error) {
      console.error('Error starting conversation:', error);
      Alert.alert(
        'Error',
        'Unable to start conversation. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleScheduleSession = () => {
    Alert.alert(
      'Schedule Session',
      `Would you like to propose a juggling session with ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Propose Session',
          onPress: () => {
            navigation.navigate('SessionScheduling', {
              partnerId: userId,
              partnerName: name,
            });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{name}</Text>
            <View style={styles.metaInfo}>
              <View 
                style={[
                  styles.experienceBadge, 
                  { backgroundColor: getExperienceColor(experience) }
                ]}
              >
                <Text style={styles.experienceText}>{experience}</Text>
              </View>
              <Text style={styles.distance}>{distance} away</Text>
            </View>
            <Text style={styles.lastActive}>Last active {lastActive}</Text>
          </View>
          <View style={styles.scoreContainer}>
            <Text style={[styles.score, { color: getScoreColor(score) }]}>
              {score}%
            </Text>
            <Text style={styles.scoreLabel}>Match Score</Text>
          </View>
        </View>

        {/* Shared Patterns */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shared Patterns ({sharedPatterns.length})</Text>
          <Text style={styles.sectionDescription}>
            Patterns you both know that you could practice together
          </Text>
          <View style={styles.patternGrid}>
            {sharedPatterns.map((pattern, index) => (
              <View key={`shared-${pattern}-${index}`} style={styles.patternCard}>
                <Text style={styles.patternName}>{pattern}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* They Can Teach You */}
        {canTeach.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>They Can Teach You ({canTeach.length})</Text>
            <Text style={styles.sectionDescription}>
              Patterns they know that you want to learn
            </Text>
            <View style={styles.patternGrid}>
              {canTeach.map((pattern, index) => (
                <View key={`teach-${pattern}-${index}`} style={[styles.patternCard, styles.teachCard]}>
                  <Text style={[styles.patternName, styles.teachText]}>{pattern}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* You Can Teach Them */}
        {canLearn.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>You Can Teach Them ({canLearn.length})</Text>
            <Text style={styles.sectionDescription}>
              Patterns you know that they want to learn
            </Text>
            <View style={styles.patternGrid}>
              {canLearn.map((pattern, index) => (
                <View key={`learn-${pattern}-${index}`} style={[styles.patternCard, styles.learnCard]}>
                  <Text style={[styles.patternName, styles.learnText]}>{pattern}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryButton, connectionSent && styles.disabledButton]}
            onPress={handleConnect}
            disabled={connectionSent}
          >
            <Text style={[styles.actionButtonText, styles.primaryButtonText]}>
              {connectionSent ? '✓ Request Sent' : 'Send Connection Request'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={handleScheduleSession}
          >
            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
              Propose Juggling Session
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={handleMessage}
          >
            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
              Send Message
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    padding: 16,
  },
  header: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  experienceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 12,
  },
  experienceText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  distance: {
    fontSize: 16,
    color: '#6b7280',
  },
  lastActive: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  score: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  patternGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  patternCard: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  patternName: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  teachCard: {
    backgroundColor: '#dcfce7',
  },
  teachText: {
    color: '#166534',
  },
  learnCard: {
    backgroundColor: '#dbeafe',
  },
  learnText: {
    color: '#1e40af',
  },
  actionsSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#6366f1',
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secondaryButtonText: {
    color: '#374151',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
});
