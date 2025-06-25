import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../hooks/useAuth';

// Screens
import OnboardingScreen from '../screens/OnboardingScreen';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ProfileCreationScreen from '../screens/ProfileCreationScreen';
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
import PatternContributionScreen from '../screens/PatternContributionScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  SignIn: undefined;
  SignUp: undefined;
  ProfileCreation: {
    email: string;
    password: string;
  };
  MainTabs: undefined;
  ProfileEdit: undefined;
  AvailabilityManagement: undefined;
  SessionScheduling: {
    partnerId?: string;
    partnerName?: string;
  };
  Settings: undefined;
  HelpSupport: undefined;
  PatternContribution: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Matches: undefined;
  Patterns: undefined;
  Notifications: undefined;
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
            case 'Notifications':
              iconName = focused ? 'notifications' : 'notifications-outline';
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
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ title: 'Notifications' }}
      />
      <MainTab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'Profile' }}
      />
    </MainTab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    // You could show a loading screen here
    return null;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!user ? (
          // Auth flow
          <>
            <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
            <RootStack.Screen name="SignIn" component={SignInScreen} />
            <RootStack.Screen name="SignUp" component={SignUpScreen} />
            <RootStack.Screen 
              name="ProfileCreation" 
              component={ProfileCreationScreen} 
            />
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
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
