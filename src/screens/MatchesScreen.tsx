import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { User } from '../types';
import { useAuth } from '../hooks/useAuth';
import { UserSearchService, UserProfile } from '../services/userSearch';
import { ConnectionService } from '../services/connections';
import { SyncService } from '../services/sync';

interface MatchesScreenProps {
  navigation: any;
}

interface ConnectionRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

type ConnectionState = 'none' | 'pending_out' | 'pending_in' | 'connected';

export default function MatchesScreen({ navigation }: MatchesScreenProps) {
  const { user, userProfile } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'matches' | 'search' | 'requests'>('matches');
  const [matches, setMatches] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStates, setConnectionStates] = useState<Map<string, ConnectionState>>(new Map());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMatches();
    loadConnectionRequests();
    loadConnectionStates();
  }, [user]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      loadAllUsers();
    } else {
      handleSearch(searchQuery);
    }
  }, [user]);

  // Reload connection data when switching to requests tab
  useEffect(() => {
    if (selectedTab === 'requests' && user) {
      console.log('Requests tab selected, reloading connection data');
      loadConnectionRequests();
      loadConnectionStates();
    }
  }, [selectedTab, user]);

  // Periodic sync check
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      if (await SyncService.isOnline()) {
        await SyncService.sync();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(syncInterval);
  }, []);

  // Sync when app becomes active
  useEffect(() => {
    const handleAppStateChange = async () => {
      if (await SyncService.isOnline()) {
        await SyncService.sync();
      }
    };

    handleAppStateChange(); // Initial sync check
  }, []);

  const loadAllUsers = async () => {
    if (!user) return;
    
    try {
      setSearching(true);
      const results = await UserSearchService.getAllUsers(user.id);
      setSearchResults(results);
    } catch (error) {
      console.error('Error loading all users:', error);
    } finally {
      setSearching(false);
    }
  };

  const loadConnectionStates = async () => {
    if (!user) return;

    try {
      // Get all connections and requests to determine states
      const [connections, allRequests, sentRequests] = await Promise.all([
        ConnectionService.getConnectionsForUser(user.id),
        ConnectionService.getConnectionRequestsForUser(user.id),
        ConnectionService.getConnectionRequestsSentByUser(user.id)
      ]);

      const stateMap = new Map<string, ConnectionState>();

      // Mark connected users
      connections.forEach((conn: any) => {
        const otherUserId = conn.userId1 === user.id ? conn.userId2 : conn.userId1;
        stateMap.set(otherUserId, 'connected');
      });

      // Process incoming requests
      allRequests.forEach((req: any) => {
        if (req.status === 'pending' && req.toUserId === user.id) {
          stateMap.set(req.fromUserId, 'pending_in');
        }
      });

      // Process outgoing requests (sent by this user)
      sentRequests.forEach((req: any) => {
        if (req.status === 'pending' && req.fromUserId === user.id) {
          stateMap.set(req.toUserId, 'pending_out');
        }
      });

      console.log('Connection states loaded:', Array.from(stateMap.entries()));
      setConnectionStates(stateMap);
    } catch (error) {
      console.error('Error loading connection states:', error);
    }
  };

  const loadMatches = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      // Load real users from Supabase instead of mock data
      const allUsers = await UserSearchService.getAllUsers(user.id);
      
      // Filter to get potential matches (you could implement more sophisticated matching logic here)
      const potentialMatches = allUsers.filter(u => u.id !== user.id).slice(0, 10);
      
      setMatches(potentialMatches);
    } catch (error) {
      console.error('Error loading matches:', error);
      // Fallback to mock data if Supabase fails
      const mockMatches: UserProfile[] = [
        {
          id: '2',
          email: 'alice@example.com',
          name: 'Alice Cooper',
          experience: 'Intermediate',
          preferredProps: ['clubs', 'balls'],
          location: 'Downtown',
          lastActive: '1 hour ago',
          bio: 'Love practicing in the park! Always up for learning new tricks.',
          knownPatterns: ['3-ball cascade', '4-ball fountain', 'mills mess'],
          wantToLearnPatterns: ['passing patterns', '5-ball cascade'],
        },
        {
          id: '3',
          email: 'bob@example.com',
          name: 'Bob Wilson',
          experience: 'Advanced',
          preferredProps: ['clubs'],
          location: 'City Center',
          lastActive: '30 minutes ago',
          bio: 'Professional performer seeking practice partners for advanced patterns.',
          knownPatterns: ['5-ball cascade', 'passing patterns', 'club juggling'],
          wantToLearnPatterns: ['7-ball cascade', 'takeout doubles'],
        },
      ];
      setMatches(mockMatches);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([
      loadMatches(),
      loadConnectionRequests(),
      loadConnectionStates()
    ]);
    setRefreshing(false);
  };

  const loadConnectionRequests = async () => {
    if (!user) return;
    
    try {
      console.log('Loading connection requests for user:', user.id);
      
      // Get incoming connection requests from ConnectionService
      const allRequests = await ConnectionService.getConnectionRequestsForUser(user.id);
      console.log('Raw requests from service:', allRequests);
      
      // Filter to only incoming requests that are still pending
      const incomingRequests = allRequests
        .filter((req: any) => req.toUserId === user.id && req.status === 'pending')
        .map((req: any) => ({
          id: req.id,
          fromUserId: req.fromUserId,
          fromUserName: req.fromUserName,
          toUserId: req.toUserId,
          toUserName: req.toUserName,
          message: req.message,
          status: req.status,
          createdAt: req.createdAt
        }));

      console.log('Processed incoming requests:', incomingRequests);
      setConnectionRequests(incomingRequests);
    } catch (error) {
      console.error('Error loading connection requests:', error);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim() === '') {
      setSearchResults([]);
      return;
    }

    if (!user) {
      Alert.alert('Error', 'Please log in to search for users.');
      return;
    }

    try {
      setSearching(true);
      const results = await UserSearchService.searchUsersByName(query, user.id);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search users. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleConnect = async (targetUser: UserProfile) => {
    if (!user || !userProfile) return;

    // Check current connection state
    const currentState = connectionStates.get(targetUser.id);
    if (currentState === 'connected') {
      Alert.alert('✅ Already Connected', `You're already connected with ${targetUser.name}. You can schedule sessions or message them directly!`);
      return;
    }
    if (currentState === 'pending_out') {
      Alert.alert('⏳ Request Pending', `You've already sent a connection request to ${targetUser.name}. Please wait for their response.`);
      return;
    }
    if (currentState === 'pending_in') {
      Alert.alert('📥 Respond to Request', `${targetUser.name} has already sent you a connection request. Check your Requests tab to accept or decline it.`);
      return;
    }

    try {
      const success = await ConnectionService.sendConnectionRequest(
        user.id, 
        targetUser.id, 
        userProfile.name, 
        targetUser.name
      );

      if (success) {
        // Update the connection state immediately to show pending
        setConnectionStates(prev => new Map(prev.set(targetUser.id, 'pending_out')));
        
        Alert.alert(
          '✅ Request Sent!', 
          `Your connection request has been sent to ${targetUser.name}. They'll receive a notification and can accept or decline your request.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('❌ Error', 'Failed to send connection request. Please try again.');
      }
    } catch (error) {
      console.error('Error sending connection request:', error);
      Alert.alert('Error', 'Failed to send connection request. Please try again.');
    }
  };

  const handleAcceptRequest = async (requestId: string, fromUserId: string, fromUserName: string) => {
    if (!user || !userProfile) return;

    try {
      const success = await ConnectionService.acceptConnectionRequest(requestId);
      
      if (success) {
        // Update connection state and reload data
        setConnectionStates(prev => new Map(prev.set(fromUserId, 'connected')));
        await Promise.all([
          loadConnectionRequests(),
          loadConnectionStates()
        ]);
        
        Alert.alert(
          '🎉 Connected!', 
          `You are now connected with ${fromUserName}! You can now schedule practice sessions together and exchange messages.`,
          [{ text: 'Great!' }]
        );
      } else {
        Alert.alert('Error', 'Failed to accept connection request. Please try again.');
      }
    } catch (error) {
      console.error('Error accepting connection request:', error);
      Alert.alert('Error', 'Failed to accept connection request. Please try again.');
    }
  };

  const handleDeclineRequest = async (requestId: string, fromUserName: string) => {
    try {
      const success = await ConnectionService.declineConnectionRequest(requestId);
      
      if (success) {
        await Promise.all([
          loadConnectionRequests(),
          loadConnectionStates()
        ]);
        Alert.alert('Request Declined', `Connection request from ${fromUserName} has been declined.`);
      } else {
        Alert.alert('Error', 'Failed to decline connection request. Please try again.');
      }
    } catch (error) {
      console.error('Error declining connection request:', error);
      Alert.alert('Error', 'Failed to decline connection request. Please try again.');
    }
  };

  const getConnectionButtonConfig = (userId: string) => {
    const state = connectionStates.get(userId) || 'none';
    
    switch (state) {
      case 'connected':
        return {
          text: '✓ Connected',
          color: '#10b981', // Green
          disabled: true,
          textColor: '#ffffff'
        };
      case 'pending_out':
        return {
          text: '⏳ Pending',
          color: '#f59e0b', // Yellow/Amber
          disabled: true,
          textColor: '#ffffff'
        };
      case 'pending_in':
        return {
          text: '↗️ Respond',
          color: '#3b82f6', // Blue
          disabled: false,
          textColor: '#ffffff'
        };
      default:
        return {
          text: 'Connect',
          color: '#6366f1', // Purple
          disabled: false,
          textColor: '#ffffff'
        };
    }
  };

  const handleViewProfile = (profile: UserProfile) => {
    if (!userProfile) return;

    const compatibility = getCompatibilityScore(profile);
    
    // Find shared patterns and teaching opportunities
    const userKnown = new Set(userProfile.knownPatterns || []);
    const userWantToLearn = new Set(userProfile.wantToLearnPatterns || []);
    const targetKnown = new Set(profile.knownPatterns);
    const targetWantToLearn = new Set(profile.wantToLearnPatterns);

    const sharedPatterns = [...userKnown].filter(pattern => targetKnown.has(pattern));
    const canTeach = [...targetKnown].filter(pattern => userWantToLearn.has(pattern));
    const canLearn = [...userKnown].filter(pattern => targetWantToLearn.has(pattern));

    navigation.navigate('UserProfileView', {
      userId: profile.id,
      name: profile.name,
      experience: profile.experience,
      score: compatibility,
      sharedPatterns,
      canTeach,
      canLearn,
      distance: profile.location || 'Location not set',
      lastActive: profile.lastActive,
    });
  };

  const getCompatibilityScore = (profile: UserProfile): number => {
    if (!userProfile) return 0;
    
    let score = 0;
    
    // Experience level compatibility
    const experienceLevels = ['Beginner', 'Intermediate', 'Advanced'];
    const userExpIndex = experienceLevels.indexOf(userProfile.experience);
    const profileExpIndex = experienceLevels.indexOf(profile.experience);
    const expDiff = Math.abs(userExpIndex - profileExpIndex);
    score += Math.max(0, 40 - (expDiff * 15));
    
    // Pattern compatibility
    const userPatterns = userProfile.knownPatterns || [];
    const profilePatterns = profile.knownPatterns || [];
    const commonPatterns = userPatterns.filter((pattern: string) => 
      profilePatterns.includes(pattern)
    );
    score += Math.min(30, commonPatterns.length * 10);
    
    // Teaching opportunities
    const canTeach = userPatterns.filter((pattern: string) => 
      profile.wantToLearnPatterns.includes(pattern)
    );
    const canLearn = profilePatterns.filter((pattern: string) => 
      userProfile.wantToLearnPatterns.includes(pattern)
    );
    score += Math.min(20, (canTeach.length + canLearn.length) * 5);
    
    // Location compatibility (simplified)
    if (userProfile.name && profile.location) { // Simple location check
      score += 10;
    }
    
    return Math.min(100, score);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#10b981';
    if (score >= 75) return '#f59e0b';
    return '#6b7280';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 90) {
      return 'Excellent Match';
    } else if (score >= 75) {
      return 'Good Match';
    } else if (score >= 50) {
      return 'Fair Match';
    } else {
      return 'Limited Match';
    }
  };

  const renderMatchItem = ({ item }: { item: UserProfile }) => {
    const compatibilityScore = getCompatibilityScore(item);
    const buttonConfig = getConnectionButtonConfig(item.id);
    
    return (
      <TouchableOpacity
        style={styles.matchCard}
        onPress={() => handleViewProfile(item)}
      >
        <View style={styles.matchHeader}>
          <View style={styles.matchInfo}>
            <Text style={styles.matchName}>{item.name}</Text>
            <Text style={styles.matchLocation}>{item.location}</Text>
          </View>
          <View style={styles.compatibilityBadge}>
            <Text style={[styles.compatibilityScore, { color: getScoreColor(compatibilityScore) }]}>
              {compatibilityScore}%
            </Text>
            <Text style={styles.compatibilityLabel}>
              {getScoreLabel(compatibilityScore)}
            </Text>
          </View>
        </View>
        
        <Text style={styles.matchSkill}>
          {item.experience} level
        </Text>
        
        <Text style={styles.matchBio} numberOfLines={2}>
          {item.bio}
        </Text>
        
        <View style={styles.matchPatterns}>
          {(item.knownPatterns || []).slice(0, 3).map((pattern: string, index: number) => (
            <View key={`match-${pattern}-${index}`} style={styles.patternTag}>
              <Text style={styles.patternText}>{pattern}</Text>
            </View>
          ))}
          {(item.knownPatterns || []).length > 3 && (
            <Text style={styles.morePatterns}>+{(item.knownPatterns || []).length - 3} more</Text>
          )}
        </View>
        
        <TouchableOpacity
          style={[
            styles.connectButton, 
            { 
              backgroundColor: buttonConfig.color,
              opacity: buttonConfig.disabled ? 0.8 : 1.0
            }
          ]}
          onPress={() => handleConnect(item)}
          disabled={buttonConfig.disabled}
        >
          <Text style={[styles.connectButtonText, { color: buttonConfig.textColor }]}>
            {buttonConfig.text}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderSearchResultItem = ({ item }: { item: UserProfile }) => {
    const compatibilityScore = getCompatibilityScore(item);
    const buttonConfig = getConnectionButtonConfig(item.id);
    
    return (
      <TouchableOpacity
        style={styles.searchResultCard}
        onPress={() => handleViewProfile(item)}
      >
        <View style={styles.searchResultHeader}>
          <View style={styles.searchResultInfo}>
            <Text style={styles.searchResultName}>{item.name}</Text>
            <Text style={styles.searchResultLocation}>{item.location}</Text>
            <Text style={styles.searchResultSkill}>
              {item.experience} level
            </Text>
          </View>
          <View style={styles.searchResultActions}>
            <View style={styles.compatibilityBadgeSmall}>
              <Text style={[styles.compatibilityScoreSmall, { color: getScoreColor(compatibilityScore) }]}>
                {compatibilityScore}%
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.connectButtonSmall, 
                { 
                  backgroundColor: buttonConfig.color,
                  opacity: buttonConfig.disabled ? 0.8 : 1.0
                }
              ]}
              onPress={() => handleConnect(item)}
              disabled={buttonConfig.disabled}
            >
              <Text style={[styles.connectButtonSmallText, { color: buttonConfig.textColor }]}>
                {buttonConfig.text}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={styles.searchResultBio} numberOfLines={2}>
          {item.bio}
        </Text>
        
        <View style={styles.searchResultPatterns}>
          {(item.knownPatterns || []).slice(0, 2).map((pattern: string, index: number) => (
            <View key={`search-${pattern}-${index}`} style={styles.patternTagSmall}>
              <Text style={styles.patternTextSmall}>{pattern}</Text>
            </View>
          ))}
          {(item.knownPatterns || []).length > 2 && (
            <Text style={styles.morePatternsSmall}>+{(item.knownPatterns || []).length - 2}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderRequestItem = ({ item }: { item: ConnectionRequest }) => {
    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <Text style={styles.requestName}>{item.fromUserName}</Text>
          <Text style={styles.requestTime}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        
        <Text style={styles.requestSkill}>
          Connection request from {item.fromUserName}
        </Text>
        
        {item.message && (
          <Text style={styles.requestMessage}>"{item.message}"</Text>
        )}
        
        <View style={styles.requestActions}>
          <TouchableOpacity
            style={styles.declineButton}
            onPress={() => handleDeclineRequest(item.id, item.fromUserName)}
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAcceptRequest(item.id, item.fromUserId, item.fromUserName)}
          >
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
            {connectionRequests.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{connectionRequests.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {selectedTab === 'matches' && (
        loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Finding your matches...</Text>
          </View>
        ) : matches.length > 0 ? (
          <FlatList
            data={matches}
            renderItem={renderMatchItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={refreshData} />
            }
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🎪</Text>
            <Text style={styles.emptyStateTitle}>No Matches Yet</Text>
            <Text style={styles.emptyStateText}>
              We're still finding jugglers that match your preferences. Check back soon!
            </Text>
          </View>
        )
      )}

      {selectedTab === 'search' && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search for jugglers by name..."
              value={searchQuery}
              onChangeText={handleSearch}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>
          
          {searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderSearchResultItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={refreshData} />
              }
            />
          ) : searching ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🔍</Text>
              <Text style={styles.emptyStateTitle}>Searching...</Text>
              <Text style={styles.emptyStateText}>
                Looking for jugglers matching your search.
              </Text>
            </View>
          ) : searchQuery.trim() !== '' ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🔍</Text>
              <Text style={styles.emptyStateTitle}>No Results Found</Text>
              <Text style={styles.emptyStateText}>
                No jugglers found matching "{searchQuery}". Try a different search term.
              </Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🔍</Text>
              <Text style={styles.emptyStateTitle}>Search for Jugglers</Text>
              <Text style={styles.emptyStateText}>
                Enter a name above to find specific jugglers you'd like to connect with.
              </Text>
            </View>
          )}
        </View>
      )}

      {selectedTab === 'requests' && (
        connectionRequests.length > 0 ? (
          <FlatList
            data={connectionRequests}
            renderItem={renderRequestItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={refreshData} />
            }
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
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3b82f6',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  listContainer: {
    padding: 16,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  matchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  matchInfo: {
    flex: 1,
  },
  matchName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  matchLocation: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  compatibilityBadge: {
    alignItems: 'center',
  },
  compatibilityScore: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  compatibilityLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  matchSkill: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  matchBio: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  matchPatterns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  patternTag: {
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  patternText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  morePatterns: {
    fontSize: 12,
    color: '#6b7280',
    alignSelf: 'center',
  },
  connectButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    flex: 1,
  },
  searchInputContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  searchResultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  searchResultLocation: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  searchResultSkill: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  searchResultActions: {
    alignItems: 'flex-end',
  },
  compatibilityBadgeSmall: {
    marginBottom: 8,
  },
  compatibilityScoreSmall: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  connectButtonSmall: {
    backgroundColor: '#3b82f6',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  connectButtonSmallText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  searchResultBio: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    marginBottom: 8,
  },
  searchResultPatterns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  patternTagSmall: {
    backgroundColor: '#eff6ff',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 6,
    marginBottom: 2,
  },
  patternTextSmall: {
    fontSize: 10,
    color: '#3b82f6',
    fontWeight: '500',
  },
  morePatternsSmall: {
    fontSize: 10,
    color: '#6b7280',
    alignSelf: 'center',
  },
  requestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  requestName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  requestTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  requestLocation: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  requestSkill: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  requestMessage: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  declineButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  declineButtonText: {
    fontSize: 14,
    color: '#6b7280',
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
