import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../hooks/useAuth';

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const { userProfile, signOut } = useAuth();
  const navigation = useNavigation<ProfileScreenNavigationProp>();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleEditProfile = () => {
    navigation.navigate('ProfileEdit');
  };

  const handleManageAvailability = () => {
    navigation.navigate('AvailabilityManagement');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {userProfile?.avatar ? (
              <Image source={{ uri: userProfile.avatar }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {userProfile?.name?.charAt(0).toUpperCase() || '?'}
              </Text>
            )}
          </View>
          <Text style={styles.name}>{userProfile?.name}</Text>
          <View style={styles.experienceBadge}>
            <Text style={styles.experienceText}>{userProfile?.experience}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferred Props</Text>
          <View style={styles.propsList}>
            {userProfile?.preferredProps.map((prop) => (
              <View key={prop} style={styles.propTag}>
                <Text style={styles.propText}>
                  {prop.charAt(0).toUpperCase() + prop.slice(1)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pattern Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userProfile?.knownPatterns?.length || 0}</Text>
              <Text style={styles.statLabel}>Known</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userProfile?.wantToLearnPatterns?.length || 0}</Text>
              <Text style={styles.statLabel}>Learning</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userProfile?.avoidPatterns?.length || 0}</Text>
              <Text style={styles.statLabel}>Avoiding</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Availability</Text>
          {userProfile?.availability && userProfile.availability.length > 0 ? (
            <View style={styles.availabilityList}>
              {userProfile.availability.map((slot) => (
                <View
                  key={`${slot.day}-${slot.startTime}-${slot.endTime}`}
                  style={styles.availabilityItem}
                >
                  <Text style={styles.dayText}>
                    {slot.day.charAt(0).toUpperCase() + slot.day.slice(1)}
                  </Text>
                  <Text style={styles.timeText}>
                    {slot.startTime} - {slot.endTime}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.addAvailabilityButton}
              onPress={handleManageAvailability}
            >
              <Text style={styles.addAvailabilityText}>+ Add Availability</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
            <Text style={styles.menuItemIcon}>✏️</Text>
            <Text style={styles.menuItemText}>Edit Profile</Text>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleManageAvailability}>
            <Text style={styles.menuItemIcon}>🕐</Text>
            <Text style={styles.menuItemText}>Manage Availability</Text>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemIcon}>🔔</Text>
            <Text style={styles.menuItemText}>Notification Settings</Text>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('HelpSupport')}
          >
            <Text style={styles.menuItemIcon}>❓</Text>
            <Text style={styles.menuItemText}>Help & Support</Text>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.menuItemIcon}>⚙️</Text>
            <Text style={styles.menuItemText}>Settings</Text>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
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
    paddingBottom: 32,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  experienceBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  experienceText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  propsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  propTag: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  propText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  availabilityList: {
    gap: 8,
  },
  availabilityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  timeText: {
    fontSize: 16,
    color: '#6b7280',
  },
  addAvailabilityButton: {
    padding: 16,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
  },
  addAvailabilityText: {
    color: '#6b7280',
    fontSize: 16,
  },
  menuSection: {
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  menuItemChevron: {
    fontSize: 20,
    color: '#9ca3af',
  },
  signOutButton: {
    backgroundColor: '#ef4444',
    margin: 16,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  signOutText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
