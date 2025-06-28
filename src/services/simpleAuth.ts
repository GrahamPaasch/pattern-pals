/**
 * Simplified Anonymous Authentication Service for PatternPals
 * No personal information required - just juggling preferences!
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { ErrorService, ErrorType, ErrorSeverity } from './errorService';
import { UserSearchService } from './userSearch';
import type { User, PropType } from '../types';

export interface AuthResult {
  user: any | null;
  profile: User | null;
  error?: string;
}

export class SimpleAuthService {
  private static USER_KEY = 'anonymous_user';
  private static PROFILE_KEY = 'user_profile';

  /**
   * Create anonymous user account - no email or password required!
   */
  static async createUser(userData: {
    name: string;
    experience: 'Beginner' | 'Intermediate' | 'Advanced';
    preferredProps: PropType[];
  }): Promise<AuthResult> {
    try {
      console.log('🎯 SimpleAuth: Creating anonymous user:', userData.name);
      
      // 🔧 FIX: First check if user already exists in database by name
      let databaseUser = null;
      let userId = this.generateUUID(); // Default fallback
      
      if (isSupabaseConfigured() && supabase) {
        console.log('🎯 SimpleAuth: Checking for existing user by name:', userData.name);
        try {
          // Look for existing user by name first
          const { data: existingUsers, error: lookupError } = await supabase
            .from('users')
            .select('*')
            .eq('name', userData.name)
            .limit(1);
          
          if (lookupError) {
            console.error('🎯 SimpleAuth: Error looking up existing user:', lookupError);
          } else if (existingUsers && existingUsers.length > 0) {
            databaseUser = existingUsers[0];
            userId = databaseUser.id; // Use existing database ID
            console.log('🎯 SimpleAuth: Found existing database user:', databaseUser.name, 'ID:', databaseUser.id);
          } else {
            console.log('🎯 SimpleAuth: No existing user found, creating new one');
            // Create new user in database
            const { data: newUser, error: createError } = await supabase
              .from('users')
              .insert([{
                id: userId,
                name: userData.name,
                experience: userData.experience,
                preferred_props: userData.preferredProps,
                known_patterns: [],
                want_to_learn_patterns: []
              }])
              .select()
              .single();

            if (createError) {
              console.error('🎯 SimpleAuth: Database error, using local storage:', createError);
            } else {
              databaseUser = newUser;
              console.log('🎯 SimpleAuth: Successfully created database user');
            }
          }
        } catch (dbError) {
          console.error('🎯 SimpleAuth: Database operation failed, using local storage');
        }
      }
      
      // Create user object (works with or without database)
      const user = {
        id: userId, // Use database ID if available, otherwise random UUID
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        user_metadata: { name: userData.name },
        app_metadata: {},
      };

      // Use database user data if available, otherwise use provided data
      const profile: User = {
        id: userId, // Use same ID as user
        name: databaseUser?.name || userData.name,
        avatar: '',
        experience: databaseUser?.experience || userData.experience,
        preferredProps: databaseUser?.preferred_props || userData.preferredProps,
        availability: [],
        knownPatterns: databaseUser?.known_patterns || [],
        wantToLearnPatterns: databaseUser?.want_to_learn_patterns || [],
        avoidPatterns: databaseUser?.avoid_patterns || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store locally for offline access
      await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(user));
      await AsyncStorage.setItem(this.PROFILE_KEY, JSON.stringify(profile));
      
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

      console.log('🎯 SimpleAuth: Anonymous user created successfully with ID:', userId);
      console.log('🎯 SimpleAuth: Using database user data:', !!databaseUser);
      return { user, profile };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
      console.error('🎯 SimpleAuth: Error creating user:', errorMessage);
      ErrorService.logError(
        error as Error, 
        ErrorType.AUTHENTICATION, 
        ErrorSeverity.HIGH,
        { name: userData.name, action: 'createUser' }
      );
      return { user: null, profile: null, error: errorMessage };
    }
  }

  /**
   * Get current user session
   */
  static async getCurrentSession(): Promise<AuthResult> {
    try {
      const existingUser = await AsyncStorage.getItem(this.USER_KEY);
      const existingProfile = await AsyncStorage.getItem(this.PROFILE_KEY);
      
      if (existingUser && existingProfile) {
        const user = JSON.parse(existingUser);
        const profileData = JSON.parse(existingProfile);
        
        // 🔧 FIX: Check if we should update to use database ID
        if (isSupabaseConfigured() && supabase && profileData.name) {
          try {
            console.log('🎯 SimpleAuth: Checking for database user by name:', profileData.name);
            const { data: databaseUsers, error } = await supabase
              .from('users')
              .select('*')
              .eq('name', profileData.name)
              .limit(1);
            
            if (!error && databaseUsers && databaseUsers.length > 0) {
              const databaseUser = databaseUsers[0];
              
              // If stored ID doesn't match database ID, update it
              if (user.id !== databaseUser.id) {
                console.log('🎯 SimpleAuth: Updating stored user ID from', user.id, 'to', databaseUser.id);
                
                user.id = databaseUser.id;
                profileData.id = databaseUser.id;
                
                // Update stored data with correct database ID
                await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(user));
                await AsyncStorage.setItem(this.PROFILE_KEY, JSON.stringify(profileData));
              }
            }
          } catch (dbError) {
            console.error('🎯 SimpleAuth: Error checking database for user:', dbError);
          }
        }
        
        const profile = {
          ...profileData,
          createdAt: new Date(profileData.createdAt),
          updatedAt: new Date(profileData.updatedAt),
        };
        
        console.log('🎯 SimpleAuth: Found existing session for:', profile.name, 'ID:', user.id);
        return { user, profile };
      }

      return { user: null, profile: null };
    } catch (error) {
      console.error('🎯 SimpleAuth: Error getting session:', error);
      return { user: null, profile: null };
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, updates: Partial<User>): Promise<AuthResult> {
    try {
      const existingProfile = await AsyncStorage.getItem(this.PROFILE_KEY);
      if (!existingProfile) {
        return { user: null, profile: null, error: 'No profile found' };
      }

      const profileData = JSON.parse(existingProfile);
      const updatedProfile = {
        ...profileData,
        ...updates,
        updatedAt: new Date(),
      };

      // Update in database if available
      if (isSupabaseConfigured() && supabase) {
        try {
          await supabase
            .from('users')
            .update({
              name: updatedProfile.name,
              experience: updatedProfile.experience,
              preferred_props: updatedProfile.preferredProps,
              known_patterns: updatedProfile.knownPatterns,
              want_to_learn_patterns: updatedProfile.wantToLearnPatterns,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);
        } catch (dbError) {
          console.error('🎯 SimpleAuth: Database update failed, using local only');
        }
      }

      // Update local storage
      await AsyncStorage.setItem(this.PROFILE_KEY, JSON.stringify(updatedProfile));
      
      // Update searchable user data
      const searchableUser = {
        id: updatedProfile.id,
        name: updatedProfile.name,
        avatar: updatedProfile.avatar,
        experience: updatedProfile.experience,
        preferredProps: updatedProfile.preferredProps,
        location: '',
        lastActive: 'Just now',
        bio: '',
        knownPatterns: updatedProfile.knownPatterns,
        wantToLearnPatterns: updatedProfile.wantToLearnPatterns,
      };
      
      await UserSearchService.addOrUpdateUser(searchableUser);

      const user = await AsyncStorage.getItem(this.USER_KEY);
      return { 
        user: user ? JSON.parse(user) : null, 
        profile: updatedProfile 
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      console.error('🎯 SimpleAuth: Error updating profile:', errorMessage);
      return { user: null, profile: null, error: errorMessage };
    }
  }

  /**
   * Sign out user
   */
  static async signOut(): Promise<boolean> {
    try {
      await AsyncStorage.multiRemove([this.USER_KEY, this.PROFILE_KEY]);
      console.log('🎯 SimpleAuth: User signed out');
      return true;
    } catch (error) {
      console.error('🎯 SimpleAuth: Error signing out:', error);
      return false;
    }
  }

  /**
   * Generate UUID for anonymous users
   */
  private static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
