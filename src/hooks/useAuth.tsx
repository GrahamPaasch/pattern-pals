import { useState, useEffect, createContext, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, UserSearchService } from '../services';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User } from '../types';

interface AuthContextType {
  user: SupabaseUser | null;
  userProfile: User | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: Partial<User>) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStoredUser = async () => {
      console.log('AuthProvider: Starting to load stored user...');
      try {
        // Check for stored mock user
        const storedUser = await AsyncStorage.getItem('mock_user');
        const storedProfile = await AsyncStorage.getItem('mock_profile');
        
        console.log('AuthProvider: storedUser exists:', !!storedUser);
        console.log('AuthProvider: storedProfile exists:', !!storedProfile);
        
        if (storedUser && storedProfile) {
          const mockUser = JSON.parse(storedUser);
          const profile = JSON.parse(storedProfile);
          
          console.log('AuthProvider: Setting user and profile from storage');
          setUser(mockUser);
          setUserProfile({
            ...profile,
            createdAt: new Date(profile.createdAt),
            updatedAt: new Date(profile.updatedAt),
          });
        } else {
          console.log('AuthProvider: No stored user/profile found');
        }
      } catch (error) {
        console.error('Error loading stored user:', error);
      } finally {
        console.log('AuthProvider: Setting loading to false');
        setLoading(false);
      }
    };
    
    // Immediate timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('AuthProvider: Force setting loading to false after 1 second');
      setLoading(false);
    }, 1000); // Reduced to 1 second
    
    loadStoredUser().then(() => {
      clearTimeout(timeoutId);
    }).catch(() => {
      console.log('AuthProvider: Error in loadStoredUser, setting loading to false');
      setLoading(false);
      clearTimeout(timeoutId);
    });
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      if (!supabase) {
        throw new Error('Supabase not initialized');
      }

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

        const profile: User = {
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
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const signUp = async (email: string, password: string, userData: Partial<User>) => {
    setLoading(true);
    try {
      // For development, create a mock user with proper UUID format
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
      
      const newMockUser = {
        id: generateUUID(),
        email,
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        user_metadata: {},
        app_metadata: {},
      } as any;

      // Create mock profile
      const profile: User = {
        id: newMockUser.id,
        name: userData.name!,
        email: newMockUser.email,
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

      // Store in AsyncStorage for persistence
      await AsyncStorage.setItem('mock_user', JSON.stringify(newMockUser));
      await AsyncStorage.setItem('mock_profile', JSON.stringify(profile));
      
      // Add user to searchable user list
      const searchableUser = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        avatar: profile.avatar,
        experience: profile.experience,
        preferredProps: profile.preferredProps,
        location: '', // Can be added later in profile edit
        lastActive: 'Just now',
        bio: '', // Can be added later in profile edit
        knownPatterns: profile.knownPatterns,
        wantToLearnPatterns: profile.wantToLearnPatterns,
      };
      
      const addedToSearch = await UserSearchService.addOrUpdateUser(searchableUser);
      console.log(`Auth: Added user to search service: ${addedToSearch}`);
      
      setUser(newMockUser);
      setUserProfile(profile);
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      // For development, check if there's a stored mock user
      const existingUser = await AsyncStorage.getItem('mock_user');
      const existingProfile = await AsyncStorage.getItem('mock_profile');
      
      if (existingUser && existingProfile) {
        const userData = JSON.parse(existingUser);
        const profileData = JSON.parse(existingProfile);
        
        if (userData.email === email) {
          const profile = {
            ...profileData,
            createdAt: new Date(profileData.createdAt),
            updatedAt: new Date(profileData.updatedAt),
          };
          
          setUser(userData);
          setUserProfile(profile);
          
          // Update user in searchable list (in case they weren't there before)
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
          
          const addedToSearch = await UserSearchService.addOrUpdateUser(searchableUser);
          console.log(`Auth: Updated existing user in search service: ${addedToSearch}`);
          
          return;
        }
      }
      
      // If no stored user, create a demo user for this email
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
      
      const demoUser = {
        id: generateUUID(),
        email,
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        user_metadata: {},
        app_metadata: {},
      } as any;

      const demoProfile: User = {
        id: demoUser.id,
        name: email.split('@')[0],
        email: demoUser.email,
        avatar: '',
        experience: 'Intermediate',
        preferredProps: ['clubs'],
        availability: [
          { day: 'monday', startTime: '18:00', endTime: '20:00' },
          { day: 'wednesday', startTime: '19:00', endTime: '21:00' },
        ],
        knownPatterns: ['1', '2'], // Pre-populate with some patterns
        wantToLearnPatterns: ['3'],
        avoidPatterns: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await AsyncStorage.setItem('mock_user', JSON.stringify(demoUser));
      await AsyncStorage.setItem('mock_profile', JSON.stringify(demoProfile));
      
      // Add demo user to searchable user list
      const searchableUser = {
        id: demoProfile.id,
        name: demoProfile.name,
        email: demoProfile.email,
        avatar: demoProfile.avatar,
        experience: demoProfile.experience,
        preferredProps: demoProfile.preferredProps,
        location: '',
        lastActive: 'Just now',
        bio: '',
        knownPatterns: demoProfile.knownPatterns,
        wantToLearnPatterns: demoProfile.wantToLearnPatterns,
      };
      
      const addedToSearch = await UserSearchService.addOrUpdateUser(searchableUser);
      console.log(`Auth: Added demo user to search service: ${addedToSearch}`);
      
      setUser(demoUser);
      setUserProfile(demoProfile);
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      // Clear mock data
      await AsyncStorage.removeItem('mock_user');
      await AsyncStorage.removeItem('mock_profile');
      
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) throw new Error('No user logged in');

    try {
      // Update mock profile in localStorage
      const updatedProfile = {
        ...userProfile!,
        ...updates,
        updatedAt: new Date(),
      };

      await AsyncStorage.setItem('mock_profile', JSON.stringify(updatedProfile));
      setUserProfile(updatedProfile);
      
      // Update in searchable user list
      const searchableUser = {
        id: updatedProfile.id,
        name: updatedProfile.name,
        email: updatedProfile.email,
        avatar: updatedProfile.avatar,
        experience: updatedProfile.experience,
        preferredProps: updatedProfile.preferredProps,
        location: '', // Can be added later when User type supports it
        lastActive: 'Just now',
        bio: '', // Can be added later when User type supports it
        knownPatterns: updatedProfile.knownPatterns,
        wantToLearnPatterns: updatedProfile.wantToLearnPatterns,
      };
      
      const addedToSearch = await UserSearchService.addOrUpdateUser(searchableUser);
      console.log(`Auth: Updated user in search service: ${addedToSearch}`);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
