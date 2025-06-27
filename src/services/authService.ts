/**
 * Enhanced Authentication Service for Production Migration
 * Handles both mock (development) and real Supabase authentication
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { ErrorService, ErrorType, ErrorSeverity } from './errorService';
import { UserSearchService } from './userSearch';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User } from '../types';

export interface AuthResult {
  user: SupabaseUser | null;
  profile: User | null;
  error?: string;
}

export class AuthService {
  private static MOCK_USER_KEY = 'mock_user';
  private static MOCK_PROFILE_KEY = 'mock_profile';

  /**
   * Sign up new user (production-ready)
   */
  static async signUp(
    email: string, 
    password: string, 
    userData: Partial<User>
  ): Promise<AuthResult> {
    try {
      if (isSupabaseConfigured() && supabase) {
        // Production: Real Supabase authentication
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) {
          ErrorService.logError(
            authError, 
            ErrorType.AUTHENTICATION, 
            ErrorSeverity.HIGH,
            { email, action: 'signUp' }
          );
          return { user: null, profile: null, error: authError.message };
        }

        if (authData.user) {
          // Create user profile in database
          const { error: profileError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              email: authData.user.email!,
              name: userData.name!,
              experience: userData.experience!,
              preferred_props: userData.preferredProps!,
              availability: userData.availability || [],
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

          if (profileError) {
            ErrorService.logError(
              profileError, 
              ErrorType.DATABASE, 
              ErrorSeverity.HIGH,
              { userId: authData.user.id, action: 'createProfile' }
            );
            return { user: null, profile: null, error: profileError.message };
          }

          // Fetch the created profile
          const profile = await this.fetchUserProfile(authData.user.id);
          return { user: authData.user, profile };
        }

        return { user: null, profile: null, error: 'Failed to create user' };
      } else {
        // Development: Mock authentication
        return this.createMockUser(email, userData);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during sign up';
      ErrorService.logError(
        error as Error, 
        ErrorType.AUTHENTICATION, 
        ErrorSeverity.HIGH,
        { email, action: 'signUp' }
      );
      return { user: null, profile: null, error: errorMessage };
    }
  }

  /**
   * Sign in existing user (production-ready)
   */
  static async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      if (isSupabaseConfigured() && supabase) {
        // Production: Real Supabase authentication
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) {
          ErrorService.logError(
            authError, 
            ErrorType.AUTHENTICATION, 
            ErrorSeverity.MEDIUM,
            { email, action: 'signIn' }
          );
          return { user: null, profile: null, error: authError.message };
        }

        if (authData.user) {
          const profile = await this.fetchUserProfile(authData.user.id);
          
          // Update last active timestamp
          await supabase
            .from('users')
            .update({ last_active: new Date().toISOString() })
            .eq('id', authData.user.id);

          return { user: authData.user, profile };
        }

        return { user: null, profile: null, error: 'Failed to sign in' };
      } else {
        // Development: Check mock storage
        return this.signInMockUser(email);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during sign in';
      ErrorService.logError(
        error as Error, 
        ErrorType.AUTHENTICATION, 
        ErrorSeverity.MEDIUM,
        { email, action: 'signIn' }
      );
      return { user: null, profile: null, error: errorMessage };
    }
  }

  /**
   * Sign out user
   */
  static async signOut(): Promise<boolean> {
    try {
      if (isSupabaseConfigured() && supabase) {
        const { error } = await supabase.auth.signOut();
        if (error) {
          ErrorService.logError(
            error, 
            ErrorType.AUTHENTICATION, 
            ErrorSeverity.LOW,
            { action: 'signOut' }
          );
          return false;
        }
      }

      // Clear mock storage
      await AsyncStorage.multiRemove([this.MOCK_USER_KEY, this.MOCK_PROFILE_KEY]);
      return true;
    } catch (error) {
      ErrorService.logError(
        error as Error, 
        ErrorType.AUTHENTICATION, 
        ErrorSeverity.LOW,
        { action: 'signOut' }
      );
      return false;
    }
  }

  /**
   * Get current session
   */
  static async getCurrentSession(): Promise<AuthResult> {
    try {
      if (isSupabaseConfigured() && supabase) {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          ErrorService.logError(
            error, 
            ErrorType.AUTHENTICATION, 
            ErrorSeverity.LOW,
            { action: 'getCurrentSession' }
          );
          return { user: null, profile: null, error: error.message };
        }

        if (session?.user) {
          const profile = await this.fetchUserProfile(session.user.id);
          return { user: session.user, profile };
        }
      }

      // Check mock storage
      const storedUser = await AsyncStorage.getItem(this.MOCK_USER_KEY);
      const storedProfile = await AsyncStorage.getItem(this.MOCK_PROFILE_KEY);
      
      if (storedUser && storedProfile) {
        const user = JSON.parse(storedUser);
        const profile = JSON.parse(storedProfile);
        return {
          user,
          profile: {
            ...profile,
            createdAt: new Date(profile.createdAt),
            updatedAt: new Date(profile.updatedAt),
          }
        };
      }

      return { user: null, profile: null };
    } catch (error) {
      ErrorService.logError(
        error as Error, 
        ErrorType.AUTHENTICATION, 
        ErrorSeverity.LOW,
        { action: 'getCurrentSession' }
      );
      return { user: null, profile: null, error: 'Failed to get current session' };
    }
  }

  /**
   * Fetch user profile from database
   */
  private static async fetchUserProfile(userId: string): Promise<User | null> {
    try {
      if (!supabase) return null;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        // Also fetch user patterns
        const { data: userPatternsData } = await supabase
          .from('user_patterns')
          .select('pattern_id, status')
          .eq('user_id', userId);

        const knownPatterns = userPatternsData?.filter(p => p.status === 'known').map(p => p.pattern_id) || [];
        const wantToLearnPatterns = userPatternsData?.filter(p => p.status === 'want_to_learn').map(p => p.pattern_id) || [];
        const avoidPatterns = userPatternsData?.filter(p => p.status === 'want_to_avoid').map(p => p.pattern_id) || [];

        return {
          id: data.id,
          name: data.name,
          email: data.email,
          avatar: data.avatar,
          experience: data.experience,
          preferredProps: data.preferred_props,
          availability: data.availability,
          knownPatterns,
          wantToLearnPatterns,
          avoidPatterns,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        };
      }

      return null;
    } catch (error) {
      ErrorService.logError(
        error as Error, 
        ErrorType.DATABASE, 
        ErrorSeverity.MEDIUM,
        { userId, action: 'fetchUserProfile' }
      );
      return null;
    }
  }

  /**
   * Create mock user for development
   */
  private static async createMockUser(
    email: string, 
    userData: Partial<User>
  ): Promise<AuthResult> {
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    const mockUser = {
      id: generateUUID(),
      email,
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      user_metadata: {},
      app_metadata: {},
    } as any;

    const profile: User = {
      id: mockUser.id,
      name: userData.name!,
      email: mockUser.email,
      avatar: '',
      experience: userData.experience!,
      preferredProps: userData.preferredProps!,
      availability: userData.availability || [],
      knownPatterns: [],
      wantToLearnPatterns: [],
      avoidPatterns: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store in AsyncStorage
    await AsyncStorage.setItem(this.MOCK_USER_KEY, JSON.stringify(mockUser));
    await AsyncStorage.setItem(this.MOCK_PROFILE_KEY, JSON.stringify(profile));
    
    // Add to searchable users
    const searchableUser = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      avatar: profile.avatar,
      experience: profile.experience,
      preferredProps: profile.preferredProps,
      location: '',
      lastActive: 'Just now',
      bio: '',
      knownPatterns: profile.knownPatterns,
      wantToLearnPatterns: profile.wantToLearnPatterns,
    };
    
    await UserSearchService.addOrUpdateUser(searchableUser);

    return { user: mockUser, profile };
  }

  /**
   * Sign in mock user for development
   */
  private static async signInMockUser(email: string): Promise<AuthResult> {
    const existingUser = await AsyncStorage.getItem(this.MOCK_USER_KEY);
    const existingProfile = await AsyncStorage.getItem(this.MOCK_PROFILE_KEY);
    
    if (existingUser && existingProfile) {
      const userData = JSON.parse(existingUser);
      const profileData = JSON.parse(existingProfile);
      
      if (userData.email === email) {
        const profile = {
          ...profileData,
          createdAt: new Date(profileData.createdAt),
          updatedAt: new Date(profileData.updatedAt),
        };
        
        return { user: userData, profile };
      }
    }

    return { user: null, profile: null, error: 'User not found' };
  }
}
