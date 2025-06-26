import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { patterns } from '../data/patterns';
import { ConnectionService, UserSearchService, UserProfile } from '../services';
import { useAuth } from '../hooks/useAuth';

interface MockMatch {
  id: string;
  name: string;
  experience: string;
  score: number;
  sharedPatterns: string[];
  canTeach: string[];
  canLearn: string[];
  distance: string;
  lastActive: string;
}

const mockMatches: MockMatch[] = [
  {
    id: '1',
    name: 'Alex Chen',
    experience: 'Intermediate',
    score: 92,
    sharedPatterns: ['6 Count', 'Walking Pass', '645'],
    canTeach: ['Custom Double Spin'],
    canLearn: ['Walking Pass'],
    distance: '2.3 km',
    lastActive: '2 hours ago',
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    experience: 'Advanced',
    score: 87,
    sharedPatterns: ['6 Count', 'Custom Double Spin'],
    canTeach: ['645', 'Walking Pass'],
    canLearn: ['6 Count'],
    distance: '1.8 km',
    lastActive: '1 day ago',
  },
  {
    id: '3',
    name: 'Mike Rodriguez',
    experience: 'Beginner',
    score: 78,
    sharedPatterns: ['6 Count'],
    canTeach: [],
    canLearn: ['Walking Pass', '645'],
    distance: '3.1 km',
    lastActive: '3 hours ago',
  },
];

type MatchesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MatchesScreenProps {
  // Using the navigation hook instead of prop for better stack access
}

