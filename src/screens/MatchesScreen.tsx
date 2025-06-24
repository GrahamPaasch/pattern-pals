import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';

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
    sharedPatterns: ['Ultimate', 'Every Others', '6 Count'],
    canTeach: ['Chocolate Bar', 'French Three Count'],
    canLearn: ['Why Not'],
    distance: '2.3 km',
    lastActive: '2 hours ago',
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    experience: 'Advanced',
    score: 87,
    sharedPatterns: ['Ultimate', 'Chocolate Bar'],
    canTeach: ['Why Not', 'Typewriter'],
    canLearn: ['Feed'],
    distance: '1.8 km',
    lastActive: '1 day ago',
  },
  {
    id: '3',
    name: 'Mike Rodriguez',
    experience: 'Beginner',
    score: 78,
    sharedPatterns: ['Ultimate', '6 Count'],
    canTeach: [],
    canLearn: ['Every Others', 'Chocolate Bar'],
    distance: '3.1 km',
    lastActive: '3 hours ago',
  },
];

export default function MatchesScreen() {
  const [selectedTab, setSelectedTab] = useState<'matches' | 'requests'>('matches');

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
              <View key={index} style={styles.patternTag}>
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
                <View key={index} style={[styles.patternTag, styles.teachTag]}>
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
                <View key={index} style={[styles.patternTag, styles.learnTag]}>
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
          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>View Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Connect</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
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
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📭</Text>
          <Text style={styles.emptyStateTitle}>No Connection Requests</Text>
          <Text style={styles.emptyStateText}>
            When someone wants to connect with you, their requests will appear here.
          </Text>
        </View>
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
});
