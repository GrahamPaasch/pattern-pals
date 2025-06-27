/**
 * Centralized error handling and logging service
 * Provides consistent error reporting and user-friendly error messages
 */

export enum ErrorType {
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  AUTHENTICATION = 'AUTHENTICATION',
  VALIDATION = 'VALIDATION',
  PERMISSION = 'PERMISSION',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface AppError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  stack?: string;
  timestamp: Date;
  userId?: string;
  context?: Record<string, any>;
}

class ErrorService {
  private static errors: AppError[] = [];
  private static readonly MAX_ERRORS = 100;

  /**
   * Log an error with context and user-friendly messaging
   */
  static logError(
    error: Error | string,
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, any>,
    userMessage?: string
  ): AppError {
    const appError: AppError = {
      id: Date.now().toString(),
      type,
      severity,
      message: error instanceof Error ? error.message : error,
      userMessage: userMessage || this.getDefaultUserMessage(type),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date(),
      context
    };

    // Store error (with rotation)
    this.errors.unshift(appError);
    if (this.errors.length > this.MAX_ERRORS) {
      this.errors = this.errors.slice(0, this.MAX_ERRORS);
    }

    // Log to console in development
    if (__DEV__) {
      console.error('[PatternPals Error]', {
        type,
        severity,
        message: appError.message,
        context,
        stack: appError.stack
      });
    }

    // TODO: In production, send to crash reporting service
    // this.sendToAnalytics(appError);

    return appError;
  }

  /**
   * Get user-friendly error messages
   */
  private static getDefaultUserMessage(type: ErrorType): string {
    switch (type) {
      case ErrorType.NETWORK:
        return 'Network connection issue. Please check your internet connection and try again.';
      case ErrorType.DATABASE:
        return 'Unable to save your changes right now. We\'ll try again when connection improves.';
      case ErrorType.AUTHENTICATION:
        return 'Authentication issue. Please sign in again.';
      case ErrorType.VALIDATION:
        return 'Please check your input and try again.';
      case ErrorType.PERMISSION:
        return 'You don\'t have permission to perform this action.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }

  /**
   * Get recent errors for debugging
   */
  static getRecentErrors(limit: number = 10): AppError[] {
    return this.errors.slice(0, limit);
  }

  /**
   * Clear all stored errors
   */
  static clearErrors(): void {
    this.errors = [];
  }

  /**
   * Check if there are any critical errors
   */
  static hasCriticalErrors(): boolean {
    return this.errors.some(error => error.severity === ErrorSeverity.CRITICAL);
  }
}

/**
 * Enhanced error reporting for production
 */
export class ErrorReporter {
  /**
   * Report critical errors to external service
   */
  static async reportCriticalError(error: AppError): Promise<void> {
    if (error.severity === ErrorSeverity.CRITICAL) {
      // In production, send to Sentry/Crashlytics
      console.error('[CRITICAL ERROR]', {
        id: error.id,
        type: error.type,
        message: error.message,
        stack: error.stack,
        context: error.context,
        userId: error.userId
      });
    }
  }

  /**
   * Get user-friendly error message with recovery suggestions
   */
  static getUserErrorMessage(error: AppError): string {
    const baseMessage = error.userMessage;
    
    switch (error.type) {
      case ErrorType.NETWORK:
        return `${baseMessage}\n\nTry:\n• Check your internet connection\n• Pull down to refresh\n• Try again in a few moments`;
      case ErrorType.DATABASE:
        return `${baseMessage}\n\nYour data is safe. We'll sync your changes when connection improves.`;
      case ErrorType.AUTHENTICATION:
        return `${baseMessage}\n\nPlease sign in again to continue.`;
      default:
        return baseMessage;
    }
  }

  /**
   * Show user-friendly error notification
   */
  static showUserError(error: AppError): void {
    const message = this.getUserErrorMessage(error);
    
    // In a real app, this would trigger a toast/alert
    if (__DEV__) {
      console.warn('[USER ERROR]', message);
    }
  }
}

export { ErrorService };
