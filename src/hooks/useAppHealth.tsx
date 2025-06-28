/**
 * App health monitoring hook
 * Provides real-time app health status and diagnostics
 */

import { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { 
  PerformanceService, 
  ErrorService, 
  CacheService, 
  ConfigService 
} from '../services';
import { SyncService } from '../services/sync';
import { supabase } from '../services/supabase';

export interface AppHealthStatus {
  overall: 'healthy' | 'warning' | 'critical';
  performance: {
    averageResponseTime: number;
    slowOperationsCount: number;
    isPerformanceOptimal: boolean;
  };
  errors: {
    recentErrorsCount: number;
    hasCriticalErrors: boolean;
    lastErrorTime?: Date;
  };
  cache: {
    hitRate: number;
    totalSize: number;
    expiredItemsCount: number;
  };
  connectivity: {
    isOnline: boolean;
    lastSyncTime?: Date;
  };
  memory: {
    warningThreshold: boolean;
    estimatedUsage: number;
  };
}

export interface HealthMetrics {
  uptime: number;
  screenChanges: number;
  userInteractions: number;
  backgroundTime: number;
}

async function checkConnectivity(): Promise<boolean> {
  try {
    return await SyncService.isOnline();
  } catch {
    return false;
  }
}

async function getLastSyncTime(): Promise<Date | undefined> {
  try {
    // Check for a sync timestamp in storage or from the sync service
    if (!supabase) return undefined;
    
    const { data } = await supabase
      .from('users')
      .select('updated_at')
      .limit(1)
      .order('updated_at', { ascending: false });
    
    return data?.[0]?.updated_at ? new Date(data[0].updated_at) : undefined;
  } catch {
    return undefined;
  }
}

export function useAppHealth() {
  const [healthStatus, setHealthStatus] = useState<AppHealthStatus | null>(null);
  const [metrics, setMetrics] = useState<HealthMetrics>({
    uptime: 0,
    screenChanges: 0,
    userInteractions: 0,
    backgroundTime: 0,
  });
  
  const startTime = useRef(Date.now());
  const lastAppState = useRef<AppStateStatus>('active');
  const backgroundStartTime = useRef<number | null>(null);
  const updateInterval = useRef<NodeJS.Timeout | null>(null);

  /**
   * Calculate overall health status
   */
  const calculateOverallHealth = (status: Omit<AppHealthStatus, 'overall'>): AppHealthStatus['overall'] => {
    const issues: string[] = [];

    // Performance issues
    if (!status.performance.isPerformanceOptimal) {
      issues.push('performance');
    }

    // Error issues
    if (status.errors.hasCriticalErrors) {
      return 'critical';
    }

    if (status.errors.recentErrorsCount > 5) {
      issues.push('errors');
    }

    // Memory issues
    if (status.memory.warningThreshold) {
      issues.push('memory');
    }

    // Cache issues
    if (status.cache.expiredItemsCount > 10) {
      issues.push('cache');
    }

    if (issues.length === 0) return 'healthy';
    if (issues.length <= 2) return 'warning';
    return 'critical';
  };

  /**
   * Update health status
   */
  const updateHealthStatus = async () => {
    try {
      // Get performance stats
      const perfStats = PerformanceService.getStats();
      
      // Get error stats
      const recentErrors = ErrorService.getRecentErrors(10);
      const hasCriticalErrors = ErrorService.hasCriticalErrors();
      
      // Get cache stats
      const cacheStats = await CacheService.getStats();
      
      // Calculate cache hit rate (simplified)
      const cacheHitRate = cacheStats.totalItems > 0 ? 
        Math.max(0, (cacheStats.totalItems - cacheStats.expiredItems) / cacheStats.totalItems) : 1;

      // Estimate memory usage (simplified)
      const estimatedMemoryUsage = cacheStats.totalSize + (perfStats.totalMetrics * 1024); // rough estimate
      const memoryWarningThreshold = estimatedMemoryUsage > 5 * 1024 * 1024; // 5MB threshold

      const status: Omit<AppHealthStatus, 'overall'> = {
        performance: {
          averageResponseTime: perfStats.averageDuration,
          slowOperationsCount: perfStats.slowestOperations.length,
          isPerformanceOptimal: perfStats.averageDuration < ConfigService.getValue('performance', 'slowOperationThreshold'),
        },
        errors: {
          recentErrorsCount: recentErrors.length,
          hasCriticalErrors,
          lastErrorTime: recentErrors[0]?.timestamp,
        },
        cache: {
          hitRate: cacheHitRate,
          totalSize: cacheStats.totalSize,
          expiredItemsCount: cacheStats.expiredItems,
        },
        connectivity: {
          isOnline: await checkConnectivity(),
          lastSyncTime: await getLastSyncTime(),
        },
        memory: {
          warningThreshold: memoryWarningThreshold,
          estimatedUsage: estimatedMemoryUsage,
        },
      };

      const healthStatus: AppHealthStatus = {
        ...status,
        overall: calculateOverallHealth(status),
      };

      setHealthStatus(healthStatus);
    } catch (error) {
      console.error('Error updating health status:', error);
    }
  };

  /**
   * Update metrics
   */
  const updateMetrics = () => {
    const now = Date.now();
    const uptime = now - startTime.current;
    
    let backgroundTime = metrics.backgroundTime;
    if (backgroundStartTime.current && lastAppState.current === 'background') {
      backgroundTime += now - backgroundStartTime.current;
      backgroundStartTime.current = now;
    }

    setMetrics(prev => ({
      ...prev,
      uptime,
      backgroundTime,
    }));
  };

  /**
   * Handle app state changes
   */
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (lastAppState.current === 'active' && nextAppState === 'background') {
      backgroundStartTime.current = Date.now();
    } else if (lastAppState.current === 'background' && nextAppState === 'active') {
      if (backgroundStartTime.current) {
        const backgroundDuration = Date.now() - backgroundStartTime.current;
        setMetrics(prev => ({
          ...prev,
          backgroundTime: prev.backgroundTime + backgroundDuration,
        }));
        backgroundStartTime.current = null;
      }
    }

    lastAppState.current = nextAppState;
  };

  /**
   * Track user interaction
   */
  const trackUserInteraction = () => {
    setMetrics(prev => ({
      ...prev,
      userInteractions: prev.userInteractions + 1,
    }));
  };

  /**
   * Track screen change
   */
  const trackScreenChange = () => {
    setMetrics(prev => ({
      ...prev,
      screenChanges: prev.screenChanges + 1,
    }));
  };

  /**
   * Get health report
   */
  const getHealthReport = (): string => {
    if (!healthStatus) return 'Health status not available';

    const report = [
      `Overall Health: ${healthStatus.overall.toUpperCase()}`,
      ``,
      `Performance:`,
      `  Average Response Time: ${healthStatus.performance.averageResponseTime.toFixed(2)}ms`,
      `  Slow Operations: ${healthStatus.performance.slowOperationsCount}`,
      `  Performance Optimal: ${healthStatus.performance.isPerformanceOptimal ? 'Yes' : 'No'}`,
      ``,
      `Errors:`,
      `  Recent Errors: ${healthStatus.errors.recentErrorsCount}`,
      `  Critical Errors: ${healthStatus.errors.hasCriticalErrors ? 'Yes' : 'No'}`,
      `  Last Error: ${healthStatus.errors.lastErrorTime?.toLocaleString() || 'None'}`,
      ``,
      `Cache:`,
      `  Hit Rate: ${(healthStatus.cache.hitRate * 100).toFixed(1)}%`,
      `  Total Size: ${(healthStatus.cache.totalSize / 1024).toFixed(2)} KB`,
      `  Expired Items: ${healthStatus.cache.expiredItemsCount}`,
      ``,
      `Memory:`,
      `  Warning Threshold: ${healthStatus.memory.warningThreshold ? 'Yes' : 'No'}`,
      `  Estimated Usage: ${(healthStatus.memory.estimatedUsage / 1024 / 1024).toFixed(2)} MB`,
      ``,
      `Metrics:`,
      `  Uptime: ${(metrics.uptime / 1000 / 60).toFixed(1)} minutes`,
      `  Screen Changes: ${metrics.screenChanges}`,
      `  User Interactions: ${metrics.userInteractions}`,
      `  Background Time: ${(metrics.backgroundTime / 1000 / 60).toFixed(1)} minutes`,
    ].join('\n');

    return report;
  };

  /**
   * Reset metrics
   */
  const resetMetrics = () => {
    startTime.current = Date.now();
    backgroundStartTime.current = null;
    setMetrics({
      uptime: 0,
      screenChanges: 0,
      userInteractions: 0,
      backgroundTime: 0,
    });
  };

  useEffect(() => {
    // Initialize health monitoring
    updateHealthStatus();
    updateMetrics();

    // Set up periodic updates
    updateInterval.current = setInterval(() => {
      updateHealthStatus();
      updateMetrics();
    }, 30000); // Update every 30 seconds

    // Listen to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
      subscription?.remove();
    };
  }, []);

  return {
    healthStatus,
    metrics,
    trackUserInteraction,
    trackScreenChange,
    getHealthReport,
    resetMetrics,
    refreshHealthStatus: updateHealthStatus,
  };
}

export default useAppHealth;
