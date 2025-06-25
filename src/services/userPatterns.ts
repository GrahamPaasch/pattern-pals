import AsyncStorage from '@react-native-async-storage/async-storage';
import { PatternStatus, UserPattern } from '../types';

export class UserPatternService {
  private static STORAGE_KEY = 'user_patterns';

  /**
   * Get all pattern statuses for a user
   */
  static async getUserPatterns(userId: string): Promise<UserPattern[]> {
    try {
      // For demo, get from AsyncStorage
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
      console.error('Error in getUserPatterns:', error);
      return [];
    }
  }

  /**
   * Set or update a pattern status for a user
   */
  static async setPatternStatus(
    userId: string, 
    patternId: string, 
    status: PatternStatus
  ): Promise<boolean> {
    try {
      const key = `${this.STORAGE_KEY}_${userId}`;
      const existingPatterns = await this.getUserPatterns(userId);
      
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
