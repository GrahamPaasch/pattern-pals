/**
 * Activity Feed Service - Creates Among Us style social awareness
 * Shows real-time friend activities: pattern learning, connection updates, etc.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { RealTimeSyncService, UserActivity } from './realTimeSync';

export interface FriendActivity extends UserActivity {
  id: string;
  isRead: boolean;
  priority: 'high' | 'medium' | 'low';
}

export class ActivityFeedService {
  private static ACTIVITY_FEED_KEY = 'global_activity_feed';
  private static USER_ACTIVITY_KEY = 'user_activity_feed';
  private static MAX_ACTIVITIES = 100;
  
  private static activityCallbacks: ((activities: FriendActivity[]) => void)[] = [];

  /**
   * Initialize activity feed for a user
   */
  static async initialize(userId: string): Promise<void> {
    try {
      // Subscribe to real-time activity updates
      RealTimeSyncService.onFriendActivity(async (activity) => {
        await this.addActivity(userId, activity);
      });

      console.log('🎯 ActivityFeed: Initialized for user', userId);
    } catch (error) {
      console.error('🎯 ActivityFeed: Initialization error', error);
    }
  }

  /**
   * Add new activity to feed
   */
  static async addActivity(userId: string, activity: UserActivity): Promise<void> {
    try {
      const activityWithId: FriendActivity = {
        ...activity,
        id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        isRead: false,
        priority: this.getActivityPriority(activity.type)
      };

      // Get existing activities
      const activities = await this.getActivities(userId);
      
      // Add new activity to beginning
      const updatedActivities = [activityWithId, ...activities];
      
      // Keep only recent activities
      const trimmedActivities = updatedActivities.slice(0, this.MAX_ACTIVITIES);
      
      // Store updated activities
      const key = `${this.USER_ACTIVITY_KEY}_${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(trimmedActivities));
      
      console.log(`🎯 ActivityFeed: Added activity - ${activity.userName} ${activity.type}`);
      
      // Notify listeners
      this.notifyActivityUpdate(trimmedActivities);
      
    } catch (error) {
      console.error('🎯 ActivityFeed: Error adding activity', error);
    }
  }

  /**
   * Get activities for a user
   */
  static async getActivities(userId: string): Promise<FriendActivity[]> {
    try {
      const key = `${this.USER_ACTIVITY_KEY}_${userId}`;
      const stored = await AsyncStorage.getItem(key);
      
      if (stored) {
        const activities = JSON.parse(stored);
        return activities.map((activity: any) => ({
          ...activity,
          timestamp: new Date(activity.timestamp)
        }));
      }
      
      // If no personal feed, check global feed for demo activities
      return this.getGlobalActivities();
    } catch (error) {
      console.error('🎯 ActivityFeed: Error getting activities', error);
      return [];
    }
  }

  /**
   * Get global activities (for demo/fallback)
   */
  static async getGlobalActivities(): Promise<FriendActivity[]> {
    try {
      const stored = await AsyncStorage.getItem(this.ACTIVITY_FEED_KEY);
      
      if (stored) {
        const activities = JSON.parse(stored);
        return activities.map((activity: any) => ({
          ...activity,
          timestamp: new Date(activity.timestamp)
        }));
      }
      
      // Create some demo activities if none exist
      return this.createDemoActivities();
    } catch (error) {
      console.error('🎯 ActivityFeed: Error getting global activities', error);
      return [];
    }
  }

  /**
   * Create demo activities for testing
   */
  private static async createDemoActivities(): Promise<FriendActivity[]> {
    const demoActivities: FriendActivity[] = [
      {
        id: 'demo_activity_1',
        userId: 'demo_user_1',
        userName: 'Alex Chen',
        type: 'pattern_learned',
        message: 'Alex Chen just mastered "Mills Mess"! 🎯',
        timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        patternName: 'Mills Mess',
        isRead: false,
        priority: 'high'
      },
      {
        id: 'demo_activity_2',
        userId: 'demo_user_2',
        userName: 'Sarah Williams',
        type: 'pattern_learned',
        message: 'Sarah Williams just learned "Burke\'s Barrage"! 🔥',
        timestamp: new Date(Date.now() - 25 * 60 * 1000), // 25 minutes ago
        patternName: 'Burke\'s Barrage',
        isRead: false,
        priority: 'high'
      },
      {
        id: 'demo_activity_3',
        userId: 'demo_user_3',
        userName: 'Mike Johnson',
        type: 'session_completed',
        message: 'Mike Johnson completed a practice session! 💪',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        isRead: false,
        priority: 'medium'
      }
    ];

    await AsyncStorage.setItem(this.ACTIVITY_FEED_KEY, JSON.stringify(demoActivities));
    console.log('🎯 ActivityFeed: Created demo activities');
    
    return demoActivities;
  }

  /**
   * Mark activity as read
   */
  static async markAsRead(userId: string, activityId: string): Promise<void> {
    try {
      const activities = await this.getActivities(userId);
      const updatedActivities = activities.map(activity => 
        activity.id === activityId ? { ...activity, isRead: true } : activity
      );
      
      const key = `${this.USER_ACTIVITY_KEY}_${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(updatedActivities));
      
      this.notifyActivityUpdate(updatedActivities);
    } catch (error) {
      console.error('🎯 ActivityFeed: Error marking as read', error);
    }
  }

  /**
   * Mark all activities as read
   */
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      const activities = await this.getActivities(userId);
      const updatedActivities = activities.map(activity => ({ ...activity, isRead: true }));
      
      const key = `${this.USER_ACTIVITY_KEY}_${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(updatedActivities));
      
      this.notifyActivityUpdate(updatedActivities);
    } catch (error) {
      console.error('🎯 ActivityFeed: Error marking all as read', error);
    }
  }

  /**
   * Get unread activity count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const activities = await this.getActivities(userId);
      return activities.filter(activity => !activity.isRead).length;
    } catch (error) {
      console.error('🎯 ActivityFeed: Error getting unread count', error);
      return 0;
    }
  }

  /**
   * Subscribe to activity updates
   */
  static onActivityUpdate(callback: (activities: FriendActivity[]) => void): void {
    this.activityCallbacks.push(callback);
  }

  /**
   * Remove activity update listener
   */
  static offActivityUpdate(callback: (activities: FriendActivity[]) => void): void {
    const index = this.activityCallbacks.indexOf(callback);
    if (index > -1) {
      this.activityCallbacks.splice(index, 1);
    }
  }

  /**
   * Clear all activities for a user
   */
  static async clearActivities(userId: string): Promise<void> {
    try {
      const key = `${this.USER_ACTIVITY_KEY}_${userId}`;
      await AsyncStorage.removeItem(key);
      
      this.notifyActivityUpdate([]);
    } catch (error) {
      console.error('🎯 ActivityFeed: Error clearing activities', error);
    }
  }

  /**
   * Get activity priority based on type
   */
  private static getActivityPriority(type: UserActivity['type']): 'high' | 'medium' | 'low' {
    switch (type) {
      case 'pattern_learned':
      case 'achievement_unlocked':
        return 'high';
      case 'session_completed':
        return 'medium';
      case 'pattern_added':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Notify activity update listeners
   */
  private static notifyActivityUpdate(activities: FriendActivity[]): void {
    this.activityCallbacks.forEach(callback => callback(activities));
  }
}
