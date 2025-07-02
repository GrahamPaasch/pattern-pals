/**
 * Real-Time Push Notification Service
 * Handles push notification permissions, device registration, and real-time delivery
 * Integrates with Expo Notifications for cross-platform push notifications
 * Enhanced with real-time delivery, message queuing, and advanced retry logic
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { LocalNotification } from './notifications';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushToken {
  token: string;
  type: 'expo' | 'fcm' | 'apns';
  deviceId: string;
  userId: string;
  registeredAt: Date;
}

export interface PushNotificationData {
  type: 'new_match' | 'session_reminder' | 'session_invite' | 'workshop_announcement' | 'connection_request' | 'pattern_learned';
  userId: string;
  title: string;
  body: string;
  data?: any;
  sound?: string;
  badge?: number;
  priority?: 'default' | 'normal' | 'high' | 'max';
  scheduledFor?: Date;
  deliveryTracking?: boolean;
}

export interface NotificationDeliveryStatus {
  notificationId: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'expired';
  timestamp: Date;
  error?: string;
  retryCount?: number;
}

export interface QueuedNotification {
  id: string;
  notificationData: PushNotificationData;
  targetUserId: string;
  createdAt: Date;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
}

export class PushNotificationService {
  private static PUSH_TOKEN_KEY = 'expo_push_token';
  private static DEVICE_ID_KEY = 'device_id';
  private static NOTIFICATION_QUEUE_KEY = 'notification_queue';
  private static DELIVERY_STATUS_KEY = 'delivery_status';
  private static notificationListeners: any[] = [];
  private static isInitialized = false;
  private static deliveryQueue: QueuedNotification[] = [];
  private static retryInterval: any = null;
  private static webhookUrl: string | null = null;

  /**
   * Initialize push notification service with enhanced real-time delivery
   */
  static async initialize(userId: string): Promise<string | null> {
    if (this.isInitialized) {
      console.log('📱 PushNotificationService: Already initialized');
      return await this.getCurrentToken();
    }

    try {
      console.log('📱 PushNotificationService: Initializing...');

      // Check if device supports push notifications
      if (Platform.OS === 'web') {
        console.warn('📱 Push notifications not supported on web platform');
        return null;
      }

      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('📱 Push notification permission denied');
        return null;
      }

      // Get or generate device ID
      const deviceId = await this.getOrCreateDeviceId();

      // Register for push token
      const pushToken = await this.registerForPushNotifications();
      if (!pushToken) {
        console.error('📱 Failed to get push token');
        return null;
      }

      // Store token in database
      await this.storePushToken(userId, pushToken, deviceId);

      // Set up notification listeners
      this.setupNotificationListeners();

      // Start retry queue processor
      this.startRetryQueueProcessor();

      // Load any pending notifications from storage
      await this.loadPendingNotifications();

      this.isInitialized = true;
      console.log('📱 PushNotificationService: Initialized successfully with enhanced real-time delivery');
      return pushToken;

    } catch (error) {
      console.error('📱 PushNotificationService: Initialization failed', error);
      return null;
    }
  }

  /**
   * Load pending notifications from storage on app restart
   */
  private static async loadPendingNotifications(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.NOTIFICATION_QUEUE_KEY);
      if (stored) {
        this.deliveryQueue = JSON.parse(stored);
        console.log(`📱 Loaded ${this.deliveryQueue.length} pending notifications from storage`);
      }
    } catch (error) {
      console.error('📱 Error loading pending notifications:', error);
    }
  }

  /**
   * Request notification permissions
   */
  private static async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('📱 Push notification permission not granted');
        return false;
      }

      console.log('📱 Push notification permission granted');
      return true;
    } catch (error) {
      console.error('📱 Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Register for push notifications and get token
   */
  private static async registerForPushNotifications(): Promise<string | null> {
    try {
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      
      // Store token locally
      await AsyncStorage.setItem(this.PUSH_TOKEN_KEY, token);
      
      console.log('📱 Expo push token obtained:', token.substring(0, 20) + '...');
      return token;
    } catch (error) {
      console.error('📱 Error getting push token:', error);
      return null;
    }
  }

  /**
   * Get or create device ID
   */
  private static async getOrCreateDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem(this.DEVICE_ID_KEY);
      
      if (!deviceId) {
        // Generate unique device ID
        deviceId = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem(this.DEVICE_ID_KEY, deviceId);
        console.log('📱 Generated new device ID:', deviceId);
      }
      
      return deviceId;
    } catch (error) {
      console.error('📱 Error with device ID:', error);
      return `${Platform.OS}_${Date.now()}`;
    }
  }

  /**
   * Store push token in database
   */
  private static async storePushToken(userId: string, token: string, deviceId: string): Promise<void> {
    try {
      if (!isSupabaseConfigured() || !supabase) {
        console.log('📱 Supabase not configured, storing token locally only');
        return;
      }

      // Store or update push token in database
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: userId,
          device_id: deviceId,
          push_token: token,
          platform: Platform.OS,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,device_id'
        });

      if (error) {
        console.error('📱 Error storing push token in database:', error);
      } else {
        console.log('📱 Push token stored in database successfully');
      }
    } catch (error) {
      console.error('📱 Error in storePushToken:', error);
    }
  }

  /**
   * Set up notification listeners for real-time handling
   */
  private static setupNotificationListeners(): void {
    // Listener for notifications received while app is foregrounded
    const foregroundListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Notification received in foreground:', notification);
      this.handleNotificationReceived(notification);
    });

    // Listener for when user taps notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('📱 Notification tapped:', response);
      this.handleNotificationResponse(response);
    });

    this.notificationListeners.push(foregroundListener, responseListener);
  }

  /**
   * Handle notification received in foreground
   */
  private static handleNotificationReceived(notification: Notifications.Notification): void {
    const { title, body, data } = notification.request.content;
    
    // You can show custom in-app notification here
    console.log('📱 Processing foreground notification:', { title, body, data });
    
    // Optionally show custom toast or modal
    // This could integrate with your existing notification UI
  }

  /**
   * Handle notification tap/response
   */
  private static handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const { data } = response.notification.request.content;
    
    console.log('📱 Handling notification tap:', data);
    
    // Navigate to relevant screen based on notification type
    if (data?.type && typeof data.type === 'string') {
      this.navigateBasedOnNotificationType(data.type, data);
    }
  }

  /**
   * Navigate based on notification type
   */
  private static navigateBasedOnNotificationType(type: string, data: any): void {
    // This would integrate with your navigation system
    console.log('📱 Should navigate to:', type, data);
    
    // Example navigation logic (you'd implement this based on your navigation setup)
    switch (type) {
      case 'new_match':
      case 'connection_request':
        // Navigate to matches/connections screen
        break;
      case 'session_reminder':
      case 'session_invite':
        // Navigate to sessions screen
        break;
      case 'pattern_learned':
        // Navigate to activity feed
        break;
      default:
        // Navigate to notifications screen
        break;
    }
  }

  /**
   * Send push notification to specific user
   */
  static async sendPushNotification(
    targetUserId: string, 
    notificationData: PushNotificationData
  ): Promise<boolean> {
    try {
      if (!isSupabaseConfigured() || !supabase) {
        console.log('📱 Supabase not configured, cannot send push notification');
        return false;
      }

      // Get user's push tokens
      const { data: tokens, error } = await supabase
        .from('user_push_tokens')
        .select('push_token, platform')
        .eq('user_id', targetUserId)
        .order('updated_at', { ascending: false });

      if (error || !tokens || tokens.length === 0) {
        console.log('📱 No push tokens found for user:', targetUserId);
        return false;
      }

      console.log(`📱 Sending push notification to ${tokens.length} device(s)`);

      // Send to all user's devices
      const sendPromises = tokens.map(tokenData => 
        this.sendExpoNotification(tokenData.push_token, notificationData)
      );

      const results = await Promise.allSettled(sendPromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;

      console.log(`📱 Push notification sent to ${successCount}/${tokens.length} devices`);
      return successCount > 0;

    } catch (error) {
      console.error('📱 Error sending push notification:', error);
      return false;
    }
  }

  /**
   * Send notification via Expo Push API
   */
  private static async sendExpoNotification(
    pushToken: string, 
    notificationData: PushNotificationData
  ): Promise<boolean> {
    try {
      const message = {
        to: pushToken,
        sound: notificationData.sound || 'default',
        title: notificationData.title,
        body: notificationData.body,
        data: notificationData.data || {},
        priority: notificationData.priority || 'high',
        badge: notificationData.badge,
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const responseData = await response.json();
      
      if (responseData.data?.status === 'ok') {
        console.log('📱 Push notification sent successfully');
        return true;
      } else {
        console.error('📱 Push notification failed:', responseData);
        return false;
      }
    } catch (error) {
      console.error('📱 Error sending Expo notification:', error);
      return false;
    }
  }

  /**
   * Send batch push notifications
   */
  static async sendBatchPushNotifications(
    notifications: Array<{
      userId: string;
      notification: PushNotificationData;
    }>
  ): Promise<{ success: number; failed: number }> {
    const results = { success: 0, failed: 0 };

    try {
      const sendPromises = notifications.map(async ({ userId, notification }) => {
        const success = await this.sendPushNotification(userId, notification);
        if (success) {
          results.success++;
        } else {
          results.failed++;
        }
      });

      await Promise.all(sendPromises);
      console.log(`📱 Batch notifications: ${results.success} sent, ${results.failed} failed`);
      
    } catch (error) {
      console.error('📱 Error in batch send:', error);
    }

    return results;
  }

  /**
   * Schedule a notification for later delivery
   */
  static async scheduleNotification(
    notificationData: PushNotificationData,
    scheduledFor: Date
  ): Promise<string | null> {
    try {
      if (scheduledFor.getTime() <= Date.now()) {
        console.warn('📱 Cannot schedule notification in the past');
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationData.title,
          body: notificationData.body,
          data: notificationData.data || {},
          sound: notificationData.sound || 'default',
          badge: notificationData.badge,
        },
        trigger: null, // Send immediately for now, can be enhanced later
      });

      console.log('📱 Notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('📱 Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * Cancel scheduled notification
   */
  static async cancelScheduledNotification(notificationId: string): Promise<boolean> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('📱 Scheduled notification cancelled:', notificationId);
      return true;
    } catch (error) {
      console.error('📱 Error cancelling notification:', error);
      return false;
    }
  }

  /**
   * Get current push token
   */
  static async getCurrentToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.PUSH_TOKEN_KEY);
    } catch (error) {
      console.error('📱 Error getting current token:', error);
      return null;
    }
  }

  /**
   * Update notification badge count
   */
  static async updateBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
      console.log('📱 Badge count updated:', count);
    } catch (error) {
      console.error('📱 Error updating badge count:', error);
    }
  }

  /**
   * Clear all notifications
   */
  static async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
      await this.updateBadgeCount(0);
      console.log('📱 All notifications cleared');
    } catch (error) {
      console.error('📱 Error clearing notifications:', error);
    }
  }

  /**
   * Get delivery statistics for monitoring
   */
  static async getDeliveryStats(): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    queueSize: number;
    retryQueueSize: number;
  }> {
    try {
      let totalSent = 0;
      let totalDelivered = 0;
      let totalFailed = 0;

      // Count delivery statuses from AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      const statusKeys = keys.filter(key => key.startsWith(this.DELIVERY_STATUS_KEY));
      
      for (const key of statusKeys) {
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const status: NotificationDeliveryStatus = JSON.parse(stored);
          switch (status.status) {
            case 'sent':
            case 'delivered':
              totalSent++;
              if (status.status === 'delivered') totalDelivered++;
              break;
            case 'failed':
              totalFailed++;
              break;
          }
        }
      }

      return {
        totalSent,
        totalDelivered,
        totalFailed,
        queueSize: 0, // Current queue is processed immediately
        retryQueueSize: this.deliveryQueue.length
      };
    } catch (error) {
      console.error('📱 Error getting delivery stats:', error);
      return {
        totalSent: 0,
        totalDelivered: 0,
        totalFailed: 0,
        queueSize: 0,
        retryQueueSize: 0
      };
    }
  }

  /**
   * Enhanced cleanup with retry queue management
   */
  static cleanup(): void {
    this.notificationListeners.forEach(listener => {
      if (listener && listener.remove) {
        listener.remove();
      }
    });
    this.notificationListeners = [];

    // Clear retry interval
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }

    // Save any pending notifications before cleanup
    if (this.deliveryQueue.length > 0) {
      this.saveNotificationQueue().catch((error: any) => {
        console.error('📱 Error saving queue during cleanup:', error);
      });
    }

    this.isInitialized = false;
    console.log('📱 PushNotificationService: Enhanced cleanup completed');
  }

  /**
   * Test notification (for debugging)
   */
  static async sendTestNotification(): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Notification 📱',
          body: 'Push notifications are working!',
          data: { test: true },
        },
        trigger: null, // Immediate notification
      });
      console.log('📱 Test notification scheduled');
    } catch (error) {
      console.error('📱 Error sending test notification:', error);
    }
  }

  /**
   * Enable or disable webhook support
   */
  static async setWebhook(url: string | null): Promise<void> {
    this.webhookUrl = url;
    console.log('📱 Webhook URL set to:', url);
  }

  /**
   * Retry sending failed notifications
   */
  private static async retryFailedNotifications(): Promise<void> {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }

    // Retry logic for failed notifications
    this.retryInterval = setInterval(async () => {
      try {
        const now = new Date();
        
        // Filter queued notifications that are due for retry
        const notificationsToRetry = this.deliveryQueue.filter(n => n.nextRetryAt && n.nextRetryAt <= now);
        
        for (const notification of notificationsToRetry) {
          const success = await this.sendPushNotification(notification.targetUserId, notification.notificationData);
          
          if (success) {
            // Update delivery status
            await this.updateDeliveryStatus(notification.id, 'sent');
            // Remove from queue
            this.deliveryQueue = this.deliveryQueue.filter(n => n.id !== notification.id);
          } else {
            // Increment retry count and update next retry time
            notification.retryCount++;
            notification.nextRetryAt = new Date(now.getTime() + Math.pow(2, notification.retryCount) * 1000); // Exponential backoff
            await this.updateDeliveryStatus(notification.id, 'pending');
          }
        }

        // If no notifications are left to retry, clear the interval
        if (this.deliveryQueue.length === 0) {
          clearInterval(this.retryInterval);
          this.retryInterval = null;
        }

      } catch (error) {
        console.error('📱 Error in retryFailedNotifications:', error);
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Add notification to delivery queue
   */
  private static async queueNotificationForDelivery(notification: QueuedNotification): Promise<void> {
    this.deliveryQueue.push(notification);
    await this.storeNotificationInQueue(notification);
    console.log('📱 Notification queued for delivery:', notification);
    
    // Start retry mechanism if not already running
    if (!this.retryInterval) {
      this.retryFailedNotifications();
    }
  }

  /**
   * Store notification in queue (AsyncStorage or database)
   */
  private static async storeNotificationInQueue(notification: QueuedNotification): Promise<void> {
    try {
      const existingQueue = await AsyncStorage.getItem(this.NOTIFICATION_QUEUE_KEY);
      const queue = existingQueue ? JSON.parse(existingQueue) : [];
      
      // Add or update notification in queue
      const index = queue.findIndex((n: QueuedNotification) => n.id === notification.id);
      if (index !== -1) {
        queue[index] = notification;
      } else {
        queue.push(notification);
      }
      
      await AsyncStorage.setItem(this.NOTIFICATION_QUEUE_KEY, JSON.stringify(queue));
      console.log('📱 Notification queue updated:', queue);
    } catch (error) {
      console.error('📱 Error storing notification in queue:', error);
    }
  }

  /**
   * Save notification queue to storage
   */
  private static async saveNotificationQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.NOTIFICATION_QUEUE_KEY, JSON.stringify(this.deliveryQueue));
    } catch (error) {
      console.error('📱 Error saving notification queue:', error);
    }
  }

  /**
   * Update delivery status of a notification
   */
  private static async updateDeliveryStatus(notificationId: string, status: 'pending' | 'sent' | 'delivered' | 'failed' | 'expired'): Promise<void> {
    try {
      const existingStatus = await AsyncStorage.getItem(this.DELIVERY_STATUS_KEY);
      const deliveryStatus = existingStatus ? JSON.parse(existingStatus) : {};
      
      // Update status
      deliveryStatus[notificationId] = { status, timestamp: new Date() };
      
      await AsyncStorage.setItem(this.DELIVERY_STATUS_KEY, JSON.stringify(deliveryStatus));
      console.log('📱 Delivery status updated:', notificationId, status);
    } catch (error) {
      console.error('📱 Error updating delivery status:', error);
    }
  }

  /**
   * Webhook delivery for push notifications
   */
  private static async deliverViaWebhook(notification: PushNotificationData): Promise<boolean> {
    if (!this.webhookUrl) {
      console.warn('📱 Webhook URL not set, skipping webhook delivery');
      return false;
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification),
      });

      if (response.ok) {
        console.log('📱 Notification delivered via webhook');
        return true;
      } else {
        console.error('📱 Webhook delivery failed:', response.status, await response.text());
        return false;
      }
    } catch (error) {
      console.error('📱 Error delivering via webhook:', error);
      return false;
    }
  }

  /**
   * Enhanced send push notification with delivery tracking
   */
  static async sendPushNotificationEnhanced(
    targetUserId: string, 
    notificationData: PushNotificationData
  ): Promise<boolean> {
    try {
      // First, send the push notification via Expo
      const expoSuccess = await this.sendPushNotification(targetUserId, notificationData);
      
      if (!expoSuccess) {
        console.log('📱 Expo push notification failed, queuing for retry:', targetUserId, notificationData);
        
        // If Expo notification fails, queue for retry
        const notificationId = `${targetUserId}_${Date.now()}`;
        const queuedNotification: QueuedNotification = {
          id: notificationId,
          notificationData,
          targetUserId,
          createdAt: new Date(),
          retryCount: 0,
          maxRetries: 5,
          nextRetryAt: new Date(Date.now() + 5000), // First retry after 5 seconds
        };
        
        // Add to delivery queue
        await this.queueNotificationForDelivery(queuedNotification);
      }

      return true;
    } catch (error) {
      console.error('📱 Error in sendPushNotificationEnhanced:', error);
      return false;
    }
  }

  /**
   * Start the retry queue processor for failed notifications
   */
  private static startRetryQueueProcessor(): void {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
    }

    this.retryInterval = setInterval(async () => {
      await this.processRetryQueue();
    }, 30000); // Process retry queue every 30 seconds

    console.log('📱 Retry queue processor started');
  }

  /**
   * Process retry queue for failed notifications
   */
  private static async processRetryQueue(): Promise<void> {
    if (this.deliveryQueue.length === 0) return;

    const now = new Date();
    const readyToRetry = this.deliveryQueue.filter(item => 
      item.retryCount < item.maxRetries && 
      (!item.nextRetryAt || item.nextRetryAt <= now)
    );

    if (readyToRetry.length === 0) return;

    console.log(`📱 Processing ${readyToRetry.length} notifications in retry queue`);

    for (const queuedNotification of readyToRetry) {
      try {
        const success = await this.sendPushNotificationWithRetry(
          queuedNotification.targetUserId, 
          queuedNotification.notificationData,
          true // isRetry
        );

        if (success) {
          // Remove from queue on success
          this.deliveryQueue = this.deliveryQueue.filter(item => item.id !== queuedNotification.id);
          await this.saveDeliveryStatus(queuedNotification.id, 'delivered');
        } else {
          // Update retry info
          queuedNotification.retryCount++;
          queuedNotification.nextRetryAt = new Date(now.getTime() + (queuedNotification.retryCount * 60000)); // Exponential backoff
          
          if (queuedNotification.retryCount >= queuedNotification.maxRetries) {
            await this.saveDeliveryStatus(queuedNotification.id, 'failed', 'Max retries exceeded');
            this.deliveryQueue = this.deliveryQueue.filter(item => item.id !== queuedNotification.id);
          }
        }
      } catch (error) {
        console.error('📱 Error processing retry notification:', error);
        queuedNotification.retryCount++;
      }
    }

    await this.saveNotificationQueue();
  }

  /**
   * Enhanced send push notification with retry logic and delivery tracking
   */
  static async sendPushNotificationWithRetry(
    targetUserId: string, 
    notificationData: PushNotificationData,
    isRetry: boolean = false
  ): Promise<boolean> {
    const notificationId = `${targetUserId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      if (!isRetry) {
        await this.saveDeliveryStatus(notificationId, 'pending');
      }

      const success = await this.sendPushNotification(targetUserId, notificationData);

      if (success) {
        await this.saveDeliveryStatus(notificationId, 'sent');
        return true;
      } else {
        // Add to retry queue if not already a retry
        if (!isRetry && notificationData.priority !== 'default') {
          await this.addToRetryQueue(notificationId, targetUserId, notificationData);
        }
        await this.saveDeliveryStatus(notificationId, 'failed', 'Push service returned false');
        return false;
      }
    } catch (error) {
      console.error('📱 Error in sendPushNotificationWithRetry:', error);
      
      if (!isRetry && notificationData.priority !== 'default') {
        await this.addToRetryQueue(notificationId, targetUserId, notificationData);
      }
      await this.saveDeliveryStatus(notificationId, 'failed', (error as Error).message || 'Unknown error');
      return false;
    }
  }

  /**
   * Add notification to retry queue
   */
  private static async addToRetryQueue(
    notificationId: string,
    targetUserId: string, 
    notificationData: PushNotificationData
  ): Promise<void> {
    const maxRetries = this.getMaxRetriesForType(notificationData.type);
    
    const queuedNotification: QueuedNotification = {
      id: notificationId,
      notificationData,
      targetUserId,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries,
      nextRetryAt: new Date(Date.now() + 60000) // First retry in 1 minute
    };

    this.deliveryQueue.push(queuedNotification);
    await this.saveNotificationQueue();
    
    console.log(`📱 Added notification to retry queue: ${notificationData.title}`);
  }

  /**
   * Get max retries based on notification type
   */
  private static getMaxRetriesForType(type: string): number {
    switch (type) {
      case 'session_reminder':
        return 5; // Critical notifications get more retries
      case 'connection_request':
      case 'new_match':
        return 3;
      case 'pattern_learned':
        return 2;
      default:
        return 1;
    }
  }

  /**
   * Save delivery status for tracking
   */
  private static async saveDeliveryStatus(
    notificationId: string, 
    status: NotificationDeliveryStatus['status'],
    error?: string
  ): Promise<void> {
    try {
      const deliveryStatus: NotificationDeliveryStatus = {
        notificationId,
        status,
        timestamp: new Date(),
        error
      };

      const key = `${this.DELIVERY_STATUS_KEY}_${notificationId}`;
      await AsyncStorage.setItem(key, JSON.stringify(deliveryStatus));
      
      // Also store in Supabase if available
      if (isSupabaseConfigured() && supabase) {
        await supabase
          .from('notification_delivery_status')
          .upsert({
            notification_id: notificationId,
            status,
            timestamp: deliveryStatus.timestamp.toISOString(),
            error_message: error
          });
      }
    } catch (err) {
      console.error('📱 Error saving delivery status:', err);
    }
  }

  /**
   * Set webhook URL for real-time notification delivery
   */
  static setWebhookUrl(url: string): void {
    this.webhookUrl = url;
    console.log('📱 Webhook URL configured for real-time delivery');
  }

  /**
   * Send instant notification via webhook for immediate delivery
   */
  private static async sendWebhookNotification(
    targetUserId: string,
    notificationData: PushNotificationData
  ): Promise<boolean> {
    if (!this.webhookUrl) return false;

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getCurrentToken()}`
        },
        body: JSON.stringify({
          targetUserId,
          notification: notificationData,
          timestamp: new Date().toISOString(),
          immediate: true
        })
      });

      if (response.ok) {
        console.log('📱 Webhook notification sent successfully');
        return true;
      } else {
        console.error('📱 Webhook notification failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('📱 Webhook notification error:', error);
      return false;
    }
  }

  /**
   * Enhanced send push notification with multiple delivery channels
   */
  static async sendInstantNotification(
    targetUserId: string,
    notificationData: PushNotificationData
  ): Promise<boolean> {
    console.log(`📱 Sending instant notification: ${notificationData.title}`);
    
    // Track delivery attempts
    const deliveryResults: boolean[] = [];

    // 1. Try webhook first for instant delivery
    if (this.webhookUrl && notificationData.priority === 'high') {
      const webhookSuccess = await this.sendWebhookNotification(targetUserId, notificationData);
      deliveryResults.push(webhookSuccess);
      
      if (webhookSuccess) {
        console.log('📱 Instant delivery via webhook successful');
      }
    }

    // 2. Send via standard push notification
    const pushSuccess = await this.sendPushNotificationWithRetry(targetUserId, notificationData);
    deliveryResults.push(pushSuccess);

    // 3. If both fail and it's critical, try alternative methods
    if (!deliveryResults.some(result => result) && notificationData.priority === 'high') {
      await this.handleCriticalNotificationFallback(targetUserId, notificationData);
    }

    return deliveryResults.some(result => result);
  }

  /**
   * Handle fallback for critical notifications that failed all delivery methods
   */
  private static async handleCriticalNotificationFallback(
    targetUserId: string,
    notificationData: PushNotificationData
  ): Promise<void> {
    console.log('📱 Using fallback delivery for critical notification');
    
    try {
      // Store as high-priority in-app notification that will be shown immediately when user opens app
      const fallbackKey = `critical_notification_${targetUserId}_${Date.now()}`;
      await AsyncStorage.setItem(fallbackKey, JSON.stringify({
        ...notificationData,
        isCritical: true,
        fallbackDelivery: true,
        timestamp: new Date().toISOString()
      }));

      // Also try to store in Supabase for cross-device sync
      if (isSupabaseConfigured() && supabase) {
        await supabase
          .from('critical_notifications')
          .insert({
            user_id: targetUserId,
            notification_data: notificationData,
            created_at: new Date().toISOString(),
            is_fallback: true
          });
      }

      console.log('📱 Critical notification stored for fallback delivery');
    } catch (error) {
      console.error('📱 Failed to store critical notification fallback:', error);
    }
  }

  /**
   * Get pending critical notifications for immediate display
   */
  static async getPendingCriticalNotifications(userId: string): Promise<PushNotificationData[]> {
    try {
      const criticalNotifications: PushNotificationData[] = [];
      
      // Check AsyncStorage for critical notifications
      const keys = await AsyncStorage.getAllKeys();
      const criticalKeys = keys.filter(key => key.startsWith(`critical_notification_${userId}_`));
      
      for (const key of criticalKeys) {
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          criticalNotifications.push(JSON.parse(stored));
          await AsyncStorage.removeItem(key); // Remove after retrieving
        }
      }

      // Check Supabase for critical notifications
      if (isSupabaseConfigured() && supabase) {
        const { data } = await supabase
          .from('critical_notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (data) {
          criticalNotifications.push(...data.map(item => item.notification_data));
          
          // Mark as delivered
          await supabase
            .from('critical_notifications')
            .delete()
            .eq('user_id', userId);
        }
      }

      return criticalNotifications;
    } catch (error) {
      console.error('📱 Error getting critical notifications:', error);
      return [];
    }
  }

  /**
   * Real-time notification broadcasting for immediate delivery
   */
  static async broadcastToAllUserDevices(
    targetUserId: string,
    notificationData: PushNotificationData
  ): Promise<{ success: number; failed: number }> {
    const results = { success: 0, failed: 0 };

    try {
      if (!isSupabaseConfigured() || !supabase) {
        console.log('📱 Supabase not configured, using single device delivery');
        const success = await this.sendInstantNotification(targetUserId, notificationData);
        if (success) results.success++; else results.failed++;
        return results;
      }

      // Get all devices for the user
      const { data: devices, error } = await supabase
        .from('user_push_tokens')
        .select('push_token, platform, device_id')
        .eq('user_id', targetUserId)
        .order('updated_at', { ascending: false });

      if (error || !devices || devices.length === 0) {
        console.log('📱 No devices found for broadcast');
        results.failed++;
        return results;
      }

      console.log(`📱 Broadcasting to ${devices.length} devices`);

      // Send to all devices simultaneously
      const deliveryPromises = devices.map(async (device) => {
        try {
          const success = await this.sendExpoNotification(device.push_token, notificationData);
          return success;
        } catch (error) {
          console.error(`📱 Failed to send to device ${device.device_id}:`, error);
          return false;
        }
      });

      const deliveryResults = await Promise.allSettled(deliveryPromises);
      
      deliveryResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          results.success++;
        } else {
          results.failed++;
        }
      });

      console.log(`📱 Broadcast complete: ${results.success} successful, ${results.failed} failed`);
      
    } catch (error) {
      console.error('📱 Error in broadcast delivery:', error);
      results.failed++;
    }

    return results;
  }
}
