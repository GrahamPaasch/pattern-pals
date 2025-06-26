import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pattern } from '../types';

export class PatternLibraryService {
  private static STORAGE_KEY = 'user_contributed_patterns';

  static async getUserContributedPatterns(): Promise<Pattern[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return [];
    } catch (error) {
      console.error('Error loading user patterns:', error);
      return [];
    }
  }

  static async addUserPattern(pattern: Pattern): Promise<boolean> {
    try {
      const existing = await this.getUserContributedPatterns();
      const updated = [...existing, pattern];
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
      return true;
    } catch (error) {
      console.error('Error saving user pattern:', error);
      return false;
    }
  }

  static async clearUserPatterns(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing user patterns:', error);
      return false;
    }
  }
}