export default function MatchesScreen({}: MatchesScreenProps) {
  const navigation = useNavigation<MatchesScreenNavigationProp>();
  const { user, userProfile } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'matches' | 'search' | 'requests'>('matches');
  const [connectionRequests, setConnectionRequests] = useState<any[]>([]);
  const [connectedUserIds, setConnectedUserIds] = useState<Set<string>>(new Set());
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadConnectionData();
    loadAllUsers();
  }, [user]);

  useEffect(() => {
    handleSearch(searchQuery);
  }, [allUsers]);

  const loadAllUsers = async () => {
    if (!user) return;
    
    try {
      const users = await UserSearchService.getAllUsers(user.id);
      setAllUsers(users);
      setSearchResults(users); // Show all users initially
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!user) return;
    
    setSearching(true);
    try {
      const results = await UserSearchService.searchUsersByName(query, user.id);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const loadConnectionData = async () => {
    if (!user) return;

    // Load connection requests for this user
    const requests = await ConnectionService.getConnectionRequestsForUser(user.id);
    setConnectionRequests(requests);

    // Load existing connections to know which users we're already connected to
    const connections = await ConnectionService.getConnectionsForUser(user.id);
    const connectedIds = new Set(
      connections.map(conn => 
        conn.userId1 === user.id ? conn.userId2 : conn.userId1
      )
    );
    setConnectedUserIds(connectedIds);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#10b981';
    if (score >= 75) return '#f59e0b';
    return '#6b7280';
  };

  const getExperienceColor = (experience: string) => {
    switch (experience) {
      case 'Beginner':
        return '#10b981';
      case 'Intermediate':
        return '#f59e0b';
      case 'Advanced':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const renderSearchResultItem = ({ item }: { item: UserProfile }) => {
    const compatibility = userProfile ? 
      UserSearchService.calculateCompatibilityScore(
        {
          id: userProfile.id,
          name: userProfile.name,
          email: userProfile.email,
          experience: userProfile.experience,
          preferredProps: userProfile.preferredProps.map(prop => prop),
          lastActive: 'online',
          knownPatterns: userProfile.knownPatterns || [],
          wantToLearnPatterns: userProfile.wantToLearnPatterns || []
        },
        item
      ) : 0;

    return (
      <TouchableOpacity style={styles.matchCard}>
        <View style={styles.matchHeader}>
          <View style={styles.matchInfo}>
            <Text style={styles.matchName}>{item.name}</Text>
            <View style={styles.matchMeta}>
              <View 
                style={[
                  styles.experienceBadge, 
                  { backgroundColor: getExperienceColor(item.experience) }
                ]}
              >
                <Text style={styles.experienceText}>{item.experience}</Text>
              </View>
              {item.location && (
                <Text style={styles.distance}>{item.location}</Text>
              )}
            </View>
          </View>
          <View style={styles.scoreContainer}>
            <Text style={[styles.score, { color: getScoreColor(compatibility) }]}>
              {compatibility}%
            </Text>
            <Text style={styles.scoreLabel}>Match</Text>
          </View>
        </View>

        {item.bio && (
          <Text style={styles.description} numberOfLines={2}>{item.bio}</Text>
        )}

        <View style={styles.patternsSection}>
          <View style={styles.patternGroup}>
            <Text style={styles.patternGroupTitle}>Known Patterns ({item.knownPatterns.length})</Text>
            <View style={styles.patternList}>
              {item.knownPatterns.slice(0, 3).map((pattern: string, index: number) => (
                <View key={`known-${pattern}-${index}`} style={styles.patternTag}>
                  <Text style={styles.patternTagText}>{pattern}</Text>
                </View>
              ))}
              {item.knownPatterns.length > 3 && (
                <Text style={styles.moreText}>+{item.knownPatterns.length - 3} more</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.matchFooter}>
          <Text style={styles.lastActive}>Active {item.lastActive}</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => handleViewUserProfile(item)}
            >
              <Text style={styles.secondaryButtonText}>View Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => handleConnectWithUser(item)}
            >
              <Text style={styles.primaryButtonText}>Connect</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const handleViewUserProfile = (targetUser: UserProfile) => {
    const compatibility = userProfile ? 
      UserSearchService.calculateCompatibilityScore(
        {
          id: userProfile.id,
          name: userProfile.name,
          email: userProfile.email,
          experience: userProfile.experience,
          preferredProps: userProfile.preferredProps.map(prop => prop),
          lastActive: 'online',
          knownPatterns: userProfile.knownPatterns || [],
          wantToLearnPatterns: userProfile.wantToLearnPatterns || []
        },
        targetUser
      ) : 0;

    // Find shared patterns and teaching opportunities
    const userKnown = new Set(userProfile?.knownPatterns || []);
    const userWantToLearn = new Set(userProfile?.wantToLearnPatterns || []);
    const targetKnown = new Set(targetUser.knownPatterns);
    const targetWantToLearn = new Set(targetUser.wantToLearnPatterns);

    const sharedPatterns = [...userKnown].filter(pattern => targetKnown.has(pattern));
    const canTeach = [...targetKnown].filter(pattern => userWantToLearn.has(pattern));
    const canLearn = [...userKnown].filter(pattern => targetWantToLearn.has(pattern));

    navigation.navigate('UserProfileView', {
      userId: targetUser.id,
      name: targetUser.name,
      experience: targetUser.experience,
      score: compatibility,
      sharedPatterns,
      canTeach,
      canLearn,
      distance: targetUser.location || 'Location not set',
      lastActive: targetUser.lastActive,
    });
  };

  const handleConnectWithUser = async (targetUser: UserProfile) => {
    if (!user || !userProfile) {
      Alert.alert('Error', 'You must be logged in to send connection requests.');
      return;
    }

    // Check if already connected
    if (connectedUserIds.has(targetUser.id)) {
      Alert.alert('Already Connected', `You're already connected with ${targetUser.name}.`);
      return;
    }

    // Check if request already sent
    const hasPending = await ConnectionService.hasPendingRequest(user.id, targetUser.id);
    if (hasPending) {
      Alert.alert('Request Pending', `You've already sent a connection request to ${targetUser.name}.`);
      return;
    }

    Alert.alert(
      'Send Connection Request',
      `Would you like to send a connection request to ${targetUser.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          onPress: async () => {
            const success = await ConnectionService.sendConnectionRequest(
              user.id,
              targetUser.id,
              userProfile.name,
              targetUser.name
            );

            if (success) {
              Alert.alert(
                'Request Sent!',
                `Your connection request has been sent to ${targetUser.name}. They will be notified and can accept or decline your request.`,
                [{ text: 'OK' }]
              );
            } else {
              Alert.alert(
                'Error',
                'Failed to send connection request. Please try again.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  const handleViewProfile = (match: MockMatch) => {
    console.log('Attempting to navigate to UserProfileView with data:', {
      userId: match.id,
      name: match.name,
      experience: match.experience,
      score: match.score,
      sharedPatterns: match.sharedPatterns,
      canTeach: match.canTeach,
      canLearn: match.canLearn,
      distance: match.distance,
      lastActive: match.lastActive,
    });
    
    navigation.navigate('UserProfileView', {
      userId: match.id,
      name: match.name,
      experience: match.experience,
      score: match.score,
      sharedPatterns: match.sharedPatterns,
      canTeach: match.canTeach,
      canLearn: match.canLearn,
      distance: match.distance,
      lastActive: match.lastActive,
    });
  };

  const handleConnect = async (match: MockMatch) => {
    console.log('Connect button pressed for match:', match.name);
    
    if (!user) {
      Alert.alert('Error', 'You must be logged in to send connection requests.');
      return;
    }

    // Check if already connected
    if (connectedUserIds.has(match.id)) {
      Alert.alert('Already Connected', `You're already connected with ${match.name}.`);
      return;
    }

    // Check if request already sent
    const hasPending = await ConnectionService.hasPendingRequest(user.id, match.id);
    if (hasPending) {
      Alert.alert('Request Pending', `You've already sent a connection request to ${match.name}.`);
      return;
    }

    Alert.alert(
      'Send Connection Request',
      `Would you like to send a connection request to ${match.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          onPress: async () => {
            console.log('Sending connection request...');
            const success = await ConnectionService.sendConnectionRequest(
              user.id,
              match.id,
              userProfile?.name || 'Unknown',
              match.name
            );

            if (success) {
              console.log('Connection request sent successfully');
              Alert.alert(
                'Request Sent!',
                `Your connection request has been sent to ${match.name}. They will be notified and can accept or decline your request.`,
                [{ text: 'OK' }]
              );
            } else {
              console.log('Failed to send connection request');
              Alert.alert(
                'Error',
                'Failed to send connection request. Please try again.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  const handleAcceptRequest = async (request: any) => {
    const success = await ConnectionService.acceptConnectionRequest(request.id);
    if (success) {
      Alert.alert(
        'Connection Accepted!',
        `You are now connected with ${request.fromUserName}. You can now schedule sessions and message each other.`,
        [{ text: 'OK' }]
      );
      loadConnectionData(); // Refresh the data
    } else {
      Alert.alert('Error', 'Failed to accept connection request. Please try again.');
    }
  };

  const handleDeclineRequest = async (request: any) => {
    Alert.alert(
      'Decline Connection Request',
      `Are you sure you want to decline ${request.fromUserName}'s connection request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            const success = await ConnectionService.declineConnectionRequest(request.id);
            if (success) {
              loadConnectionData(); // Refresh the data
            } else {
              Alert.alert('Error', 'Failed to decline connection request. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderMatchItem = ({ item }: { item: MockMatch }) => (
    <TouchableOpacity style={styles.matchCard}>
      <View style={styles.matchHeader}>
        <View style={styles.matchInfo}>
          <Text style={styles.matchName}>{item.name}</Text>
          <View style={styles.matchMeta}>
            <View 
              style={[
                styles.experienceBadge, 
                { backgroundColor: getExperienceColor(item.experience) }
              ]}
            >
              <Text style={styles.experienceText}>{item.experience}</Text>
            </View>
            <Text style={styles.distance}>{item.distance}</Text>
          </View>
        </View>
        <View style={styles.scoreContainer}>
          <Text style={[styles.score, { color: getScoreColor(item.score) }]}>
            {item.score}%
          </Text>
          <Text style={styles.scoreLabel}>Match</Text>
        </View>
      </View>

      <View style={styles.patternsSection}>
        <View style={styles.patternGroup}>
          <Text style={styles.patternGroupTitle}>Shared Patterns ({item.sharedPatterns.length})</Text>
          <View style={styles.patternList}>
            {item.sharedPatterns.slice(0, 2).map((pattern, index) => (
              <View key={`shared-${pattern}-${index}`} style={styles.patternTag}>
                <Text style={styles.patternTagText}>{pattern}</Text>
              </View>
            ))}
            {item.sharedPatterns.length > 2 && (
              <Text style={styles.moreText}>+{item.sharedPatterns.length - 2} more</Text>
            )}
          </View>
        </View>

        {item.canTeach.length > 0 && (
          <View style={styles.patternGroup}>
            <Text style={styles.patternGroupTitle}>They Can Teach You</Text>
            <View style={styles.patternList}>
              {item.canTeach.slice(0, 2).map((pattern, index) => (
                <View key={`teach-${pattern}-${index}`} style={[styles.patternTag, styles.teachTag]}>
                  <Text style={styles.teachTagText}>{pattern}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {item.canLearn.length > 0 && (
          <View style={styles.patternGroup}>
            <Text style={styles.patternGroupTitle}>You Can Teach Them</Text>
            <View style={styles.patternList}>
              {item.canLearn.slice(0, 2).map((pattern, index) => (
                <View key={`learn-${pattern}-${index}`} style={[styles.patternTag, styles.learnTag]}>
                  <Text style={styles.learnTagText}>{pattern}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      <View style={styles.matchFooter}>
        <Text style={styles.lastActive}>Active {item.lastActive}</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => handleViewProfile(item)}
          >
            <Text style={styles.secondaryButtonText}>View Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => handleConnect(item)}
          >
            <Text style={styles.primaryButtonText}>Connect</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderRequestItem = ({ item }: { item: any }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <Text style={styles.requestName}>{item.fromUserName}</Text>
        <Text style={styles.requestTime}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      
      {item.message && (
        <Text style={styles.requestMessage}>"{item.message}"</Text>
      )}
      
      <View style={styles.requestActions}>
        <TouchableOpacity 
          style={styles.declineButton}
          onPress={() => handleDeclineRequest(item)}
        >
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.acceptButton}
          onPress={() => handleAcceptRequest(item)}
        >
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSearchTab = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchHeader}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for jugglers by name..."
          value={searchQuery}
          onChangeText={handleSearch}
          clearButtonMode="while-editing"
        />
        <Text style={styles.searchResultsText}>
          {searching ? 'Searching...' : `${searchResults.length} juggler${searchResults.length !== 1 ? 's' : ''} found`}
        </Text>
      </View>
      
      {searchResults.length > 0 ? (
        <FlatList
          data={searchResults}
          renderItem={renderSearchResultItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : !searching && searchQuery.trim() ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🔍</Text>
          <Text style={styles.emptyStateTitle}>No Users Found</Text>
          <Text style={styles.emptyStateText}>
            No jugglers found matching "{searchQuery}". Try a different search term.
          </Text>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>👥</Text>
          <Text style={styles.emptyStateTitle}>Search for Jugglers</Text>
          <Text style={styles.emptyStateText}>
            Enter a name above to search for specific jugglers you'd like to connect with.
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'matches' && styles.activeTab]}
            onPress={() => setSelectedTab('matches')}
          >
            <Text style={[styles.tabText, selectedTab === 'matches' && styles.activeTabText]}>
              Matches
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'search' && styles.activeTab]}
            onPress={() => setSelectedTab('search')}
          >
            <Text style={[styles.tabText, selectedTab === 'search' && styles.activeTabText]}>
              Search
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'requests' && styles.activeTab]}
            onPress={() => setSelectedTab('requests')}
          >
            <Text style={[styles.tabText, selectedTab === 'requests' && styles.activeTabText]}>
              Requests
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {selectedTab === 'matches' ? (
        <FlatList
          data={mockMatches}
          renderItem={renderMatchItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : selectedTab === 'search' ? (
        renderSearchTab()
      ) : (
        connectionRequests.length > 0 ? (
          <FlatList
            data={connectionRequests}
            renderItem={renderRequestItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📭</Text>
            <Text style={styles.emptyStateTitle}>No Connection Requests</Text>
            <Text style={styles.emptyStateText}>
              When someone wants to connect with you, their requests will appear here.
            </Text>
          </View>
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#6366f1',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#6366f1',
  },
  searchContainer: {
    flex: 1,
  },
  searchHeader: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  searchResultsText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  listContainer: {
    padding: 16,
  },
  matchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  matchInfo: {
    flex: 1,
  },
  matchName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  matchMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  experienceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  experienceText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  distance: {
    fontSize: 14,
    color: '#6b7280',
  },
  scoreContainer: {
    alignItems: 'center',
  },
  score: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  patternsSection: {
    marginBottom: 16,
  },
  patternGroup: {
    marginBottom: 12,
  },
  patternGroupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  patternList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  patternTag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  patternTagText: {
    fontSize: 12,
    color: '#6b7280',
  },
  teachTag: {
    backgroundColor: '#dcfce7',
  },
  teachTagText: {
    color: '#166534',
  },
  learnTag: {
    backgroundColor: '#dbeafe',
  },
  learnTagText: {
    color: '#1e40af',
  },
  moreText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  matchFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastActive: {
    fontSize: 12,
    color: '#6b7280',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  secondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  primaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#6366f1',
  },
  primaryButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  requestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  requestTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  requestMessage: {
    fontSize: 14,
    color: '#4b5563',
    fontStyle: 'italic',
    marginBottom: 12,
    paddingLeft: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#e5e7eb',
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  declineButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    marginRight: 8,
  },
  declineButtonText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
  acceptButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#10b981',
  },
  acceptButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
});
