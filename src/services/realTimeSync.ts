/**
 * Real-Time Sync Service
 * Handles live synchronization of user activities, connection requests, and pattern updates
 * Creates a social, multiplayer experience similar to real-time games
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { NotificationService } from './notifications';
import { PushNotificationService } from './pushNotificationService'; // Add this import
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RealTimeEvent {
  type: 'connection_request' | 'connection_accepted' | 'pattern_learned' | 'pattern_added' | 'user_online' | 'session_proposed';
  userId: string;
  targetUserId?: string;
  data: any;
  timestamp: Date;
}

export interface UserActivity {
  userId: string;
  userName: string;
  type: 'pattern_learned' | 'pattern_added' | 'session_completed' | 'achievement_unlocked';
  message: string;
  timestamp: Date;
  patternName?: string;
  metadata?: any;
}

export interface OnlineStatus {
  userId: string;
  userName: string;
  isOnline: boolean;
  lastSeen: Date;
  currentActivity?: string;
}

export class RealTimeSyncService {
  private static activeSubscriptions: any[] = [];
  private static userStatusInterval: NodeJS.Timeout | null = null;
  private static activityCallbacks: ((activity: UserActivity) => void)[] = [];
  private static statusCallbacks: ((statuses: OnlineStatus[]) => void)[] = [];

  /**
   * Initialize real-time sync for a user
   */
  static async initialize(userId: string, userName: string): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      console.log('RealTimeSync: Supabase not configured, using local mode');
      return;
    }

    try {
      // Clean up existing subscriptions
      this.cleanup();

      // Subscribe to connection requests
      await this.subscribeToConnectionRequests(userId);
      
      // Subscribe to friend activities
      await this.subscribeToFriendActivities(userId);
      
      // Start user presence tracking
      await this.startPresenceTracking(userId, userName);
      
      console.log('RealTimeSync: Initialized for user', userName);
    } catch (error) {
      console.error('RealTimeSync: Initialization failed', error);
    }
  }

  /**
   * Subscribe to incoming connection requests
   */
  private static async subscribeToConnectionRequests(userId: string): Promise<void> {
    if (!supabase) return;

    const subscription = supabase
      .channel('connection_requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'connection_requests',
          filter: `to_user_id=eq.${userId}`
        },
        async (payload) => {
          console.log('RealTimeSync: New connection request received', payload);
          
          const request = payload.new;
          
          // Create instant notification
          await NotificationService.addNotification(userId, {
            type: 'connection_request',
            title: 'New Connection Request!',
            message: `${request.from_user_name} wants to connect with you`,
            read: false,
            relatedId: request.id
          });

          // Broadcast to UI
          this.broadcastEvent({
            type: 'connection_request',
            userId: request.from_user_id,
            targetUserId: userId,
            data: request,
            timestamp: new Date()
          });
        }
      )
      .subscribe();

    this.activeSubscriptions.push(subscription);
  }

  /**
   * Subscribe to friend activities (pattern learning, achievements, etc.)
   */
  private static async subscribeToFriendActivities(userId: string): Promise<void> {
    if (!supabase) return;

    // Get user's connections to know whose activities to track
    const { data: connections } = await supabase
      .from('connections')
      .select('user1_id, user2_id, user1_name, user2_name')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .eq('status', 'active');

    if (!connections || connections.length === 0) return;

    // Extract friend IDs
    const friendIds = connections.map(conn => 
      conn.user1_id === userId ? conn.user2_id : conn.user1_id
    );

    // Subscribe to user pattern changes for friends
    const subscription = supabase
      .channel('friend_patterns')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_patterns',
          filter: `user_id.in.(${friendIds.join(',')})`
        },
        async (payload) => {
          console.log('RealTimeSync: Friend pattern activity', payload);
          
          const patternData = payload.new || payload.old;
          if (!patternData) return;
          
          if (payload.eventType === 'INSERT' && (patternData as any).status === 'known') {
            // Friend learned a new pattern!
            const friend = connections.find(conn => 
              conn.user1_id === (patternData as any).user_id || conn.user2_id === (patternData as any).user_id
            );
            
            const friendName = friend ? 
              (friend.user1_id === (patternData as any).user_id ? friend.user1_name : friend.user2_name) : 
              'Friend';

            const activity: UserActivity = {
              userId: (patternData as any).user_id,
              userName: friendName,
              type: 'pattern_learned',
              message: `${friendName} just learned ${(patternData as any).pattern_id}!`,
              timestamp: new Date(),
              patternName: (patternData as any).pattern_id,
              metadata: { patternId: (patternData as any).pattern_id }
            };

            // Notify user about friend's achievement
            await NotificationService.addNotification(userId, {
              type: 'new_match',
              title: 'Friend Achievement! 🎉',
              message: activity.message,
              read: false,
              relatedId: (patternData as any).user_id
            });

            // Broadcast to activity callbacks
            this.activityCallbacks.forEach(callback => callback(activity));
          }
        }
      )
      .subscribe();

    this.activeSubscriptions.push(subscription);
  }

  /**
   * Broadcast when a user learns a new pattern - creates social awareness like Among Us
   */
  static async broadcastPatternLearned(
    userId: string, 
    userName: string, 
    patternName: string
  ): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      console.log('🔔 RealTimeSync: Broadcasting pattern learning locally (Supabase not configured)');
      // For local mode, we'll use AsyncStorage to notify friends
      await this.broadcastPatternLearnedLocal(userId, userName, patternName);
      return;
    }

    try {
      // Get all friends/connections of this user
      const { data: connections } = await supabase
        .from('connections')
        .select('user1_id, user2_id, user1_name, user2_name')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .eq('status', 'active');

      if (connections && connections.length > 0) {
        console.log(`🎉 Broadcasting "${userName} learned ${patternName}" to ${connections.length} friends`);
        
        // Notify each friend about this achievement
        for (const connection of connections) {
          const friendId = connection.user1_id === userId ? connection.user2_id : connection.user1_id;
          
          // Add instant notification
          await NotificationService.addNotification(friendId, {
            type: 'new_match',
            title: 'Friend Achievement! 🎯',
            message: `${userName} just mastered "${patternName}"! Send them a congratulations or ask for tips.`,
            read: false,
            relatedId: userId
          });
        }

        // Store the activity for the activity feed
        const activity: UserActivity = {
          userId,
          userName,
          type: 'pattern_learned',
          message: `${userName} mastered "${patternName}"`,
          timestamp: new Date(),
          patternName,
          metadata: { patternId: patternName, friendsNotified: connections.length }
        };

        // Broadcast to all activity listeners
        this.activityCallbacks.forEach(callback => callback(activity));
      }
    } catch (error) {
      console.error('🔔 Error broadcasting pattern learned:', error);
      // Fall back to local broadcast
      await this.broadcastPatternLearnedLocal(userId, userName, patternName);
    }
  }

  /**
   * Local broadcast for pattern learning (when Supabase isn't available)
   */
  private static async broadcastPatternLearnedLocal(
    userId: string, 
    userName: string, 
    patternName: string
  ): Promise<void> {
    try {
      // Store in local activity feed that other users can check
      const activityKey = 'global_activity_feed';
      const stored = await AsyncStorage.getItem(activityKey);
      const activities = stored ? JSON.parse(stored) : [];
      
      const newActivity: UserActivity = {
        userId,
        userName,
        type: 'pattern_learned',
        message: `${userName} just learned "${patternName}"! 🎯`,
        timestamp: new Date(),
        patternName,
        metadata: { patternId: patternName }
      };
      
      // Keep only recent activities (last 50)
      activities.unshift(newActivity);
      const recentActivities = activities.slice(0, 50);
      
      await AsyncStorage.setItem(activityKey, JSON.stringify(recentActivities));
      console.log(`🔔 Added pattern learning to global activity feed: ${userName} → ${patternName}`);
      
      // Notify activity listeners
      this.activityCallbacks.forEach(callback => callback(newActivity));
    } catch (error) {
      console.error('🔔 Error in local pattern broadcast:', error);
    }
  }

  /**
   * Start user presence tracking
   */
  private static async startPresenceTracking(userId: string, userName: string): Promise<void> {
    if (!supabase) return;

    // Update user's online status
    await supabase!
      .from('users')
      .update({ 
        last_active: new Date().toISOString(),
        is_online: true 
      })
      .eq('id', userId);

    // Set up periodic heartbeat
    this.userStatusInterval = setInterval(async () => {
      try {
        if (supabase) {
          await supabase
            .from('users')
            .update({ last_active: new Date().toISOString() })
            .eq('id', userId);
        }
      } catch (error) {
        console.error('RealTimeSync: Heartbeat failed', error);
      }
    }, 30000); // Update every 30 seconds

    // Subscribe to friend online status changes
    await this.subscribeToFriendPresence(userId);
  }

  /**
   * Subscribe to friend presence updates
   */
  private static async subscribeToFriendPresence(userId: string): Promise<void> {
    if (!supabase) return;

    const subscription = supabase
      .channel('friend_presence')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id.neq.${userId}` // Don't listen to own updates
        },
        async (payload) => {
          // Check if this user is a friend
          const updatedUser = payload.new;
          const isConnected = await this.isUserConnected(userId, updatedUser.id);
          
          if (isConnected) {
            const status: OnlineStatus = {
              userId: updatedUser.id,
              userName: updatedUser.name,
              isOnline: this.isRecentlyActive(updatedUser.last_active),
              lastSeen: new Date(updatedUser.last_active),
              currentActivity: updatedUser.current_activity
            };

            // Broadcast to status callbacks
            this.statusCallbacks.forEach(callback => callback([status]));
          }
        }
      )
      .subscribe();

    this.activeSubscriptions.push(subscription);
  }

  /**
   * Check if user is connected to another user
   */
  private static async isUserConnected(userId: string, otherUserId: string): Promise<boolean> {
    if (!supabase) return false;

    const { data } = await supabase
      .from('connections')
      .select('id')
      .or(`and(user1_id.eq.${userId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${userId})`)
      .eq('status', 'active')
      .single();

    return !!data;
  }

  /**
   * Check if user was recently active (online)
   */
  private static isRecentlyActive(lastActive: string): boolean {
    const lastActiveDate = new Date(lastActive);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return lastActiveDate > fiveMinutesAgo;
  }

  /**
   * Send instant connection request notification
   */
  static async broadcastConnectionRequest(
    fromUserId: string,
    fromUserName: string,
    toUserId: string,
    toUserName: string
  ): Promise<void> {
    try {
      // Create instant notification for target user
      await NotificationService.addNotification(toUserId, {
        type: 'new_match',
        title: 'New Connection Request!',
        message: `${fromUserName} wants to connect with you`,
        read: false,
        relatedId: fromUserId
      });

      console.log(`RealTimeSync: Broadcasted connection request from ${fromUserName} to ${toUserName}`);
    } catch (error) {
      console.error('RealTimeSync: Failed to broadcast connection request', error);
    }
  }

  /**
   * Enhanced connection request broadcasting with instant delivery
   */
  static async broadcastConnectionRequestInstant(
    fromUserId: string,
    fromUserName: string,
    toUserId: string,
    toUserName: string
  ): Promise<void> {
    try {
      console.log(`🚀 Broadcasting INSTANT connection request from ${fromUserName} to ${toUserName}`);

      // Create instant high-priority notification
      const notificationData = {
        type: 'connection_request' as const,
        userId: toUserId,
        title: 'New Connection Request! 🤝',
        body: `${fromUserName} wants to connect with you. They share similar juggling interests!`,
        data: {
          type: 'connection_request',
          fromUserId,
          fromUserName,
          toUserId,
          timestamp: new Date().toISOString()
        },
        priority: 'high' as const,
        sound: 'default',
        badge: 1
      };

      // Send via instant notification system
      const success = await PushNotificationService.sendInstantNotification(toUserId, notificationData);
      
      if (success) {
        console.log(`🚀 Instant connection request delivered to ${toUserName}`);
      } else {
        console.log(`⚠️ Falling back to standard notification for ${toUserName}`);
        // Fallback to regular notification system
        await NotificationService.addNotification(toUserId, {
          type: 'connection_request',
          title: 'New Connection Request!',
          message: `${fromUserName} wants to connect with you`,
          read: false,
          relatedId: fromUserId
        });
      }
      
    } catch (error) {
      console.error('RealTimeSync: Failed to broadcast instant connection request', error);
      
      // Always ensure notification is delivered somehow
      await this.broadcastConnectionRequest(fromUserId, fromUserName, toUserId, toUserName);
    }
  }

  /**
   * Enhanced pattern learning broadcast with instant notifications
   */
  static async broadcastPatternLearnedInstant(
    userId: string, 
    userName: string, 
    patternName: string
  ): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      console.log('🔔 RealTimeSync: Broadcasting pattern learning locally (Supabase not configured)');
      await this.broadcastPatternLearnedLocal(userId, userName, patternName);
      return;
    }

    try {
      // Get all friends/connections of this user
      const { data: connections } = await supabase
        .from('connections')
        .select('user1_id, user2_id, user1_name, user2_name')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .eq('status', 'active');

      if (connections && connections.length > 0) {
        console.log(`🎉 Broadcasting INSTANT "${userName} learned ${patternName}" to ${connections.length} friends`);
        
        // Create instant notifications for all friends
        const notificationPromises = connections.map(async (connection) => {
          const friendId = connection.user1_id === userId ? connection.user2_id : connection.user1_id;
          
          const notificationData = {
            type: 'pattern_learned' as const,
            userId: friendId,
            title: 'Friend Achievement! 🎯',
            body: `${userName} just mastered "${patternName}"! Send congratulations or ask for tips.`,
            data: {
              type: 'pattern_learned',
              achieverUserId: userId,
              achieverName: userName,
              patternName,
              timestamp: new Date().toISOString()
            },
            priority: 'normal' as const,
            sound: 'achievement'
          };

          // Send instant notification
          return PushNotificationService.sendInstantNotification(friendId, notificationData);
        });

        const results = await Promise.allSettled(notificationPromises);
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
        
        console.log(`🎉 Instant notifications sent: ${successCount}/${connections.length} successful`);
        
        // Also broadcast to activity listeners for real-time UI updates
        const activity: UserActivity = {
          userId,
          userName,
          type: 'pattern_learned',
          message: `${userName} just learned "${patternName}"! 🎯`,
          timestamp: new Date(),
          patternName,
          metadata: { patternId: patternName }
        };
        
        this.activityCallbacks.forEach(callback => callback(activity));
      }
    } catch (error) {
      console.error('🔔 Error in instant pattern broadcast:', error);
      // Fallback to standard broadcast
      await this.broadcastPatternLearned(userId, userName, patternName);
    }
  }

  /**
   * Real-time session reminder with instant delivery
   */
  static async sendInstantSessionReminder(
    userId: string,
    partnerName: string,
    sessionTime: Date,
    minutesUntil: number
  ): Promise<void> {
    try {
      const isUrgent = minutesUntil <= 15; // Urgent if 15 minutes or less
      
      const notificationData = {
        type: 'session_reminder' as const,
        userId,
        title: isUrgent ? '⏰ Session Starting Soon!' : '📅 Session Reminder',
        body: `Your practice session with ${partnerName} ${isUrgent ? 'starts' : 'is'} in ${minutesUntil} minutes`,
        data: {
          type: 'session_reminder',
          partnerName,
          sessionTime: sessionTime.toISOString(),
          minutesUntil,
          isUrgent
        },
        priority: isUrgent ? 'high' as const : 'normal' as const,
        sound: isUrgent ? 'urgent' : 'default',
        badge: 1
      };

      const success = await PushNotificationService.sendInstantNotification(userId, notificationData);
      
      if (success) {
        console.log(`⏰ Instant session reminder delivered to user ${userId}`);
      } else {
        // Fallback to regular notification
        await NotificationService.addNotification(userId, {
          type: 'session_reminder',
          title: notificationData.title,
          message: notificationData.body,
          read: false
        });
      }
      
    } catch (error) {
      console.error('⏰ Error sending instant session reminder:', error);
    }
  }

  /**
   * Broadcast urgent announcements to all users
   */
  static async broadcastUrgentAnnouncement(
    title: string,
    message: string,
    targetUserIds?: string[]
  ): Promise<{ success: number; failed: number }> {
    try {
      let userIds: string[] = [];
      
      if (targetUserIds) {
        userIds = targetUserIds;
      } else if (isSupabaseConfigured() && supabase) {
        // Get all active users
        const { data: users } = await supabase
          .from('users')
          .select('id')
          .eq('is_active', true);
        
        userIds = users ? users.map(u => u.id) : [];
      }

      if (userIds.length === 0) {
        console.log('📢 No users to broadcast to');
        return { success: 0, failed: 0 };
      }

      console.log(`📢 Broadcasting urgent announcement to ${userIds.length} users`);

      const notificationData = {
        type: 'workshop_announcement' as const,
        userId: '', // Will be set per user
        title: `📢 ${title}`,
        body: message,
        data: {
          type: 'urgent_announcement',
          title,
          message,
          timestamp: new Date().toISOString()
        },
        priority: 'high' as const,
        sound: 'announcement'
      };

      const broadcastPromises = userIds.map(async (userId) => {
        const userNotification = { ...notificationData, userId };
        return PushNotificationService.broadcastToAllUserDevices(userId, userNotification);
      });

      const results = await Promise.allSettled(broadcastPromises);
      
      let totalSuccess = 0;
      let totalFailed = 0;
      
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          totalSuccess += result.value.success;
          totalFailed += result.value.failed;
        } else {
          totalFailed++;
        }
      });

      console.log(`📢 Urgent announcement broadcast: ${totalSuccess} delivered, ${totalFailed} failed`);
      return { success: totalSuccess, failed: totalFailed };
      
    } catch (error) {
      console.error('📢 Error broadcasting urgent announcement:', error);
      return { success: 0, failed: 1 };
    }
  }

  /**
   * Register callback for friend activities
   */
  static onFriendActivity(callback: (activity: UserActivity) => void): void {
    this.activityCallbacks.push(callback);
  }

  /**
   * Register callback for friend status updates
   */
  static onFriendStatusUpdate(callback: (statuses: OnlineStatus[]) => void): void {
    this.statusCallbacks.push(callback);
  }

  /**
   * Broadcast event to all listeners
   */
  private static broadcastEvent(event: RealTimeEvent): void {
    // Could implement custom event bus here if needed
    console.log('RealTimeSync: Broadcasting event', event);
  }

  /**
   * Get friend activity feed
   */
  static async getFriendActivityFeed(userId: string): Promise<UserActivity[]> {
    try {
      // For now, return cached activities
      // In production, this would query recent friend activities
      const key = `friend_activities_${userId}`;
      const stored = await AsyncStorage.getItem(key);
      
      if (stored) {
        const activities = JSON.parse(stored);
        return activities.map((activity: any) => ({
          ...activity,
          timestamp: new Date(activity.timestamp)
        }));
      }

      return [];
    } catch (error) {
      console.error('RealTimeSync: Failed to get activity feed', error);
      return [];
    }
  }

  /**
   * Set user's current activity status
   */
  static async updateUserActivity(userId: string, activity: string): Promise<void> {
    try {
      if (!supabase) return;

      await supabase
        .from('users')
        .update({ 
          current_activity: activity,
          last_active: new Date().toISOString()
        })
        .eq('id', userId);
    } catch (error) {
      console.error('RealTimeSync: Failed to update user activity', error);
    }
  }

  /**
   * Clean up all subscriptions and intervals
   */
  static cleanup(): void {
    // Unsubscribe from all channels
    this.activeSubscriptions.forEach(subscription => {
      if (subscription && subscription.unsubscribe) {
        subscription.unsubscribe();
      }
    });
    this.activeSubscriptions = [];

    // Clear heartbeat interval
    if (this.userStatusInterval) {
      clearInterval(this.userStatusInterval);
      this.userStatusInterval = null;
    }

    // Clear callbacks
    this.activityCallbacks = [];
    this.statusCallbacks = [];

    console.log('RealTimeSync: Cleaned up');
  }

  /**
   * Mark user as offline
   */
  static async setUserOffline(userId: string): Promise<void> {
    try {
      if (!supabase) return;

      await supabase
        .from('users')
        .update({ 
          is_online: false,
          last_active: new Date().toISOString()
        })
        .eq('id', userId);
    } catch (error) {
      console.error('RealTimeSync: Failed to set user offline', error);
    }
  }
}
