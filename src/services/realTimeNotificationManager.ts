/**
 * Real-Time Notification Manager
 * Orchestrates instant push notification delivery across the app
 * Provides a unified interface for all real-time notification needs
 */

import { RealTimeSyncService } from './realTimeSync';
import { PushNotificationService } from './pushNotificationService';
import { NotificationService } from './notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RealTimeNotificationConfig {
  enableInstantDelivery: boolean;
  enableWebhooks: boolean;
  maxRetries: number;
  retryDelay: number;
  criticalTypes: string[];
}

export interface NotificationMetrics {
  totalSent: number;
  instantDelivered: number;
  retryDelivered: number;
  failed: number;
  averageDeliveryTime: number;
}

export class RealTimeNotificationManager {
  private static instance: RealTimeNotificationManager | null = null;
  private static config: RealTimeNotificationConfig = {
    enableInstantDelivery: true,
    enableWebhooks: true,
    maxRetries: 3,
    retryDelay: 30000,
    criticalTypes: ['session_reminder', 'connection_request', 'urgent_announcement']
  };
  private static metrics: NotificationMetrics = {
    totalSent: 0,
    instantDelivered: 0,
    retryDelivered: 0,
    failed: 0,
    averageDeliveryTime: 0
  };
  private static deliveryTimes: number[] = [];

  /**
   * Get singleton instance
   */
  static getInstance(): RealTimeNotificationManager {
    if (!this.instance) {
      this.instance = new RealTimeNotificationManager();
    }
    return this.instance;
  }

  /**
   * Initialize the real-time notification system
   */
  static async initialize(userId: string, webhookUrl?: string): Promise<void> {
    try {
      console.log('🚀 Initializing Real-Time Notification Manager');

      // Initialize base notification service
      await NotificationService.initialize(userId);

      // Initialize push notification service with enhancements
      const pushToken = await PushNotificationService.initialize(userId);
      
      if (pushToken) {
        console.log('📱 Push notifications initialized successfully');
      }

      // Set webhook URL if provided
      if (webhookUrl && this.config.enableWebhooks) {
        PushNotificationService.setWebhookUrl(webhookUrl);
      }

      // Initialize real-time sync
      await RealTimeSyncService.initialize(userId, 'Current User');

      // Check for any pending critical notifications
      await this.processPendingCriticalNotifications(userId);

      console.log('✅ Real-Time Notification Manager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Real-Time Notification Manager:', error);
    }
  }

  /**
   * Process any critical notifications that were queued while offline
   */
  private static async processPendingCriticalNotifications(userId: string): Promise<void> {
    try {
      const pendingNotifications = await PushNotificationService.getPendingCriticalNotifications(userId);
      
      if (pendingNotifications.length > 0) {
        console.log(`📱 Processing ${pendingNotifications.length} pending critical notifications`);
        
        for (const notification of pendingNotifications) {
          // Show these immediately in the app
          await this.showInAppNotification(notification);
        }
      }
    } catch (error) {
      console.error('Error processing pending critical notifications:', error);
    }
  }

  /**
   * Show immediate in-app notification
   */
  private static async showInAppNotification(notification: any): Promise<void> {
    // This would integrate with your in-app notification system
    console.log('📱 Showing in-app notification:', notification.title);
    
    // You could emit an event here that your UI components listen to
    // or update a global notification state
  }

  /**
   * Send real-time notification with intelligent routing
   */
  static async sendRealTimeNotification(
    targetUserId: string,
    type: string,
    title: string,
    body: string,
    data?: any,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal'
  ): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      this.metrics.totalSent++;

      const notificationData = {
        type: type as any,
        userId: targetUserId,
        title,
        body,
        data: data || {},
        priority: priority === 'critical' ? 'high' as const : priority as any,
        sound: priority === 'critical' ? 'urgent' : 'default',
        deliveryTracking: true
      };

      let success = false;

      // Route based on priority and configuration
      if (priority === 'critical' || this.config.criticalTypes.includes(type)) {
        // Use broadcast to all devices for critical notifications
        const result = await PushNotificationService.broadcastToAllUserDevices(targetUserId, notificationData);
        success = result.success > 0;
      } else if (this.config.enableInstantDelivery && (priority === 'high' || priority === 'normal')) {
        // Use instant delivery for important notifications
        success = await PushNotificationService.sendInstantNotification(targetUserId, notificationData);
      } else {
        // Standard delivery for low priority
        success = await PushNotificationService.sendPushNotification(targetUserId, notificationData);
      }

