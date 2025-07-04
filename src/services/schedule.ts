import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncService } from './sync';

export interface ScheduledSession {
  id: string;
  hostId: string;
  partnerId?: string;
  partnerName?: string;
  scheduledTime: Date;
  duration: number; // minutes
  location?: string;
  plannedPatterns: string[];
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ScheduleService {
  private static STORAGE_KEY = 'scheduled_sessions';

  /**
   * Get only user sessions (excluding demo sessions)
   */
  private static async getUserSessions(userId: string): Promise<ScheduledSession[]> {
    try {
      const key = `${this.STORAGE_KEY}_${userId}`;
      const storedData = await AsyncStorage.getItem(key);
      
      if (storedData) {
        const userSessions = JSON.parse(storedData);
        return userSessions.map((item: any) => ({
          ...item,
          scheduledTime: new Date(item.scheduledTime),
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt)
        }));
      }

      return [];
    } catch (error) {
      console.error('Error in getUserSessions:', error);
      return [];
    }
  }

  /**
   * Get all sessions for a user
   */
  static async getAllSessions(userId: string): Promise<ScheduledSession[]> {
    try {
      const key = `${this.STORAGE_KEY}_${userId}`;
      console.log('getAllSessions - loading from key:', key);
      const storedData = await AsyncStorage.getItem(key);
      console.log('getAllSessions - raw stored data:', storedData);
      
      // Get demo sessions first
      const demoSessions = this.getDemoSessions(userId);
      
      if (storedData) {
        const userSessions = JSON.parse(storedData);
        console.log('getAllSessions - parsed user sessions:', userSessions.length, 'sessions found');
        const mappedUserSessions = userSessions.map((item: any) => ({
          ...item,
          scheduledTime: new Date(item.scheduledTime),
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt)
        }));
        
        // Combine demo sessions with user sessions
        const allSessions = [...demoSessions, ...mappedUserSessions];
        console.log('getAllSessions - returning', allSessions.length, 'total sessions (demo + user)');
        return allSessions;
      }

      // Return demo sessions if no user data
      console.log('getAllSessions - no stored data, returning demo sessions');
      return demoSessions;
    } catch (error) {
      console.error('Error in getAllSessions:', error);
      return this.getDemoSessions(userId);
    }
  }

  /**
   * Get upcoming sessions (future sessions only)
   */
  static async getUpcomingSessions(userId: string): Promise<ScheduledSession[]> {
    const allSessions = await this.getAllSessions(userId);
    const now = new Date();
    
    return allSessions
      .filter(session => session.scheduledTime > now && session.status !== 'cancelled')
      .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
  }

  /**
   * Get past sessions
   */
  static async getPastSessions(userId: string): Promise<ScheduledSession[]> {
    const allSessions = await this.getAllSessions(userId);
    const now = new Date();
    
    return allSessions
      .filter(session => session.scheduledTime <= now || session.status === 'completed')
      .sort((a, b) => b.scheduledTime.getTime() - a.scheduledTime.getTime());
  }

  /**
   * Add a new session
   */
  static async addSession(
    userId: string,
    session: Omit<ScheduledSession, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<boolean> {
    try {
      console.log('ScheduleService.addSession called with:', { userId, session });
      
      // Get only user sessions (not demo sessions) to avoid conflicts
      const userSessions = await this.getUserSessions(userId);
      console.log('Existing user sessions before add:', userSessions.length);
      
      const newSession: ScheduledSession = {
        ...session,
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      console.log('New session to add:', newSession);

      const updatedSessions = [...userSessions, newSession];
      console.log('Updated user sessions array:', updatedSessions.length);
      
      const key = `${this.STORAGE_KEY}_${userId}`;
      console.log('Storage key:', key);
      await AsyncStorage.setItem(key, JSON.stringify(updatedSessions));
      console.log('Successfully saved to AsyncStorage');

      await SyncService.queueOperation({
        service: 'sessions',
        action: 'add',
        data: newSession,
        timestamp: Date.now(),
      });

      return true;
    } catch (error) {
      console.error('Error in addSession:', error);
      return false;
    }
  }

  /**
   * Update an existing session
   */
  static async updateSession(
    userId: string,
    sessionId: string,
    updates: Partial<Omit<ScheduledSession, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<boolean> {
    try {
      // Only update user sessions (not demo sessions)
      const userSessions = await this.getUserSessions(userId);
      const updatedSessions = userSessions.map(session =>
        session.id === sessionId
          ? { ...session, ...updates, updatedAt: new Date() }
          : session
      );

      const key = `${this.STORAGE_KEY}_${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(updatedSessions));

      const updatedSession = updatedSessions.find(s => s.id === sessionId);
      if (updatedSession) {
        await SyncService.queueOperation({
          service: 'sessions',
          action: 'update',
          data: updatedSession,
          timestamp: Date.now(),
        });
      }

      return true;
    } catch (error) {
      console.error('Error in updateSession:', error);
      return false;
    }
  }

  /**
   * Cancel a session
   */
  static async cancelSession(userId: string, sessionId: string): Promise<boolean> {
    return this.updateSession(userId, sessionId, { status: 'cancelled' });
  }

  /**
   * Delete a session
   */
  static async deleteSession(userId: string, sessionId: string): Promise<boolean> {
    try {
      // Only delete user sessions (not demo sessions)
      const userSessions = await this.getUserSessions(userId);
      const filteredSessions = userSessions.filter(session => session.id !== sessionId);

      const key = `${this.STORAGE_KEY}_${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(filteredSessions));

      await SyncService.queueOperation({
        service: 'sessions',
        action: 'delete',
        data: { id: sessionId },
        timestamp: Date.now(),
      });

      return true;
    } catch (error) {
      console.error('Error in deleteSession:', error);
      return false;
    }
  }

  /**
   * Get sessions for a specific date
   */
  static async getSessionsForDate(userId: string, date: Date): Promise<ScheduledSession[]> {
    const allSessions = await this.getAllSessions(userId);
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    return allSessions.filter(session => {
      const sessionDate = new Date(
        session.scheduledTime.getFullYear(),
        session.scheduledTime.getMonth(),
        session.scheduledTime.getDate()
      );
      return sessionDate.getTime() === targetDate.getTime();
    });
  }

  /**
   * Get session statistics for a user
   */
  static async getSessionStats(userId: string): Promise<{
    total: number;
    upcoming: number;
    completed: number;
    cancelled: number;
  }> {
    try {
      const allSessions = await this.getAllSessions(userId);
      const now = new Date();

      const stats = {
        total: allSessions.length,
        upcoming: allSessions.filter(s => s.scheduledTime > now && s.status !== 'cancelled').length,
        completed: allSessions.filter(s => s.status === 'completed').length,
        cancelled: allSessions.filter(s => s.status === 'cancelled').length,
      };

      return stats;
    } catch (error) {
      console.error('Error in getSessionStats:', error);
      return { total: 0, upcoming: 0, completed: 0, cancelled: 0 };
    }
  }

  /**
   * Clear all sessions for a user
   */
  static async clearAllSessions(userId: string): Promise<boolean> {
    try {
      const key = `${this.STORAGE_KEY}_${userId}`;
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error in clearAllSessions:', error);
      return false;
    }
  }

  /**
   * Clear sessions with problematic IDs (for fixing duplicate ID issues)
   */
  static async clearProblematicSessions(userId: string): Promise<boolean> {
    try {
      // Get current user sessions
      const userSessions = await this.getUserSessions(userId);
      
      // Filter out sessions with old simple numeric IDs that might conflict with demo sessions
      const cleanedSessions = userSessions.filter(session => 
        !['1', '2', '3'].includes(session.id) && 
        !session.id.startsWith('demo_')
      );
      
      const key = `${this.STORAGE_KEY}_${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(cleanedSessions));
      
      console.log(`Cleared ${userSessions.length - cleanedSessions.length} problematic sessions`);
      return true;
    } catch (error) {
      console.error('Error in clearProblematicSessions:', error);
      return false;
    }
  }

  /**
   * Generate demo sessions for testing
   */
  private static getDemoSessions(userId: string): ScheduledSession[] {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 7);

    return [
      {
        id: 'demo_1',
        hostId: userId,
        partnerId: 'partner1',
        partnerName: 'Alex Chen',
        scheduledTime: new Date(tomorrow.setHours(18, 30, 0, 0)),
        duration: 90,
        location: 'Central Park - Great Lawn',
        plannedPatterns: ['6 Count', 'Walking Pass', '645'],
        status: 'scheduled',
        notes: 'Bring extra clubs',
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      },
      {
        id: 'demo_2',
        hostId: userId,
        partnerId: 'partner2',
        partnerName: 'Sarah Johnson',
        scheduledTime: new Date(nextWeek.setHours(19, 0, 0, 0)),
        duration: 60,
        location: 'Washington Square Park',
        plannedPatterns: ['Custom Double Spin', 'Chocolate Bar'],
        status: 'scheduled',
        createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      },
      {
        id: 'demo_3',
        hostId: userId,
        scheduledTime: new Date(lastWeek.setHours(17, 0, 0, 0)),
        duration: 120,
        location: 'Brooklyn Bridge Park',
        plannedPatterns: ['6 Count', 'Walking Pass'],
        status: 'completed',
        notes: 'Great session! Made good progress on walking passes.',
        createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      },
    ];
  }
}
