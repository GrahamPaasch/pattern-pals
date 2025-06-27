/**
 * Configuration management service
 * Centralized configuration for the entire application
 */

export interface AppConfig {
  // API Configuration
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };

  // Cache Configuration
  cache: {
    defaultTTL: number;
    maxSize: number;
    enablePreloading: boolean;
  };

  // Performance Configuration
  performance: {
    enableTracking: boolean;
    slowOperationThreshold: number;
    maxMetricsStored: number;
  };

  // Error Handling Configuration
  errorHandling: {
    enableErrorReporting: boolean;
    maxErrorsStored: number;
    reportingEndpoint?: string;
  };

  // Feature Flags
  features: {
    enableOfflineSync: boolean;
    enablePerformanceMonitoring: boolean;
    enableAdvancedCaching: boolean;
    enablePushNotifications: boolean;
    enableAnalytics: boolean;
    enableBetaFeatures: boolean;
  };

  // UI Configuration
  ui: {
    theme: 'light' | 'dark' | 'auto';
    animationDuration: number;
    enableHapticFeedback: boolean;
  };

  // Business Logic Configuration
  app: {
    maxConnectionRequests: number;
    maxPatternContributions: number;
    sessionReminderTime: number; // minutes before session
    matchingAlgorithmVersion: string;
  };
}

class ConfigService {
  private static config: AppConfig = {
    api: {
      baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.patternpals.com',
      timeout: 30000, // 30 seconds
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
    },

    cache: {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxSize: 100,
      enablePreloading: true,
    },

    performance: {
      enableTracking: __DEV__ || process.env.EXPO_PUBLIC_ENABLE_PERFORMANCE_TRACKING === 'true',
      slowOperationThreshold: 1000, // 1 second
      maxMetricsStored: 200,
    },

    errorHandling: {
      enableErrorReporting: !__DEV__ && process.env.EXPO_PUBLIC_ENABLE_ERROR_REPORTING === 'true',
      maxErrorsStored: 100,
      reportingEndpoint: process.env.EXPO_PUBLIC_ERROR_REPORTING_ENDPOINT,
    },

    features: {
      enableOfflineSync: true,
      enablePerformanceMonitoring: __DEV__ || process.env.EXPO_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true',
      enableAdvancedCaching: true,
      enablePushNotifications: process.env.EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS === 'true',
      enableAnalytics: process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true',
      enableBetaFeatures: __DEV__ || process.env.EXPO_PUBLIC_ENABLE_BETA_FEATURES === 'true',
    },

    ui: {
      theme: 'auto',
      animationDuration: 300,
      enableHapticFeedback: true,
    },

    app: {
      maxConnectionRequests: 50,
      maxPatternContributions: 10,
      sessionReminderTime: 30, // 30 minutes
      matchingAlgorithmVersion: '1.0',
    },
  };

  /**
   * Get the complete configuration
   */
  static getConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * Get a specific configuration section
   */
  static getSection<K extends keyof AppConfig>(section: K): AppConfig[K] {
    return { ...this.config[section] };
  }

  /**
   * Get a specific configuration value
   */
  static getValue<K extends keyof AppConfig, T extends keyof AppConfig[K]>(
    section: K,
    key: T
  ): AppConfig[K][T] {
    return this.config[section][key];
  }

  /**
   * Update configuration (useful for runtime updates)
   */
  static updateConfig(updates: Partial<AppConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
    };
  }

  /**
   * Update a specific section
   */
  static updateSection<K extends keyof AppConfig>(
    section: K,
    updates: Partial<AppConfig[K]>
  ): void {
    this.config[section] = {
      ...this.config[section],
      ...updates,
    };
  }

  /**
   * Check if a feature is enabled
   */
  static isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return this.config.features[feature];
  }

  /**
   * Get environment-specific configuration
   */
  static getEnvironmentConfig(): {
    isDevelopment: boolean;
    isProduction: boolean;
    enableDebugFeatures: boolean;
  } {
    return {
      isDevelopment: __DEV__,
      isProduction: !__DEV__,
      enableDebugFeatures: __DEV__ || this.config.features.enableBetaFeatures,
    };
  }

  /**
   * Validate configuration on app startup
   */
  static validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate API configuration
    if (!this.config.api.baseUrl) {
      errors.push('API base URL is required');
    }

    if (this.config.api.timeout < 1000) {
      errors.push('API timeout should be at least 1000ms');
    }

    // Validate cache configuration
    if (this.config.cache.defaultTTL < 1000) {
      errors.push('Cache default TTL should be at least 1000ms');
    }

    if (this.config.cache.maxSize < 10) {
      errors.push('Cache max size should be at least 10');
    }

    // Validate performance configuration
    if (this.config.performance.slowOperationThreshold < 100) {
      errors.push('Slow operation threshold should be at least 100ms');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get configuration for logging
   */
  static getLoggingConfig(): {
    enableConsoleLogging: boolean;
    enableFileLogging: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  } {
    const env = this.getEnvironmentConfig();
    
    return {
      enableConsoleLogging: env.isDevelopment,
      enableFileLogging: env.isProduction,
      logLevel: env.isDevelopment ? 'debug' : 'warn',
    };
  }

  /**
   * Export configuration as JSON (for debugging)
   */
  static exportConfig(): string {
    const safeConfig = {
      ...this.config,
      // Remove sensitive information
      api: {
        ...this.config.api,
        // Don't expose full URLs in logs
        baseUrl: this.config.api.baseUrl.replace(/https?:\/\/[^\/]+/, '[REDACTED]'),
      },
    };

    return JSON.stringify(safeConfig, null, 2);
  }
}

export { ConfigService };