      // Track delivery metrics
      const deliveryTime = Date.now() - startTime;
      this.deliveryTimes.push(deliveryTime);
      
      if (success) {
        this.metrics.instantDelivered++;
        console.log(`✅ Real-time notification delivered in ${deliveryTime}ms`);
      } else {
        this.metrics.failed++;
        console.log(`❌ Real-time notification failed after ${deliveryTime}ms`);
      }

      // Update average delivery time
      this.updateAverageDeliveryTime();

      return success;
    } catch (error) {
      console.error('Error sending real-time notification:', error);
      this.metrics.failed++;
      return false;
    }
  }

  /**
   * Send connection request with instant delivery
   */
  static async sendInstantConnectionRequest(
    fromUserId: string,
    fromUserName: string,
    toUserId: string,
    toUserName: string
  ): Promise<boolean> {
    try {
      await RealTimeSyncService.broadcastConnectionRequestInstant(
        fromUserId,
        fromUserName,
        toUserId,
        toUserName
      );
      return true;
    } catch (error) {
      console.error('Error sending instant connection request:', error);
      return false;
    }
  }

  /**
   * Send pattern learning achievement with instant delivery
   */
  static async sendInstantPatternAchievement(
    userId: string,
    userName: string,
    patternName: string
  ): Promise<boolean> {
    try {
      await RealTimeSyncService.broadcastPatternLearnedInstant(userId, userName, patternName);
      return true;
    } catch (error) {
      console.error('Error sending instant pattern achievement:', error);
      return false;
    }
  }

  /**
   * Send session reminder with time-sensitive delivery
   */
  static async sendSessionReminder(
    userId: string,
    partnerName: string,
    sessionTime: Date,
    minutesUntil: number
  ): Promise<boolean> {
    try {
      await RealTimeSyncService.sendInstantSessionReminder(
        userId,
        partnerName,
        sessionTime,
        minutesUntil
      );
      return true;
    } catch (error) {
      console.error('Error sending session reminder:', error);
      return false;
    }
  }

  /**
   * Send urgent announcement to multiple users
   */
  static async sendUrgentAnnouncement(
    title: string,
    message: string,
    targetUserIds?: string[]
  ): Promise<{ success: number; failed: number }> {
    try {
      return await RealTimeSyncService.broadcastUrgentAnnouncement(title, message, targetUserIds);
    } catch (error) {
      console.error('Error sending urgent announcement:', error);
      return { success: 0, failed: 1 };
    }
  }

  /**
   * Update average delivery time metric
   */
  private static updateAverageDeliveryTime(): void {
    if (this.deliveryTimes.length > 0) {
      const sum = this.deliveryTimes.reduce((a, b) => a + b, 0);
      this.metrics.averageDeliveryTime = sum / this.deliveryTimes.length;
      
      // Keep only last 100 delivery times for rolling average
      if (this.deliveryTimes.length > 100) {
        this.deliveryTimes = this.deliveryTimes.slice(-100);
      }
    }
  }

  /**
   * Get real-time notification metrics
   */
  static getMetrics(): NotificationMetrics {
    return { ...this.metrics };
  }

  /**
   * Get delivery statistics from push service
   */
  static async getDetailedStats(): Promise<any> {
    try {
      const pushStats = await PushNotificationService.getDeliveryStats();
      
      return {
        manager: this.metrics,
        pushService: pushStats,
        configuration: this.config
      };
    } catch (error) {
      console.error('Error getting detailed stats:', error);
      return null;
    }
  }

  /**
   * Update configuration
   */
  static updateConfig(newConfig: Partial<RealTimeNotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('📱 Real-time notification config updated:', this.config);
  }

  /**
   * Test real-time notification delivery
   */
  static async testDelivery(userId: string): Promise<boolean> {
    console.log('🧪 Testing real-time notification delivery');
    
    return this.sendRealTimeNotification(
      userId,
      'test_notification',
      'Test Notification 🧪',
      'Real-time push notifications are working perfectly!',
      { test: true, timestamp: new Date().toISOString() },
      'high'
    );
  }

  /**
   * Cleanup all real-time notification services
   */
  static cleanup(): void {
    try {
      RealTimeSyncService.cleanup();
      PushNotificationService.cleanup();
      
      // Reset metrics
      this.metrics = {
        totalSent: 0,
        instantDelivered: 0,
        retryDelivered: 0,
        failed: 0,
        averageDeliveryTime: 0
      };
      this.deliveryTimes = [];
      
      console.log('🧹 Real-Time Notification Manager cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

export default RealTimeNotificationManager;
