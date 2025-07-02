import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { Notification } from '../types';

export interface LocalNotification {
  id: string;
  type: 'new_match' | 'session_reminder' | 'session_invite' | 'workshop_announcement' | 'connection_request';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  relatedId?: string;
}

export class NotificationService {
  private static STORAGE_KEY = 'user_notifications';
  private static USE_SUPABASE = true; // Enable Supabase backend (will fallback to local if not configured)
  private static pushNotificationService: any = null;

  /**
   * Initialize notification service with push notification support
   */
  static async initialize(userId: string): Promise<void> {
    try {
      // Dynamically import push notification service to avoid circular dependencies
      const { PushNotificationService } = await import('./pushNotificationService');
      this.pushNotificationService = PushNotificationService;
      
      // Initialize push notifications
      await PushNotificationService.initialize(userId);
      
      console.log('📱 NotificationService: Initialized with push notification support');
    } catch (error) {
      console.error('📱 NotificationService: Failed to initialize push notifications', error);
    }
  }

  /**
   * Check if Supabase is properly configured
   */
  private static isSupabaseConfigured(): boolean {
    return isSupabaseConfigured() === true;
  }

  /**
   * Get all notifications for a user
   */
  static async getUserNotifications(userId: string): Promise<LocalNotification[]> {
    try {
      if (this.USE_SUPABASE && this.isSupabaseConfigured() && supabase) {
        console.log('NotificationService: Using Supabase backend for getUserNotifications');
        // Use Supabase for real backend
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('NotificationService: Supabase error (table may not exist), falling back to local:', error.message);
          return this.getUserNotificationsLocal(userId);
        }

        // Convert Supabase data to LocalNotification format
        return data.map(item => ({
          id: item.id,
          type: item.type as LocalNotification['type'],
          title: item.title,
          message: item.message,
          read: item.read,
          createdAt: new Date(item.created_at),
          relatedId: item.related_id
        }));
      } else {
        console.log('NotificationService: Using local storage fallback');
        return this.getUserNotificationsLocal(userId);
      }
    } catch (error) {
      console.error('Error in getUserNotifications:', error);
      return this.getUserNotificationsLocal(userId);
    }
  }

  /**
   * Get notifications from local storage (fallback)
   */
  private static async getUserNotificationsLocal(userId: string): Promise<LocalNotification[]> {
    try {
      const key = `${this.STORAGE_KEY}_${userId}`;
      const storedData = await AsyncStorage.getItem(key);
      
      if (storedData) {
        const notifications = JSON.parse(storedData);
        return notifications.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt)
        }));
      }

      // Return some default notifications for demo
      return this.getDefaultNotifications();
    } catch (error) {
      console.error('Error in getUserNotificationsLocal:', error);
      return this.getDefaultNotifications();
    }
  }

  /**
   * Add a new notification with push delivery
   */
  static async addNotification(
    userId: string,
    notification: Omit<LocalNotification, 'id' | 'createdAt'>
  ): Promise<boolean> {
    try {
      let success = false;

      // Add to local/database storage first
      if (this.USE_SUPABASE && this.isSupabaseConfigured() && supabase) {
        console.log('NotificationService: Adding notification to Supabase');
        // Add to Supabase
        const { error } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            read: notification.read,
            related_id: notification.relatedId
          });

        if (error) {
          console.error('NotificationService: Supabase error, falling back to local:', error);
          success = await this.addNotificationLocal(userId, notification);
        } else {
          success = true;
        }
      } else {
        console.log('NotificationService: Adding notification to local storage');
        success = await this.addNotificationLocal(userId, notification);
      }

      // Send push notification if local storage succeeded
      if (success && this.pushNotificationService) {
        try {
          await this.pushNotificationService.sendPushNotification(userId, {
            type: notification.type,
            userId: userId,
            title: notification.title,
            body: notification.message,
            data: {
              type: notification.type,
              relatedId: notification.relatedId,
              notificationId: notification.relatedId || Date.now().toString()
            },
            priority: this.getPushPriority(notification.type),
            sound: 'default'
          });
          console.log('📱 Push notification sent for:', notification.title);
        } catch (pushError) {
          console.error('📱 Failed to send push notification:', pushError);
          // Don't fail the whole operation if push fails
        }
      }

      return success;
    } catch (error) {
      console.error('Error in addNotification:', error);
      return this.addNotificationLocal(userId, notification);
    }
  }

  /**
   * Get push notification priority based on type
   */
  private static getPushPriority(type: LocalNotification['type']): 'default' | 'normal' | 'high' | 'max' {
    switch (type) {
      case 'session_reminder':
        return 'high';
      case 'connection_request':
      case 'new_match':
        return 'high';
      case 'session_invite':
        return 'normal';
      case 'workshop_announcement':
        return 'normal';
      default:
        return 'default';
    }
  }

  /**
   * Add notification to local storage (fallback)
   */
  private static async addNotificationLocal(
    userId: string,
    notification: Omit<LocalNotification, 'id' | 'createdAt'>
  ): Promise<boolean> {
    try {
      const existingNotifications = await this.getUserNotificationsLocal(userId);
      
      const newNotification: LocalNotification = {
        ...notification,
        id: Date.now().toString(),
        createdAt: new Date()
      };

      const updatedNotifications = [newNotification, ...existingNotifications];
      
      const key = `${this.STORAGE_KEY}_${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(updatedNotifications));
      
      return true;
    } catch (error) {
      console.error('Error in addNotification:', error);
      return false;
    }
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(userId: string, notificationId: string): Promise<boolean> {
    try {
      if (this.USE_SUPABASE && this.isSupabaseConfigured() && supabase) {
        console.log('NotificationService: Marking notification as read in Supabase');
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', notificationId)
          .eq('user_id', userId);

        if (error) {
          console.error('NotificationService: Supabase error, falling back to local:', error);
          return this.markAsReadLocal(userId, notificationId);
        }

        return true;
      } else {
        console.log('NotificationService: Marking notification as read in local storage');
        return this.markAsReadLocal(userId, notificationId);
      }
    } catch (error) {
      console.error('Error in markAsRead:', error);
      return this.markAsReadLocal(userId, notificationId);
    }
  }

  /**
   * Mark notification as read in local storage (fallback)
   */
  private static async markAsReadLocal(userId: string, notificationId: string): Promise<boolean> {
    try {
      const notifications = await this.getUserNotificationsLocal(userId);
      const updatedNotifications = notifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      );

      const key = `${this.STORAGE_KEY}_${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(updatedNotifications));
      
      return true;
    } catch (error) {
      console.error('Error in markAsReadLocal:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(userId: string): Promise<boolean> {
    try {
      if (this.USE_SUPABASE && this.isSupabaseConfigured() && supabase) {
        console.log('NotificationService: Marking all notifications as read in Supabase');
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', userId)
          .eq('read', false);

        if (error) {
          console.error('NotificationService: Supabase error, falling back to local:', error);
          return this.markAllAsReadLocal(userId);
        }

        return true;
      } else {
        console.log('NotificationService: Marking all notifications as read in local storage');
        return this.markAllAsReadLocal(userId);
      }
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      return this.markAllAsReadLocal(userId);
    }
  }

  /**
   * Mark all notifications as read in local storage (fallback)
   */
  private static async markAllAsReadLocal(userId: string): Promise<boolean> {
    try {
      const notifications = await this.getUserNotificationsLocal(userId);
      const updatedNotifications = notifications.map(notification => ({
        ...notification,
        read: true
      }));

      const key = `${this.STORAGE_KEY}_${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(updatedNotifications));
      
      return true;
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      return false;
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const notifications = await this.getUserNotifications(userId);
      return notifications.filter(n => !n.read).length;
    } catch (error) {
      console.error('Error in getUnreadCount:', error);
      return 0;
    }
  }

  /**
   * Clear all notifications
   */
  static async clearAllNotifications(userId: string): Promise<boolean> {
    try {
      const key = `${this.STORAGE_KEY}_${userId}`;
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error in clearAllNotifications:', error);
      return false;
    }
  }

  /**
   * Default notifications for demo purposes
   */
  private static getDefaultNotifications(): LocalNotification[] {
    return [
      {
        id: '1',
        type: 'new_match',
        title: 'New Match Found!',
        message: 'Alex Chen is a 92% match with shared interest in club passing',
        read: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        id: '2',
        type: 'session_reminder',
        title: 'Session Reminder',
        message: 'Your practice session with Sarah starts in 30 minutes',
        read: false,
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      },
      {
        id: '3',
        type: 'workshop_announcement',
        title: 'Workshop Tomorrow',
        message: 'Advanced Passing Patterns workshop at Central Park - 2 PM',
        read: true,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        id: '4',
        type: 'session_invite',
        title: 'Session Invitation',
        message: 'Mike Rodriguez invited you to practice on Friday at 6 PM',
        read: true,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      {
        id: '5',
        type: 'new_match',
        title: 'New Match Found!',
        message: 'Emma Davis wants to learn patterns you know',
        read: true,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
    ];
  }

  /**
   * Send batch notifications with push delivery
   */
  static async sendBatchNotifications(
    notifications: Array<{
      userId: string;
      notification: Omit<LocalNotification, 'id' | 'createdAt'>;
    }>
  ): Promise<{ success: number; failed: number }> {
    const results = { success: 0, failed: 0 };

    try {
      // Process notifications in batches
      const batchSize = 10;
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async ({ userId, notification }) => {
          const success = await this.addNotification(userId, notification);
          if (success) {
            results.success++;
          } else {
            results.failed++;
          }
        });

        await Promise.all(batchPromises);
      }

      console.log(`📱 Batch notifications: ${results.success} sent, ${results.failed} failed`);
    } catch (error) {
      console.error('Error in sendBatchNotifications:', error);
    }

    return results;
  }

  /**
   * Schedule a notification for later delivery
   */
  static async scheduleNotification(
    userId: string,
    notification: Omit<LocalNotification, 'id' | 'createdAt'>,
    scheduledFor: Date
  ): Promise<string | null> {
    try {
      if (!this.pushNotificationService) {
        console.warn('📱 Push notification service not available for scheduling');
        return null;
      }

      return await this.pushNotificationService.scheduleNotification({
        type: notification.type,
        userId: userId,
        title: notification.title,
        body: notification.message,
        data: {
          type: notification.type,
          relatedId: notification.relatedId,
        },
        priority: this.getPushPriority(notification.type),
      }, scheduledFor);
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * Update badge count based on unread notifications
   */
  static async updateBadgeCount(userId: string): Promise<void> {
    try {
      const unreadCount = await this.getUnreadCount(userId);
      
      if (this.pushNotificationService) {
        await this.pushNotificationService.updateBadgeCount(unreadCount);
      }
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  }

  /**
   * Simulate new match notification
   */
  static async notifyNewMatch(
    userId: string,
    matchName: string,
    compatibility: number
  ): Promise<boolean> {
    return this.addNotification(userId, {
      type: 'new_match',
      title: 'New Match Found!',
      message: `${matchName} is a ${compatibility}% match with shared interests`,
      read: false,
    });
  }

  /**
   * Simulate session reminder notification
   */
  static async notifySessionReminder(
    userId: string,
    partnerName: string,
    timeUntil: string
  ): Promise<boolean> {
    return this.addNotification(userId, {
      type: 'session_reminder',
      title: 'Session Reminder',
      message: `Your practice session with ${partnerName} starts ${timeUntil}`,
      read: false,
    });
  }

  /**
   * Simulate session invitation notification
   */
  static async notifySessionInvite(
    userId: string,
    inviterName: string,
    sessionDetails: string
  ): Promise<boolean> {
    return this.addNotification(userId, {
      type: 'session_invite',
      title: 'Session Invitation',
      message: `${inviterName} invited you to practice ${sessionDetails}`,
      read: false,
    });
  }

  /**
   * Cleanup notification service
   */
  static cleanup(): void {
    if (this.pushNotificationService) {
      this.pushNotificationService.cleanup();
    }
  }
}
