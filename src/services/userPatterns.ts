import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { PatternStatus, UserPattern } from '../types';
import { SyncService } from './sync';
import { RealTimeSyncService } from './realTimeSync';

export class UserPatternService {
  private static STORAGE_KEY = 'user_patterns';
  private static USE_SUPABASE = true; // Enable Supabase backend (will fallback to local if not configured)

export class UserPatternService {
  private static STORAGE_KEY = 'user_patterns';
  private static USE_SUPABASE = true; // Enable Supabase backend (will fallback to local if not configured)

  /**
   * Check if Supabase is properly configured
   */
  private static isSupabaseConfigured(): boolean {
    return isSupabaseConfigured() === true;
  }

  /**
   * Get all pattern statuses for a user
   */
  static async getUserPatterns(userId: string): Promise<UserPattern[]> {
    try {
      if (this.USE_SUPABASE && this.isSupabaseConfigured() && supabase) {
        console.log('UserPatternService: Using Supabase backend for getUserPatterns');
        // Use Supabase for real backend
        const { data, error } = await supabase
          .from('user_patterns')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Supabase error getting user patterns:', error);
          console.log('UserPatternService: Falling back to local storage due to Supabase error');
          return this.getUserPatternsLocal(userId);
        }

        const patterns = data.map((item: any) => ({
          userId: item.user_id,
          patternId: item.pattern_id,
          status: item.status as PatternStatus,
          updatedAt: new Date(item.created_at)
        }));

        console.log(`UserPatternService: Loaded ${patterns.length} patterns from Supabase for user ${userId}`);
        return patterns;
      } else {
        // Fallback to AsyncStorage for development/testing
        console.log('UserPatternService: Using local storage for patterns (Supabase not configured or disabled)');
        return this.getUserPatternsLocal(userId);
      }
    } catch (error) {
      console.error('Error in getUserPatterns:', error);
      console.log('UserPatternService: Falling back to local storage due to error');
      return this.getUserPatternsLocal(userId);
    }
  }

  /**
   * Get user patterns from local storage (fallback)
   */
  private static async getUserPatternsLocal(userId: string): Promise<UserPattern[]> {
    try {
      const key = `${this.STORAGE_KEY}_${userId}`;
      const storedData = await AsyncStorage.getItem(key);
      
      if (storedData) {
        const patterns = JSON.parse(storedData);
        return patterns.map((item: any) => ({
          userId: item.userId,
          patternId: item.patternId,
          status: item.status as PatternStatus,
          updatedAt: new Date(item.updatedAt || Date.now())
        }));
      }

      return [];
    } catch (error) {
      console.error('Error in getUserPatternsLocal:', error);
      return [];
    }
  }

  /**
   * Set or update a pattern status for a user
   */
  static async setPatternStatus(
    userId: string, 
    patternId: string, 
    status: PatternStatus,
    userName?: string
  ): Promise<boolean> {
    try {
      const key = `${this.STORAGE_KEY}_${userId}`;
      const existingPatterns = await this.getUserPatterns(userId);
      
      // Check if this is a new "known" status (achievement!)
      const existingPattern = existingPatterns.find(p => p.patternId === patternId);
      const isNewLearned = status === 'known' && existingPattern?.status !== 'known';
      
      // Remove existing entry for this pattern
      const filteredPatterns = existingPatterns.filter(p => p.patternId !== patternId);
      
      // Add new entry
      const updatedPatterns = [
        ...filteredPatterns,
        { 
          userId, 
          patternId, 
          status,
          updatedAt: new Date()
        }
      ];

      await AsyncStorage.setItem(key, JSON.stringify(updatedPatterns));

      const queued = updatedPatterns.find(p => p.patternId === patternId);
      if (queued) {
        await SyncService.queueOperation({
          service: 'patterns',
          action: 'set',
          data: queued,
          timestamp: Date.now(),
        });
      }

      // 🚀 REAL-TIME FEATURE: Broadcast pattern achievement to friends!
      if (isNewLearned && userName) {
        await RealTimeSyncService.broadcastPatternLearned(userId, userName, patternId);
      }

      return true;
    } catch (error) {
      console.error('Error in setPatternStatus:', error);
      return false;
    }
  }

  /**
   * Remove a pattern status for a user
   */
  static async removePatternStatus(userId: string, patternId: string): Promise<boolean> {
    try {
      const key = `${this.STORAGE_KEY}_${userId}`;
      const existingPatterns = await this.getUserPatterns(userId);
      
      // Remove the pattern
      const filteredPatterns = existingPatterns.filter(p => p.patternId !== patternId);

      await AsyncStorage.setItem(key, JSON.stringify(filteredPatterns));

      await SyncService.queueOperation({
        service: 'patterns',
        action: 'remove',
        data: { userId, patternId },
        timestamp: Date.now(),
      });
      return true;
    } catch (error) {
      console.error('Error in removePatternStatus:', error);
      return false;
    }
  }

  /**
   * Get patterns by status for a user
   */
  static async getPatternsByStatus(
    userId: string, 
    status: PatternStatus
  ): Promise<string[]> {
    try {
      const userPatterns = await this.getUserPatterns(userId);
      return userPatterns
        .filter(pattern => pattern.status === status)
        .map(pattern => pattern.patternId);
    } catch (error) {
      console.error('Error in getPatternsByStatus:', error);
      return [];
    }
  }

  /**
   * Get pattern statistics for a user
   */
  static async getUserPatternStats(userId: string): Promise<{
    known: number;
    wantToLearn: number;
    wantToAvoid: number;
  }> {
    try {
      const userPatterns = await this.getUserPatterns(userId);
      
      const stats = {
        known: 0,
        wantToLearn: 0,
        wantToAvoid: 0
      };

      userPatterns.forEach(pattern => {
        switch (pattern.status) {
          case 'known':
            stats.known++;
            break;
          case 'want_to_learn':
            stats.wantToLearn++;
            break;
          case 'want_to_avoid':
            stats.wantToAvoid++;
            break;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error in getUserPatternStats:', error);
      return { known: 0, wantToLearn: 0, wantToAvoid: 0 };
    }
  }

  /**
   * Clear all pattern data for a user
   */
  static async clearUserPatterns(userId: string): Promise<boolean> {
    try {
      const key = `${this.STORAGE_KEY}_${userId}`;
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error in clearUserPatterns:', error);
      return false;
    }
  }

  /**
   * Export user pattern data
   */
  static async exportUserPatterns(userId: string): Promise<UserPattern[]> {
    return this.getUserPatterns(userId);
  }
}
