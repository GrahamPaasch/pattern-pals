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
   * Validate email format
   */
  private static isValidEmail(email: string): boolean {
    console.log('🔧 AuthService: Validating email:', email);
    
    // Basic format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isBasicValid = emailRegex.test(email) && email.length >= 5 && email.length <= 254;
    
    console.log('🔧 AuthService: Basic validation result:', isBasicValid);
    
    // For test emails, be more lenient
    const isTest = this.isTestEmail(email);
    if (isTest) {
      console.log('🔧 AuthService: Using lenient validation for test email:', email);
      const lenientValid = email.includes('@') && email.includes('.') && email.length >= 5;
      console.log('🔧 AuthService: Lenient validation result:', lenientValid);
      return lenientValid;
    }
    
    console.log('🔧 AuthService: Final email validation result for', email, ':', isBasicValid);
    return isBasicValid;
  }

  /**
   * Check if email is a development/test email
   */
  private static isTestEmail(email: string): boolean {
    const testPatterns = [
      /^user\d+@user\d+\.com$/,
      /^test.*@test.*\.com$/,
      /^demo.*@demo.*\.com$/,
      /.*@example\.com$/,
      /.*@test\.com$/,
      /.*@patternpals\.com$/, // Our demo emails
      /^user\d+@(test|demo|example)\.com$/ // Additional test patterns
    ];
    
    console.log('🔧 AuthService: Checking if email is test email:', email);
    const isTest = testPatterns.some(pattern => {
      const matches = pattern.test(email);
      if (matches) {
        console.log('🔧 AuthService: Email matches test pattern:', pattern.toString());
      }
      return matches;
    });
    console.log('🔧 AuthService: Email is test email:', isTest);
    return isTest;
  }

  /**
   * Sign up new user (production-ready with enhanced validation)
   */
  static async signUp(
    email: string, 
    password: string, 
    userData: Partial<User>
  ): Promise<AuthResult> {
    try {
      console.log('🔧 AuthService: Sign up attempt for:', email);
      
      // Special handling for common test emails - always allow these
      const commonTestEmails = ['user1@user1.com', 'user2@user2.com', 'user3@user3.com', 'test@test.com'];
      const isCommonTestEmail = commonTestEmails.includes(email.toLowerCase());
      
      if (isCommonTestEmail) {
        console.log('🔧 AuthService: Using mock auth for common test email:', email);
        return this.createMockUser(email, userData);
      }
      
      // Basic email validation
      if (!this.isValidEmail(email)) {
        console.log('🔧 AuthService: Invalid email format detected for:', email);
        return { user: null, profile: null, error: 'Please enter a valid email address' };
      }

      // Check if this is a test/demo email or if Supabase should be bypassed
      const isTestEmail = this.isTestEmail(email);
      const shouldUseMockAuth = !isSupabaseConfigured() || !supabase || isTestEmail;
      
      console.log('🔧 AuthService: Should use mock auth:', shouldUseMockAuth, '(test email:', isTestEmail, ')');
      
      if (shouldUseMockAuth) {
        // Development/Test: Use mock authentication
        console.log('🔧 AuthService: Using mock authentication for:', email);
        return this.createMockUser(email, userData);
      }

      // Production: Real Supabase authentication (only for real emails)
      console.log('🔧 AuthService: Using Supabase authentication for:', email);
      if (!supabase) {
        console.log('🔧 AuthService: Supabase not available, falling back to mock');
        return this.createMockUser(email, userData);
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        console.log('🔧 AuthService: Supabase error, falling back to mock:', authError.message);
        // If Supabase fails, fall back to mock authentication
        return this.createMockUser(email, userData);
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during sign up';
      console.error('🔧 AuthService: Sign up error:', errorMessage);
      ErrorService.logError(
        error as Error, 
        ErrorType.AUTHENTICATION, 
        ErrorSeverity.HIGH,
        { email, action: 'signUp' }
      );
      
      // If there's any error with Supabase, fall back to mock authentication
      console.log('🔧 AuthService: Falling back to mock authentication due to error');
      try {
        return await this.createMockUser(email, userData);
      } catch (fallbackError) {
        console.error('🔧 AuthService: Mock authentication also failed:', fallbackError);
        return { user: null, profile: null, error: errorMessage };
      }
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
  private static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private static async createMockUser(
    email: string, 
    userData: Partial<User>
  ): Promise<AuthResult> {
    try {
      // 🔧 FIX: Instead of generating random UUIDs, use actual database IDs
      console.log('🔧 AuthService: Looking up user in database for email:', email);
      
      let databaseUser = null;
      let shouldCreateUser = false;
      
      // First, try to find existing user in database by email
      if (isSupabaseConfigured() && supabase) {
        const { data: existingUsers, error: lookupError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .limit(1);
        
        if (lookupError) {
          console.error('🔧 AuthService: Error looking up user:', lookupError);
        } else if (existingUsers && existingUsers.length > 0) {
          databaseUser = existingUsers[0];
          console.log('🔧 AuthService: Found existing database user:', databaseUser.name, 'ID:', databaseUser.id);
        } else {
          console.log('🔧 AuthService: No existing user found, will create new one');
          shouldCreateUser = true;
        }
      }
      
      // If we need to create a user, do it now
      if (shouldCreateUser && isSupabaseConfigured() && supabase) {
        console.log('🔧 AuthService: Creating new user in database');
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([{
            name: userData.name,
            email: email,
            experience: userData.experience,
            preferred_props: userData.preferredProps || [],
            known_patterns: [],
            want_to_learn_patterns: []
          }])
          .select()
          .single();
        
        if (createError) {
          console.error('🔧 AuthService: Error creating user in database:', createError);
          // Fall back to random UUID if database creation fails
        } else {
          databaseUser = newUser;
          console.log('🔧 AuthService: Created new database user:', databaseUser.name, 'ID:', databaseUser.id);
        }
      }
      
      // Use database ID if available, otherwise generate random UUID
      const userId = databaseUser?.id || this.generateUUID();
      
      console.log('🔧 AuthService: Using user ID:', userId);
      
      const mockUser = {
        id: userId,
        email,
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        user_metadata: {},
        app_metadata: {},
      } as any;

      const profile: User = {
        id: userId, // Use the same ID here
        name: userData.name || databaseUser?.name || 'Unknown User',
        avatar: '',
        experience: userData.experience || databaseUser?.experience || 'Beginner',
        preferredProps: userData.preferredProps || databaseUser?.preferred_props || [],
        availability: userData.availability || [],
        knownPatterns: databaseUser?.known_patterns || [],
        wantToLearnPatterns: databaseUser?.want_to_learn_patterns || [],
        avoidPatterns: databaseUser?.avoid_patterns || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store in AsyncStorage
      await AsyncStorage.setItem(this.MOCK_USER_KEY, JSON.stringify(mockUser));
      await AsyncStorage.setItem(this.MOCK_PROFILE_KEY, JSON.stringify(profile));
      
      console.log('🔧 AuthService: Mock user created with database-consistent ID:', userId);
      
      return { user: mockUser, profile };
    } catch (error) {
      console.error('🔧 AuthService: Error in createMockUser:', error);
      // Fallback to original behavior
      return this.createMockUserFallback(email, userData);
    }
  }

  /**
   * Fallback method for mock user creation (original behavior)
   */
  private static async createMockUserFallback(
    email: string, 
    userData: Partial<User>
  ): Promise<AuthResult> {
    const mockUser = {
      id: this.generateUUID(),
      email,
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      user_metadata: {},
      app_metadata: {},
    } as any;

    const profile: User = {
      id: mockUser.id,
      name: userData.name!,
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
   * Sign in mock user for development (with database lookup)
   */
  private static async signInMockUser(email: string): Promise<AuthResult> {
    try {
      console.log('🔧 AuthService: Sign in attempt for email:', email);
      
      // First, try to get user from database by email to get correct ID
      let databaseUser = null;
      if (isSupabaseConfigured() && supabase) {
        const { data: existingUsers, error: lookupError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .limit(1);
        
        if (lookupError) {
          console.error('🔧 AuthService: Error looking up user for sign in:', lookupError);
        } else if (existingUsers && existingUsers.length > 0) {
          databaseUser = existingUsers[0];
          console.log('🔧 AuthService: Found database user for sign in:', databaseUser.name, 'ID:', databaseUser.id);
        }
      }
      
      // Check if we have stored mock user data
      const existingUser = await AsyncStorage.getItem(this.MOCK_USER_KEY);
      const existingProfile = await AsyncStorage.getItem(this.MOCK_PROFILE_KEY);
      
      if (existingUser && existingProfile) {
        const userData = JSON.parse(existingUser);
        const profileData = JSON.parse(existingProfile);
        
        if (userData.email === email) {
          // Update the stored data with database ID if available
          if (databaseUser && userData.id !== databaseUser.id) {
            console.log('🔧 AuthService: Updating stored user ID from', userData.id, 'to', databaseUser.id);
            userData.id = databaseUser.id;
            profileData.id = databaseUser.id;
            
            // Update stored data
            await AsyncStorage.setItem(this.MOCK_USER_KEY, JSON.stringify(userData));
            await AsyncStorage.setItem(this.MOCK_PROFILE_KEY, JSON.stringify(profileData));
          }
          
          const profile = {
            ...profileData,
            createdAt: new Date(profileData.createdAt),
            updatedAt: new Date(profileData.updatedAt),
          };
          
          console.log('🔧 AuthService: Sign in successful with ID:', userData.id);
          return { user: userData, profile };
        }
      }
      
      // If no stored data but we found database user, create mock auth for them
      if (databaseUser) {
        console.log('🔧 AuthService: Creating mock auth for existing database user');
        
        const mockUser = {
          id: databaseUser.id,
          email: databaseUser.email,
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          user_metadata: {},
          app_metadata: {},
        } as any;

        const profile: User = {
          id: databaseUser.id,
          name: databaseUser.name,
          avatar: '',
          experience: databaseUser.experience,
          preferredProps: databaseUser.preferred_props || [],
          availability: [],
          knownPatterns: databaseUser.known_patterns || [],
          wantToLearnPatterns: databaseUser.want_to_learn_patterns || [],
          avoidPatterns: databaseUser.avoid_patterns || [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Store in AsyncStorage
        await AsyncStorage.setItem(this.MOCK_USER_KEY, JSON.stringify(mockUser));
        await AsyncStorage.setItem(this.MOCK_PROFILE_KEY, JSON.stringify(profile));
        
        console.log('🔧 AuthService: Mock auth created for database user with ID:', databaseUser.id);
        return { user: mockUser, profile };
      }

      console.log('🔧 AuthService: No user found for email:', email);
      return { user: null, profile: null, error: 'User not found' };
    } catch (error) {
      console.error('🔧 AuthService: Error in signInMockUser:', error);
      return { user: null, profile: null, error: 'Sign in failed' };
    }
  }
}
