import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// Replace these with your actual Supabase project credentials
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Check if we have valid Supabase credentials
const hasValidSupabaseConfig = SUPABASE_URL && 
  SUPABASE_ANON_KEY && 
  SUPABASE_URL !== 'https://demo.supabase.co' &&
  SUPABASE_URL !== 'your-project-url-here' &&
  SUPABASE_ANON_KEY !== 'demo-key' &&
  SUPABASE_ANON_KEY !== 'your-anon-key-here' &&
  SUPABASE_URL.includes('supabase.co');

// Custom storage implementation for React Native
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key);
  },
};

// Create Supabase client only if we have valid configuration
export const supabase = hasValidSupabaseConfig 
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// Export a function to check if Supabase is configured
export const isSupabaseConfigured = () => hasValidSupabaseConfig;

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          avatar: string | null;
          experience: string;
          preferred_props: string[];
          availability: any[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          avatar?: string | null;
          experience: string;
          preferred_props: string[];
          availability?: any[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          avatar?: string | null;
          experience?: string;
          preferred_props?: string[];
          availability?: any[];
          updated_at?: string;
        };
      };
      user_patterns: {
        Row: {
          id: string;
          user_id: string;
          pattern_id: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          pattern_id: string;
          status: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          pattern_id?: string;
          status?: string;
        };
      };
      matches: {
        Row: {
          id: string;
          user1_id: string;
          user2_id: string;
          score: number;
          shared_availability: any[];
          shared_patterns: string[];
          teaching_opportunities: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          user1_id: string;
          user2_id: string;
          score: number;
          shared_availability?: any[];
          shared_patterns?: string[];
          teaching_opportunities?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          user1_id?: string;
          user2_id?: string;
          score?: number;
          shared_availability?: any[];
          shared_patterns?: string[];
          teaching_opportunities?: any;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
};
