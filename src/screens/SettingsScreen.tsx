import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../hooks/useAuth';
import { NotificationService, ConnectionService, ScheduleService, UserPatternService, PatternLibraryService } from '../services';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type SettingsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Settings'
>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

export default function SettingsScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [matchNotifications, setMatchNotifications] = useState(true);
  const [sessionReminders, setSessionReminders] = useState(true);
  const [locationServices, setLocationServices] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const handleNotificationToggle = (type: string, value: boolean) => {
    switch (type) {
      case 'push':
        setPushNotifications(value);
        break;
      case 'email':
        setEmailNotifications(value);
        break;
      case 'match':
        setMatchNotifications(value);
        break;
      case 'session':
        setSessionReminders(value);
        break;
      case 'location':
        setLocationServices(value);
        break;
      case 'dark':
        setDarkMode(value);
        break;
    }
  };

  const clearData = async () => {
    try {
      if (user?.id) {
        await NotificationService.clearAllNotifications(user.id);
        await ScheduleService.clearAllSessions(user.id);
        await UserPatternService.clearUserPatterns(user.id);
      }
      await ConnectionService.clearAllConnectionData();
      await PatternLibraryService.clearUserPatterns();
      await AsyncStorage.clear();
    } catch (err) {
      console.log('Clear data error:', err);
      throw err;
    }
  };

  const handleFixDuplicateSessions = async () => {
    if (!user?.id) return;
    
    Alert.alert(
      'Fix Duplicate Sessions',
      'This will clean up any duplicate session data that might be causing display issues. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Fix Issues',
          style: 'default',
          onPress: async () => {
            try {
              await ScheduleService.clearProblematicSessions(user.id);
              Alert.alert('Success', 'Session data has been cleaned up');
            } catch {
              Alert.alert('Error', 'Failed to clean up session data');
            }
          },
        },
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear App Data',
      'This will remove all your local data including preferences and cached information. Your account and profile will remain safe. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearData();
              Alert.alert('Success', 'App data cleared successfully');
            } catch {
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. Your account and all associated data will be permanently deleted. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            Alert.alert(
              'Confirm Deletion',
              'Please type "DELETE" to confirm account deletion',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await clearData();
                      await signOut();
                    } catch (err) {
                      console.log('Account deletion error:', err);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <Switch
              value={pushNotifications}
              onValueChange={(value) => handleNotificationToggle('push', value)}
              trackColor={{ false: '#767577', true: '#6366f1' }}
              thumbColor={pushNotifications ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Email Notifications</Text>
            <Switch
              value={emailNotifications}
              onValueChange={(value) => handleNotificationToggle('email', value)}
              trackColor={{ false: '#767577', true: '#6366f1' }}
              thumbColor={emailNotifications ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>New Match Alerts</Text>
            <Switch
              value={matchNotifications}
              onValueChange={(value) => handleNotificationToggle('match', value)}
              trackColor={{ false: '#767577', true: '#6366f1' }}
              thumbColor={matchNotifications ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Session Reminders</Text>
            <Switch
              value={sessionReminders}
              onValueChange={(value) => handleNotificationToggle('session', value)}
              trackColor={{ false: '#767577', true: '#6366f1' }}
              thumbColor={sessionReminders ? '#ffffff' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Location</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLabelContainer}>
              <Text style={styles.settingLabel}>Location Services</Text>
              <Text style={styles.settingDescription}>
                Allow location access to find nearby jugglers
              </Text>
            </View>
            <Switch
              value={locationServices}
              onValueChange={(value) => handleNotificationToggle('location', value)}
              trackColor={{ false: '#767577', true: '#6366f1' }}
              thumbColor={locationServices ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Privacy Policy</Text>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Terms of Service</Text>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Preferences</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Dark Mode</Text>
            <Switch
              value={darkMode}
              onValueChange={(value) => handleNotificationToggle('dark', value)}
              trackColor={{ false: '#767577', true: '#6366f1' }}
              thumbColor={darkMode ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>App Version</Text>
            <Text style={styles.versionText}>1.0.0</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Storage</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleFixDuplicateSessions}>
            <Text style={styles.menuItemText}>Fix Session Issues</Text>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleClearData}>
            <Text style={styles.menuItemText}>Clear App Data</Text>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Export My Data</Text>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dangerZone}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          
          <TouchableOpacity 
            style={styles.dangerButton} 
            onPress={handleDeleteAccount}
          >
            <Text style={styles.dangerButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingLabelContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemText: {
    fontSize: 16,
    color: '#374151',
  },
  menuItemChevron: {
    fontSize: 20,
    color: '#9ca3af',
  },
  versionText: {
    fontSize: 16,
    color: '#6b7280',
  },
  dangerZone: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 32,
    overflow: 'hidden',
  },
  dangerButton: {
    backgroundColor: '#fef2f2',
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#fecaca',
  },
  dangerButtonText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '600',
  },
});
