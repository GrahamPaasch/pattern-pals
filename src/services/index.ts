// Services index - re-export all services for easier imports
export { AuthService, AuthResult } from './authService';
export { MigrationService, MigrationResult, MigrationStatus } from './migrationService';
export { ScheduleService, ScheduledSession } from './schedule';
export { NotificationService, LocalNotification } from './notifications';
export { PushNotificationService, PushNotificationData } from './pushNotificationService';
export { ConnectionService } from './connections';
export { UserPatternService } from './userPatterns';
export { UserSearchService, UserProfile } from './userSearch';
export { supabase } from './supabase';
export { PatternLibraryService } from './patternLibrary';
export { SyncService } from './sync';
export { ErrorService, ErrorType, ErrorSeverity } from './errorService';
export { PerformanceService } from './performanceService';
export { ValidationService } from './validationService';
export { CacheService, CacheKeys } from './cacheService';
export { ConfigService } from './configService';
export { PatternIntelligenceService } from './patternIntelligence';
