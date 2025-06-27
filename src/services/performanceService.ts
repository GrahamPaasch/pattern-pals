/**
 * Performance monitoring service
 * Tracks app performance metrics and user experience
 */

export interface PerformanceMetric {
  id: string;
  name: string;
  type: 'navigation' | 'api' | 'render' | 'user_action';
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
  timestamp: Date;
}

class PerformanceService {
  private static metrics: PerformanceMetric[] = [];
  private static activeMetrics = new Map<string, PerformanceMetric>();
  private static readonly MAX_METRICS = 200;

  /**
   * Start tracking a performance metric
   */
  static startMetric(
    name: string,
    type: PerformanceMetric['type'],
    metadata?: Record<string, any>
  ): string {
    const id = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const metric: PerformanceMetric = {
      id,
      name,
      type,
      startTime: performance.now(),
      timestamp: new Date(),
      metadata
    };

    this.activeMetrics.set(id, metric);
    return id;
  }

  /**
   * End tracking a performance metric
   */
  static endMetric(id: string, additionalMetadata?: Record<string, any>): PerformanceMetric | null {
    const metric = this.activeMetrics.get(id);
    if (!metric) {
      console.warn(`Performance metric ${id} not found`);
      return null;
    }

    const endTime = performance.now();
    const completedMetric: PerformanceMetric = {
      ...metric,
      endTime,
      duration: endTime - metric.startTime,
      metadata: { ...metric.metadata, ...additionalMetadata }
    };

    // Store completed metric
    this.metrics.unshift(completedMetric);
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(0, this.MAX_METRICS);
    }

    // Remove from active metrics
    this.activeMetrics.delete(id);

    // Log slow operations in development
    if (__DEV__ && completedMetric.duration && completedMetric.duration > 1000) {
      console.warn(`[Performance] Slow operation detected: ${metric.name} took ${completedMetric.duration.toFixed(2)}ms`);
    }

    return completedMetric;
  }

  /**
   * Track a complete operation with automatic timing
   */
  static async trackOperation<T>(
    name: string,
    type: PerformanceMetric['type'],
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const metricId = this.startMetric(name, type, metadata);
    
    try {
      const result = await operation();
      this.endMetric(metricId, { success: true });
      return result;
    } catch (error) {
      this.endMetric(metricId, { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Track synchronous operations
   */
  static trackSync<T>(
    name: string,
    type: PerformanceMetric['type'],
    operation: () => T,
    metadata?: Record<string, any>
  ): T {
    const metricId = this.startMetric(name, type, metadata);
    
    try {
      const result = operation();
      this.endMetric(metricId, { success: true });
      return result;
    } catch (error) {
      this.endMetric(metricId, { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Get performance statistics
   */
  static getStats(): {
    totalMetrics: number;
    averageDuration: number;
    slowestOperations: PerformanceMetric[];
    operationsByType: Record<string, number>;
  } {
    const completedMetrics = this.metrics.filter(m => m.duration !== undefined);
    
    const totalDuration = completedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    const averageDuration = completedMetrics.length > 0 ? totalDuration / completedMetrics.length : 0;
    
    const slowestOperations = [...completedMetrics]
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 10);
    
    const operationsByType = completedMetrics.reduce((acc, metric) => {
      acc[metric.type] = (acc[metric.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalMetrics: completedMetrics.length,
      averageDuration,
      slowestOperations,
      operationsByType
    };
  }

  /**
   * Clear all metrics
   */
  static clearMetrics(): void {
    this.metrics = [];
    this.activeMetrics.clear();
  }

  /**
   * Get recent metrics for debugging
   */
  static getRecentMetrics(limit: number = 20): PerformanceMetric[] {
    return this.metrics.slice(0, limit);
  }
}

export { PerformanceService };
