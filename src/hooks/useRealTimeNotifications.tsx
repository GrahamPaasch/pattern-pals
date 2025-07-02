/**
 * Enhanced Real-Time Notifications Hook
 * Provides comprehensive real-time push notification capabilities
 * Integrates instant delivery, retry logic, and delivery tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from './useAuth';
import RealTimeNotificationManager from '../services/realTimeNotificationManager';
import { PushNotificationService } from '../services/pushNotificationService';

export interface RealTimeNotificationHookReturn {
  // Connection status
  isConnected: boolean;
  isPushEnabled: boolean;
  
  // Metrics
  deliveryStats: any;
  metrics: any;
  
  // Actions
  sendInstantNotification: (
    targetUserId: string,
    type: string,
    title: string,
    body: string,
    data?: any,
    priority?: 'low' | 'normal' | 'high' | 'critical'
  ) => Promise<boolean>;
  
  sendConnectionRequest: (
    targetUserId: string,
    targetUserName: string
  ) => Promise<boolean>;
  
  sendPatternAchievement: (
    patternName: string
  ) => Promise<boolean>;
  
  sendSessionReminder: (
    partnerName: string,
    sessionTime: Date,
    minutesUntil: number
  ) => Promise<boolean>;
  
  sendUrgentAnnouncement: (
    title: string,
    message: string,
    targetUserIds?: string[]
  ) => Promise<{ success: number; failed: number }>;
  
  testDelivery: () => Promise<boolean>;
  refreshStats: () => Promise<void>;
  
  // Configuration
  updateConfig: (config: any) => void;
}

export const useRealTimeNotifications = (): RealTimeNotificationHookReturn => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [deliveryStats, setDeliveryStats] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const appState = useRef(AppState.currentState);

  // Initialize real-time notifications when user is available
  useEffect(() => {
    if (user?.id) {
      initializeRealTimeNotifications();
    }
    
    return () => {
      // Cleanup on unmount
      RealTimeNotificationManager.cleanup();
    };
  }, [user?.id]);

  // Handle app state changes for background/foreground transitions
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground
        console.log('📱 App foregrounded - checking for pending notifications');
        if (user?.id) {
          checkPendingNotifications();
        }
      }
      
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [user?.id]);

  const initializeRealTimeNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      console.log('🚀 Initializing real-time notifications for user:', user.name);
      
      // Initialize with optional webhook URL (you can configure this)
      const webhookUrl = process.env.EXPO_PUBLIC_NOTIFICATION_WEBHOOK_URL;
      
      await RealTimeNotificationManager.initialize(user.id, webhookUrl);
      
      setIsConnected(true);
      setIsPushEnabled(true);
      
      // Load initial stats
      await refreshStats();
      
      console.log('✅ Real-time notifications initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize real-time notifications:', error);
      setIsConnected(false);
    }
  }, [user?.id, user?.name]);

  const checkPendingNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Check for critical notifications that were queued while app was backgrounded
      const criticalNotifications = await PushNotificationService.getPendingCriticalNotifications(user.id);
      
      if (criticalNotifications.length > 0) {
        console.log(`📱 Found ${criticalNotifications.length} pending critical notifications`);
        
        // Show these in-app immediately
        criticalNotifications.forEach(notification => {
          console.log('📱 Critical notification:', notification.title);
          // You could emit events here or update global state
        });
      }
    } catch (error) {
      console.error('Error checking pending notifications:', error);
    }
  }, [user?.id]);

  const sendInstantNotification = useCallback(async (
    targetUserId: string,
    type: string,
    title: string,
    body: string,
    data?: any,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal'
  ): Promise<boolean> => {
    try {
      const success = await RealTimeNotificationManager.sendRealTimeNotification(
        targetUserId,
        type,
        title,
        body,
        data,
        priority
      );
      
      // Refresh stats after sending
      await refreshStats();
      
      return success;
    } catch (error) {
      console.error('Error sending instant notification:', error);
      return false;
    }
  }, []);

  const sendConnectionRequest = useCallback(async (
    targetUserId: string,
    targetUserName: string
  ): Promise<boolean> => {
    if (!user?.id || !user?.name) return false;

    try {
      const success = await RealTimeNotificationManager.sendInstantConnectionRequest(
        user.id,
        user.name,
        targetUserId,
        targetUserName
      );
      
      await refreshStats();
      return success;
    } catch (error) {
      console.error('Error sending connection request:', error);
      return false;
    }
  }, [user?.id, user?.name]);

  const sendPatternAchievement = useCallback(async (
    patternName: string
  ): Promise<boolean> => {
    if (!user?.id || !user?.name) return false;

    try {
      const success = await RealTimeNotificationManager.sendInstantPatternAchievement(
        user.id,
        user.name,
        patternName
      );
      
      await refreshStats();
      return success;
    } catch (error) {
      console.error('Error sending pattern achievement:', error);
      return false;
    }
  }, [user?.id, user?.name]);

  const sendSessionReminder = useCallback(async (
    partnerName: string,
    sessionTime: Date,
    minutesUntil: number
  ): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const success = await RealTimeNotificationManager.sendSessionReminder(
        user.id,
        partnerName,
        sessionTime,
        minutesUntil
      );
      
      await refreshStats();
      return success;
    } catch (error) {
      console.error('Error sending session reminder:', error);
      return false;
    }
  }, [user?.id]);

  const sendUrgentAnnouncement = useCallback(async (
    title: string,
    message: string,
    targetUserIds?: string[]
  ): Promise<{ success: number; failed: number }> => {
    try {
      const result = await RealTimeNotificationManager.sendUrgentAnnouncement(
        title,
        message,
        targetUserIds
      );
      
      await refreshStats();
      return result;
    } catch (error) {
      console.error('Error sending urgent announcement:', error);
      return { success: 0, failed: 1 };
    }
  }, []);

  const testDelivery = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const success = await RealTimeNotificationManager.testDelivery(user.id);
      await refreshStats();
      return success;
    } catch (error) {
      console.error('Error testing delivery:', error);
      return false;
    }
  }, [user?.id]);

  const refreshStats = useCallback(async () => {
    try {
      const [managerMetrics, detailedStats] = await Promise.all([
        RealTimeNotificationManager.getMetrics(),
        RealTimeNotificationManager.getDetailedStats()
      ]);
      
      setMetrics(managerMetrics);
      setDeliveryStats(detailedStats);
    } catch (error) {
      console.error('Error refreshing stats:', error);
    }
  }, []);

  const updateConfig = useCallback((config: any) => {
    RealTimeNotificationManager.updateConfig(config);
  }, []);

  return {
    isConnected,
    isPushEnabled,
    deliveryStats,
    metrics,
    sendInstantNotification,
    sendConnectionRequest,
    sendPatternAchievement,
    sendSessionReminder,
    sendUrgentAnnouncement,
    testDelivery,
    refreshStats,
    updateConfig
  };
};

export default useRealTimeNotifications;
