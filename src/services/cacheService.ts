/**
 * Caching service for improved performance and offline support
 * Implements intelligent caching with TTL and invalidation strategies
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  key: string;
}

export interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  compression: boolean;
}

class CacheService {
  private static config: CacheConfig = {
    defaultTTL: 5 * 60 * 1000, // 5 minutes default
    maxSize: 100, // Maximum number of cached items
    compression: false // Disable compression for simplicity
  };

  private static readonly CACHE_PREFIX = 'cache_';
  private static readonly CACHE_INDEX_KEY = 'cache_index';

  /**
   * Set cache item with automatic expiration
   */
  static async set<T>(
    key: string,
    data: T,
    ttl: number = this.config.defaultTTL
  ): Promise<void> {
    try {
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        key
      };

      const cacheKey = this.getCacheKey(key);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheItem));
      
      // Update cache index
      await this.updateCacheIndex(key);
      
      // Clean up old entries if needed
      await this.cleanupIfNeeded();
    } catch (error) {
      console.error('CacheService: Error setting cache item', error);
    }
  }

  /**
   * Get cache item with automatic expiration check
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = this.getCacheKey(key);
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (!cached) {
        return null;
      }

      const cacheItem: CacheItem<T> = JSON.parse(cached);
      
      // Check if expired
      if (this.isExpired(cacheItem)) {
        await this.remove(key);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.error('CacheService: Error getting cache item', error);
      return null;
    }
  }

  /**
   * Get cache item with fallback function
   */
  static async getOrFetch<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const freshData = await fetchFunction();
    
    // Cache the fresh data
    await this.set(key, freshData, ttl);
    
    return freshData;
  }

  /**
   * Remove specific cache item
   */
  static async remove(key: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(key);
      await AsyncStorage.removeItem(cacheKey);
      await this.removeFromCacheIndex(key);
    } catch (error) {
      console.error('CacheService: Error removing cache item', error);
    }
  }

  /**
   * Clear all cache
   */
  static async clear(): Promise<void> {
    try {
      const index = await this.getCacheIndex();
      const promises = index.map(key => AsyncStorage.removeItem(this.getCacheKey(key)));
      await Promise.all(promises);
      await AsyncStorage.removeItem(this.CACHE_INDEX_KEY);
    } catch (error) {
      console.error('CacheService: Error clearing cache', error);
    }
  }

  /**
   * Invalidate cache by pattern
   */
  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const index = await this.getCacheIndex();
      const keysToRemove = index.filter(key => key.includes(pattern));
      
      const promises = keysToRemove.map(key => this.remove(key));
      await Promise.all(promises);
    } catch (error) {
      console.error('CacheService: Error invalidating cache pattern', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<{
    totalItems: number;
    expiredItems: number;
    totalSize: number;
    oldestItem?: Date;
    newestItem?: Date;
  }> {
    try {
      const index = await this.getCacheIndex();
      let totalSize = 0;
      let expiredItems = 0;
      let oldestTimestamp = Date.now();
      let newestTimestamp = 0;

      for (const key of index) {
        const cacheKey = this.getCacheKey(key);
        const cached = await AsyncStorage.getItem(cacheKey);
        
        if (cached) {
          const cacheItem: CacheItem<any> = JSON.parse(cached);
          totalSize += cached.length;
          
          if (this.isExpired(cacheItem)) {
            expiredItems++;
          }
          
          if (cacheItem.timestamp < oldestTimestamp) {
            oldestTimestamp = cacheItem.timestamp;
          }
          
          if (cacheItem.timestamp > newestTimestamp) {
            newestTimestamp = cacheItem.timestamp;
          }
        }
      }

      return {
        totalItems: index.length,
        expiredItems,
        totalSize,
        oldestItem: index.length > 0 ? new Date(oldestTimestamp) : undefined,
        newestItem: index.length > 0 ? new Date(newestTimestamp) : undefined
      };
    } catch (error) {
      console.error('CacheService: Error getting cache stats', error);
      return {
        totalItems: 0,
        expiredItems: 0,
        totalSize: 0
      };
    }
  }

  /**
   * Preload commonly used data
   */
  static async preloadCommonData(dataLoaders: Record<string, () => Promise<any>>): Promise<void> {
    try {
      const promises = Object.entries(dataLoaders).map(async ([key, loader]) => {
        const cached = await this.get(key);
        if (cached === null) {
          const data = await loader();
          await this.set(key, data);
        }
      });

      await Promise.all(promises);
    } catch (error) {
      console.error('CacheService: Error preloading common data', error);
    }
  }

  // Private helper methods

  private static getCacheKey(key: string): string {
    return `${this.CACHE_PREFIX}${key}`;
  }

  private static isExpired(cacheItem: CacheItem<any>): boolean {
    return Date.now() - cacheItem.timestamp > cacheItem.ttl;
  }

  private static async getCacheIndex(): Promise<string[]> {
    try {
      const index = await AsyncStorage.getItem(this.CACHE_INDEX_KEY);
      return index ? JSON.parse(index) : [];
    } catch (error) {
      console.error('CacheService: Error getting cache index', error);
      return [];
    }
  }

  private static async updateCacheIndex(key: string): Promise<void> {
    try {
      const index = await this.getCacheIndex();
      if (!index.includes(key)) {
        index.push(key);
        await AsyncStorage.setItem(this.CACHE_INDEX_KEY, JSON.stringify(index));
      }
    } catch (error) {
      console.error('CacheService: Error updating cache index', error);
    }
  }

  private static async removeFromCacheIndex(key: string): Promise<void> {
    try {
      const index = await this.getCacheIndex();
      const newIndex = index.filter(k => k !== key);
      await AsyncStorage.setItem(this.CACHE_INDEX_KEY, JSON.stringify(newIndex));
    } catch (error) {
      console.error('CacheService: Error removing from cache index', error);
    }
  }

  private static async cleanupIfNeeded(): Promise<void> {
    try {
      const index = await this.getCacheIndex();
      
      if (index.length <= this.config.maxSize) {
        return;
      }

      // Get all cache items with timestamps
      const cacheItems: Array<{ key: string; timestamp: number }> = [];
      
      for (const key of index) {
        const cacheKey = this.getCacheKey(key);
        const cached = await AsyncStorage.getItem(cacheKey);
        
        if (cached) {
          const cacheItem: CacheItem<any> = JSON.parse(cached);
          cacheItems.push({ key, timestamp: cacheItem.timestamp });
        }
      }

      // Sort by timestamp (oldest first)
      cacheItems.sort((a, b) => a.timestamp - b.timestamp);

      // Remove oldest items
      const itemsToRemove = cacheItems.slice(0, cacheItems.length - this.config.maxSize);
      const promises = itemsToRemove.map(item => this.remove(item.key));
      await Promise.all(promises);
    } catch (error) {
      console.error('CacheService: Error during cleanup', error);
    }
  }
}

export { CacheService };

// Cache key constants for consistency
export const CacheKeys = {
  PATTERNS: 'patterns',
  USER_PATTERNS: (userId: string) => `user_patterns_${userId}`,
  MATCHES: (userId: string) => `matches_${userId}`,
  NOTIFICATIONS: (userId: string) => `notifications_${userId}`,
  USER_PROFILE: (userId: string) => `user_profile_${userId}`,
  CONNECTION_REQUESTS: (userId: string) => `connection_requests_${userId}`,
  CONNECTIONS: (userId: string) => `connections_${userId}`,
  SESSIONS: (userId: string) => `sessions_${userId}`,
} as const;
