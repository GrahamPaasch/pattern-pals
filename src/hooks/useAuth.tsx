import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SimpleAuthService, AuthResult } from '../services/simpleAuth';
import { RealTimeSyncService } from '../services/realTimeSync';
import { User, PropType } from '../types';

interface AuthContextValue {
  user: any | null;
  userProfile: User | null;
  loading: boolean;
  createUser: (userData: { name: string; experience: 'Beginner' | 'Intermediate' | 'Advanced'; preferredProps: PropType[] }) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (profileData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize auth state
    checkCurrentSession();
  }, []);

  const checkCurrentSession = async () => {
    try {
      setLoading(true);
      const result = await SimpleAuthService.getCurrentSession();
      setUser(result.user);
      setUserProfile(result.profile);
      
      // 🚀 Initialize real-time sync when user session is found
      if (result.user && result.profile) {
        console.log('🔄 Initializing real-time sync for:', result.profile.name);
        await RealTimeSyncService.initialize(result.user.id, result.profile.name);
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (userData: { name: string; experience: 'Beginner' | 'Intermediate' | 'Advanced'; preferredProps: PropType[] }) => {
    try {
      const result = await SimpleAuthService.createUser(userData);
      if (result.error) {
        throw new Error(result.error);
      }
      setUser(result.user);
      setUserProfile(result.profile);
      
      // 🚀 Initialize real-time sync for new users
      if (result.user && result.profile) {
        console.log('🔄 Starting real-time sync for new user:', result.profile.name);
        await RealTimeSyncService.initialize(result.user.id, result.profile.name);
      }
    } catch (error) {
      console.error('Create user error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await SimpleAuthService.signOut();
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const updateProfile = async (profileData: Partial<User>) => {
    try {
      if (user && userProfile) {
        const result = await SimpleAuthService.updateProfile(user.id, profileData);
        if (result.error) {
          throw new Error(result.error);
        }
        setUserProfile(result.profile);
      }
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const value: AuthContextValue = {
    user,
    userProfile,
    loading,
    createUser,
    signOut,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
