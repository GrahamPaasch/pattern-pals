import React, { useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../hooks/useAuth';

// Screens
import WelcomeScreen from '../screens/WelcomeScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import AvailabilityManagementScreen from '../screens/AvailabilityManagementScreen';
import MatchesScreen from '../screens/MatchesScreen';
import PatternsScreen from '../screens/PatternsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SessionSchedulingScreen from '../screens/SessionSchedulingScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import SupportChatScreen from '../screens/SupportChatScreen';
import PatternContributionScreen from '../screens/PatternContributionScreen';
import UserProfileViewScreen from '../screens/UserProfileViewScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import DebugScreen from '../screens/DebugScreen';

export type RootStackParamList = {
  Welcome: undefined;
  MainTabs: undefined;
  ProfileEdit: undefined;
  AvailabilityManagement: undefined;
  SessionScheduling: {
    partnerId?: string;
    partnerName?: string;
    sessionId?: string;
  };
  Settings: undefined;
  HelpSupport: undefined;
  SupportChat: undefined;
  PatternContribution: undefined;
  Schedule: undefined;
  UserProfileView: {
    userId: string;
    name: string;
    experience: string;
    score: number;
    sharedPatterns: string[];
    canTeach: string[];
    canLearn: string[];
    distance: string;
    lastActive: string;
  };
};

export type MainTabParamList = {
  Home: undefined;
  Matches: undefined;
  Patterns: undefined;
  Schedule: undefined;
  Profile: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Matches':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Patterns':
              iconName = focused ? 'library' : 'library-outline';
              break;
            case 'Schedule':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#6366f1',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <MainTab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ title: 'PatternPals' }}
      />
      <MainTab.Screen 
        name="Matches" 
        component={MatchesScreen} 
        options={{ title: 'Matches' }}
      />
      <MainTab.Screen 
        name="Patterns" 
        component={PatternsScreen} 
        options={{ title: 'Patterns' }}
      />
      <MainTab.Screen 
        name="Schedule" 
        component={ScheduleScreen} 
        options={{ title: 'Schedule' }}
      />
      <MainTab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'Profile' }}
      />
    </MainTab.Navigator>
  );
}

function LoadingScreen() {
  const [dots, setDots] = useState('');
  const [showBypass, setShowBypass] = useState(false);
  
  // Animated dots effect
  React.useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev: string) => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);
    
    // Show bypass button after 3 seconds
    const bypassTimer = setTimeout(() => {
      setShowBypass(true);
    }, 3000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(bypassTimer);
    };
  }, []);
  
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#6366f1" />
      <Text style={styles.loadingText}>Loading PatternPals{dots}</Text>
      <Text style={[styles.loadingText, { fontSize: 12, marginTop: 8, color: '#9ca3af' }]}>
        If this takes too long, try restarting the app
      </Text>
      {showBypass && (
        <TouchableOpacity
          style={styles.bypassButton}
          onPress={() => {
            // Force bypass by setting loading to false in AuthProvider
            console.log('Bypass button pressed - this indicates a loading issue');
          }}
        >
          <Text style={styles.bypassButtonText}>Skip Loading</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function AppNavigator() {
  const { user, userProfile, loading } = useAuth();

  console.log('AppNavigator: loading =', loading);
  console.log('AppNavigator: user exists =', !!user);
  console.log('AppNavigator: userProfile exists =', !!userProfile);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!user ? (
          // Anonymous auth flow - no email/password required!
          <>
            <RootStack.Screen name="Welcome" component={WelcomeScreen} />
          </>
        ) : (
          // Main app flow
          <>
            <RootStack.Screen name="MainTabs" component={MainTabs} />
            <RootStack.Screen 
              name="ProfileEdit" 
              component={ProfileEditScreen}
              options={{
                headerShown: true,
                title: 'Edit Profile',
                headerStyle: {
                  backgroundColor: '#6366f1',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
            <RootStack.Screen 
              name="AvailabilityManagement" 
              component={AvailabilityManagementScreen}
              options={{
                headerShown: true,
                title: 'Manage Availability',
                headerStyle: {
                  backgroundColor: '#6366f1',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
            <RootStack.Screen 
              name="SessionScheduling" 
              component={SessionSchedulingScreen}
              options={{
                headerShown: true,
                title: 'Schedule Session',
                headerStyle: {
                  backgroundColor: '#6366f1',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
            <RootStack.Screen 
              name="Settings" 
              component={SettingsScreen}
              options={{
                headerShown: true,
                title: 'Settings',
                headerStyle: {
                  backgroundColor: '#6366f1',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
            <RootStack.Screen
              name="HelpSupport"
              component={HelpSupportScreen}
              options={{
                headerShown: true,
                title: 'Help & Support',
                headerStyle: {
                  backgroundColor: '#6366f1',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
            <RootStack.Screen
              name="SupportChat"
              component={SupportChatScreen}
              options={{
                headerShown: true,
                title: 'Support Chat',
                headerStyle: {
                  backgroundColor: '#6366f1',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
            <RootStack.Screen
              name="PatternContribution"
              component={PatternContributionScreen}
              options={{
                headerShown: true,
                title: 'Contribute Pattern',
                headerStyle: {
                  backgroundColor: '#6366f1',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
            <RootStack.Screen 
              name="UserProfileView" 
              component={UserProfileViewScreen}
              options={{
                headerShown: true,
                title: 'Juggler Profile',
                headerStyle: {
                  backgroundColor: '#6366f1',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
            <RootStack.Screen 
              name="Schedule" 
              component={ScheduleScreen}
              options={{
                headerShown: true,
                title: 'My Schedule',
                headerStyle: {
                  backgroundColor: '#6366f1',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '500',
  },
  bypassButton: {
    marginTop: 20,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  bypassButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
});
