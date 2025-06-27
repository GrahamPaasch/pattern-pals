/**
 * Data Migration Service
 * Handles migration from AsyncStorage mock data to Supabase production database
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { ErrorService, ErrorType, ErrorSeverity } from './errorService';
import { ValidationService } from './validationService';
import type { User } from '../types';

export interface MigrationResult {
  success: boolean;
  migratedUsers: number;
  migratedPatterns: number;
  migratedConnections: number;
  migratedSessions: number;
  errors: string[];
}

export interface MigrationStatus {
  inProgress: boolean;
  currentStep: string;
  progress: number; // 0-100
  errors: string[];
}

export class MigrationService {
  private static migrationStatus: MigrationStatus = {
    inProgress: false,
    currentStep: '',
    progress: 0,
    errors: []
  };

  /**
   * Get current migration status
   */
  static getMigrationStatus(): MigrationStatus {
    return { ...this.migrationStatus };
  }

  /**
   * Migrate all local data to Supabase
   */
  static async migrateAllData(): Promise<MigrationResult> {
    if (!isSupabaseConfigured() || !supabase) {
      const error = 'Supabase not configured for migration';
      ErrorService.logError(
        new Error(error),
        ErrorType.DATABASE,
        ErrorSeverity.CRITICAL,
        { action: 'migrateAllData' }
      );
      return {
        success: false,
        migratedUsers: 0,
        migratedPatterns: 0,
        migratedConnections: 0,
        migratedSessions: 0,
        errors: [error]
      };
    }

    this.migrationStatus = {
      inProgress: true,
      currentStep: 'Starting migration',
      progress: 0,
      errors: []
    };

    const result: MigrationResult = {
      success: true,
      migratedUsers: 0,
      migratedPatterns: 0,
      migratedConnections: 0,
      migratedSessions: 0,
      errors: []
    };

    try {
      // Step 1: Migrate users
      this.updateStatus('Migrating users', 10);
      result.migratedUsers = await this.migrateUsers();

      // Step 2: Migrate user patterns
      this.updateStatus('Migrating pattern preferences', 30);
      result.migratedPatterns = await this.migrateUserPatterns();

      // Step 3: Migrate connections
      this.updateStatus('Migrating connections', 60);
      result.migratedConnections = await this.migrateConnections();

      // Step 4: Migrate sessions
      this.updateStatus('Migrating sessions', 80);
      result.migratedSessions = await this.migrateSessions();

      // Step 5: Cleanup
      this.updateStatus('Cleaning up', 95);
      await this.cleanupAfterMigration();

      this.updateStatus('Migration complete', 100);
      result.success = this.migrationStatus.errors.length === 0;
      result.errors = [...this.migrationStatus.errors];

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown migration error';
      this.migrationStatus.errors.push(errorMessage);
      result.success = false;
      result.errors = [...this.migrationStatus.errors];

      ErrorService.logError(
        error as Error,
        ErrorType.DATABASE,
        ErrorSeverity.CRITICAL,
        { action: 'migrateAllData', step: this.migrationStatus.currentStep }
      );
    } finally {
      this.migrationStatus.inProgress = false;
    }

    return result;
  }

  /**
   * Migrate users from AsyncStorage to Supabase
   */
  private static async migrateUsers(): Promise<number> {
    try {
      const allUsersData = await AsyncStorage.getItem('all_users');
      const mockUser = await AsyncStorage.getItem('mock_user');
      const mockProfile = await AsyncStorage.getItem('mock_profile');

      const usersToMigrate: any[] = [];

      // Add users from all_users storage
      if (allUsersData) {
        const allUsers = JSON.parse(allUsersData);
        usersToMigrate.push(...allUsers);
      }

      // Add current mock user if exists
      if (mockUser && mockProfile) {
        const user = JSON.parse(mockUser);
        const profile = JSON.parse(mockProfile);
        
        // Check if user already exists in the list
        if (!usersToMigrate.find(u => u.id === user.id)) {
          usersToMigrate.push({
            id: user.id,
            name: profile.name,
            email: user.email,
            experience: profile.experience,
            preferredProps: profile.preferredProps,
            availability: profile.availability,
            knownPatterns: profile.knownPatterns,
            wantToLearnPatterns: profile.wantToLearnPatterns,
            bio: profile.bio || '',
            location: profile.location || '',
            lastActive: 'Just now'
          });
        }
      }

      let migratedCount = 0;

      for (const userData of usersToMigrate) {
        try {
          // Validate user data
          const validation = ValidationService.validateUser(userData);
          if (!validation.isValid) {
            this.migrationStatus.errors.push(`Invalid user data for ${userData.email}: ${validation.errors.join(', ')}`);
            continue;
          }

          // Check if user already exists
          const { data: existingUser } = await supabase!
            .from('users')
            .select('id')
            .eq('email', userData.email)
            .single();

          if (existingUser) {
            console.log(`User ${userData.email} already exists, skipping`);
            continue;
          }

          // Insert user
          const { error: insertError } = await supabase!
            .from('users')
            .insert({
              id: userData.id,
              name: userData.name,
              email: userData.email,
              experience: userData.experience,
              preferred_props: userData.preferredProps || [],
              availability: userData.availability || [],
              bio: userData.bio || '',
              location: userData.location || '',
              known_patterns: userData.knownPatterns || [],
              want_to_learn_patterns: userData.wantToLearnPatterns || [],
              settings: {
                notifications: {
                  push: true,
                  email: true,
                  matches: true,
                  sessions: true
                },
                privacy: {
                  locationServices: false,
                  visibility: 'public'
                }
              }
            });

          if (insertError) {
            this.migrationStatus.errors.push(`Failed to migrate user ${userData.email}: ${insertError.message}`);
          } else {
            migratedCount++;
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.migrationStatus.errors.push(`Error migrating user ${userData.email}: ${errorMessage}`);
        }
      }

      return migratedCount;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error migrating users';
      this.migrationStatus.errors.push(errorMessage);
      return 0;
    }
  }

  /**
   * Migrate user patterns from AsyncStorage to Supabase
   */
  private static async migrateUserPatterns(): Promise<number> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const patternKeys = allKeys.filter(key => key.startsWith('user_patterns_'));

      let migratedCount = 0;

      for (const key of patternKeys) {
        try {
          const userId = key.replace('user_patterns_', '');
          const patternsData = await AsyncStorage.getItem(key);
          
          if (!patternsData) continue;

          const patterns = JSON.parse(patternsData);

          for (const pattern of patterns) {
            try {
              // Check if pattern preference already exists
              const { data: existingPattern } = await supabase!
                .from('user_patterns')
                .select('id')
                .eq('user_id', userId)
                .eq('pattern_id', pattern.patternId)
                .single();

              if (existingPattern) continue;

              // Insert pattern preference
              const { error: insertError } = await supabase!
                .from('user_patterns')
                .insert({
                  user_id: userId,
                  pattern_id: pattern.patternId,
                  status: pattern.status
                });

              if (insertError) {
                this.migrationStatus.errors.push(`Failed to migrate pattern ${pattern.patternId} for user ${userId}: ${insertError.message}`);
              } else {
                migratedCount++;
              }

            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              this.migrationStatus.errors.push(`Error migrating pattern ${pattern.patternId}: ${errorMessage}`);
            }
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.migrationStatus.errors.push(`Error processing pattern key ${key}: ${errorMessage}`);
        }
      }

      return migratedCount;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error migrating patterns';
      this.migrationStatus.errors.push(errorMessage);
      return 0;
    }
  }

  /**
   * Migrate connections from AsyncStorage to Supabase
   */
  private static async migrateConnections(): Promise<number> {
    try {
      const connectionsData = await AsyncStorage.getItem('connections_global');
      const requestsData = await AsyncStorage.getItem('connection_requests_global');

      let migratedCount = 0;

      // Migrate connections
      if (connectionsData) {
        const connections = JSON.parse(connectionsData);
        
        for (const connection of connections) {
          try {
            // Check if connection already exists
            const { data: existingConnection } = await supabase!
              .from('connections')
              .select('id')
              .eq('user1_id', connection.userId1)
              .eq('user2_id', connection.userId2)
              .single();

            if (existingConnection) continue;

            // Insert connection
            const { error: insertError } = await supabase!
              .from('connections')
              .insert({
                user1_id: connection.userId1,
                user2_id: connection.userId2,
                user1_name: connection.userName1,
                user2_name: connection.userName2,
                status: connection.status || 'active',
                connected_at: connection.connectedAt
              });

            if (insertError) {
              this.migrationStatus.errors.push(`Failed to migrate connection: ${insertError.message}`);
            } else {
              migratedCount++;
            }

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.migrationStatus.errors.push(`Error migrating connection: ${errorMessage}`);
          }
        }
      }

      // Migrate connection requests
      if (requestsData) {
        const requests = JSON.parse(requestsData);
        
        for (const request of requests) {
          try {
            // Check if request already exists
            const { data: existingRequest } = await supabase!
              .from('connection_requests')
              .select('id')
              .eq('from_user_id', request.fromUserId)
              .eq('to_user_id', request.toUserId)
              .single();

            if (existingRequest) continue;

            // Insert request
            const { error: insertError } = await supabase!
              .from('connection_requests')
              .insert({
                from_user_id: request.fromUserId,
                to_user_id: request.toUserId,
                from_user_name: request.fromUserName,
                to_user_name: request.toUserName,
                status: request.status,
                message: request.message,
                created_at: request.createdAt,
                updated_at: request.updatedAt
              });

            if (insertError) {
              this.migrationStatus.errors.push(`Failed to migrate connection request: ${insertError.message}`);
            } else {
              migratedCount++;
            }

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.migrationStatus.errors.push(`Error migrating connection request: ${errorMessage}`);
          }
        }
      }

      return migratedCount;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error migrating connections';
      this.migrationStatus.errors.push(errorMessage);
      return 0;
    }
  }

  /**
   * Migrate sessions from AsyncStorage to Supabase
   */
  private static async migrateSessions(): Promise<number> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const sessionKeys = allKeys.filter(key => key.startsWith('scheduled_sessions_'));

      let migratedCount = 0;

      for (const key of sessionKeys) {
        try {
          const userId = key.replace('scheduled_sessions_', '');
          const sessionsData = await AsyncStorage.getItem(key);
          
          if (!sessionsData) continue;

          const sessions = JSON.parse(sessionsData);

          for (const session of sessions) {
            try {
              // Check if session already exists
              const { data: existingSession } = await supabase!
                .from('sessions')
                .select('id')
                .eq('id', session.id)
                .single();

              if (existingSession) continue;

              // Insert session
              const { error: insertError } = await supabase!
                .from('sessions')
                .insert({
                  id: session.id,
                  host_id: session.hostId,
                  partner_id: session.partnerId,
                  partner_name: session.partnerName,
                  scheduled_time: session.scheduledTime,
                  duration: session.duration,
                  location: session.location,
                  planned_patterns: session.plannedPatterns || [],
                  status: session.status,
                  notes: session.notes,
                  created_at: session.createdAt,
                  updated_at: session.updatedAt
                });

              if (insertError) {
                this.migrationStatus.errors.push(`Failed to migrate session ${session.id}: ${insertError.message}`);
              } else {
                migratedCount++;
              }

            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              this.migrationStatus.errors.push(`Error migrating session ${session.id}: ${errorMessage}`);
            }
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.migrationStatus.errors.push(`Error processing session key ${key}: ${errorMessage}`);
        }
      }

      return migratedCount;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error migrating sessions';
      this.migrationStatus.errors.push(errorMessage);
      return 0;
    }
  }

  /**
   * Cleanup after successful migration
   */
  private static async cleanupAfterMigration(): Promise<void> {
    try {
      // Create backup before cleanup
      await this.createDataBackup();

      // Clear AsyncStorage keys (optional - for safety, we might want to keep them)
      // const keysToRemove = [
      //   'all_users',
      //   'connections_global',
      //   'connection_requests_global',
      //   'mock_user',
      //   'mock_profile'
      // ];
      
      // // Also remove user-specific keys
      // const allKeys = await AsyncStorage.getAllKeys();
      // const userKeys = allKeys.filter(key => 
      //   key.startsWith('user_patterns_') || 
      //   key.startsWith('scheduled_sessions_')
      // );
      
      // await AsyncStorage.multiRemove([...keysToRemove, ...userKeys]);

      // For now, just mark migration as complete
      await AsyncStorage.setItem('migration_completed', new Date().toISOString());

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during cleanup';
      this.migrationStatus.errors.push(`Cleanup error: ${errorMessage}`);
    }
  }

  /**
   * Create backup of local data before migration
   */
  private static async createDataBackup(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const allData: Record<string, string> = {};

      for (const key of allKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          allData[key] = value;
        }
      }

      const backup = {
        timestamp: new Date().toISOString(),
        data: allData
      };

      await AsyncStorage.setItem('migration_backup', JSON.stringify(backup));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error creating backup';
      this.migrationStatus.errors.push(`Backup error: ${errorMessage}`);
    }
  }

  /**
   * Check if migration has been completed
   */
  static async isMigrationCompleted(): Promise<boolean> {
    try {
      const completed = await AsyncStorage.getItem('migration_completed');
      return !!completed;
    } catch {
      return false;
    }
  }

  /**
   * Update migration status
   */
  private static updateStatus(step: string, progress: number): void {
    this.migrationStatus.currentStep = step;
    this.migrationStatus.progress = progress;
    console.log(`Migration: ${step} (${progress}%)`);
  }

  /**
   * Reset migration status
   */
  static resetMigrationStatus(): void {
    this.migrationStatus = {
      inProgress: false,
      currentStep: '',
      progress: 0,
      errors: []
    };
  }
}
