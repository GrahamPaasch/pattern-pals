import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { patterns } from '../data/patterns';
import { PatternLibraryService } from '../services';
import { Pattern, PatternStatus } from '../types';
import { useUserPatterns } from '../hooks/useUserPatterns';

export default function PatternsScreen() {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [allPatterns, setAllPatterns] = useState<Pattern[]>(patterns);
  const [filteredPatterns, setFilteredPatterns] = useState<Pattern[]>(patterns);
  
  const {
    getPatternStatus,
    setPatternStatus,
    removePatternStatus,
    loading: patternsLoading,
    error: patternsError
  } = useUserPatterns();

  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];

  useFocusEffect(
    useCallback(() => {
      const loadCustom = async () => {
        const custom = await PatternLibraryService.getUserContributedPatterns();
        const combined = [...patterns, ...custom];
        setAllPatterns(combined);
        filterPatterns(searchQuery, selectedDifficulty, combined);
      };
      loadCustom();
    }, [searchQuery, selectedDifficulty])
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    filterPatterns(query, selectedDifficulty);
  };

  const handleDifficultyFilter = (difficulty: string) => {
    setSelectedDifficulty(difficulty);
    filterPatterns(searchQuery, difficulty);
  };

  const filterPatterns = (
    query: string,
    difficulty: string,
    base: Pattern[] = allPatterns
  ) => {
    let filtered = base;

    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = allPatterns.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    if (difficulty !== 'All') {
      filtered = filtered.filter(pattern => pattern.difficulty === difficulty);
    }

    setFilteredPatterns(filtered);
  };

  const getStatusIcon = (status: PatternStatus | null) => {
    switch (status) {
      case 'known':
        return '✅';
      case 'want_to_learn':
        return '📚';
      case 'want_to_avoid':
        return '❌';
      default:
        return '○';
    }
  };

  const getStatusColor = (status: PatternStatus | null) => {
    switch (status) {
      case 'known':
        return '#10b981';
      case 'want_to_learn':
        return '#3b82f6';
      case 'want_to_avoid':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const handlePatternAction = async (patternId: string, action: 'known' | 'want_to_learn' | 'remove') => {
    try {
      if (action === 'remove') {
        await removePatternStatus(patternId);
      } else {
        await setPatternStatus(patternId, action);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update pattern status. Please try again.');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
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

  const renderPatternItem = ({ item }: { item: Pattern }) => {
    const currentStatus = getPatternStatus(item.id);
    
    return (
      <TouchableOpacity style={styles.patternCard}>
        <View style={styles.patternHeader}>
          <Text style={styles.patternName}>{item.name}</Text>
          <View style={styles.patternMeta}>
            <View 
              style={[
                styles.difficultyBadge, 
                { backgroundColor: getDifficultyColor(item.difficulty) }
              ]}
            >
              <Text style={styles.difficultyText}>{item.difficulty}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.statusIcon, { backgroundColor: getStatusColor(currentStatus) }]}
              onPress={() => {
                if (currentStatus) {
                  handlePatternAction(item.id, 'remove');
                } else {
                  handlePatternAction(item.id, 'known');
                }
              }}
            >
              <Text style={styles.statusIconText}>{getStatusIcon(currentStatus)}</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={styles.patternDescription}>{item.description}</Text>
        
        <View style={styles.patternDetails}>
          <Text style={styles.detailText}>
            👥 {item.requiredJugglers} juggler{item.requiredJugglers > 1 ? 's' : ''}
          </Text>
          <Text style={styles.detailText}>
            🤹 {item.props.join(', ')}
          </Text>
          <Text style={styles.detailText}>
            ⏱️ {item.timing.replace('_', ' ')}
          </Text>
          <Text style={styles.detailText}>
            🎯 {item.numberOfProps} props
          </Text>
        </View>

        <View style={styles.patternTags}>
          {item.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          {item.source.type === 'user_contributed' && (
            <View style={[styles.tag, styles.userContributedTag]}>
              <Text style={[styles.tagText, styles.userContributedText]}>
                {item.communityRating ? `⭐${item.communityRating}` : 'New'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.patternActions}>
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              currentStatus === 'known' && styles.actionButtonActive
            ]}
            onPress={() => handlePatternAction(item.id, currentStatus === 'known' ? 'remove' : 'known')}
          >
            <Text style={[
              styles.actionButtonText,
              currentStatus === 'known' && styles.actionButtonTextActive
            ]}>
              {currentStatus === 'known' ? '✅ Known' : 'Mark as Known'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              currentStatus === 'want_to_learn' && styles.actionButtonActive
            ]}
            onPress={() => handlePatternAction(item.id, currentStatus === 'want_to_learn' ? 'remove' : 'want_to_learn')}
          >
            <Text style={[
              styles.actionButtonText,
              currentStatus === 'want_to_learn' && styles.actionButtonTextActive
            ]}>
              {currentStatus === 'want_to_learn' ? '📚 Learning' : 'Want to Learn'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search patterns..."
          value={searchQuery}
          onChangeText={handleSearch}
        />
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          {difficulties.map((difficulty) => (
            <TouchableOpacity
              key={difficulty}
              style={[
                styles.filterButton,
                selectedDifficulty === difficulty && styles.filterButtonActive
              ]}
              onPress={() => handleDifficultyFilter(difficulty)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedDifficulty === difficulty && styles.filterButtonTextActive
                ]}
              >
                {difficulty}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <TouchableOpacity 
          style={styles.contributeButton}
          onPress={() => navigation.navigate('PatternContribution')}
        >
          <Text style={styles.contributeButtonText}>+ Contribute Pattern</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredPatterns}
        renderItem={renderPatternItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
      
      {patternsError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{patternsError}</Text>
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
    marginBottom: 12,
    backgroundColor: '#f9fafb',
  },
  filterContainer: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 8,
    backgroundColor: '#ffffff',
  },
  filterButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  listContainer: {
    padding: 16,
  },
  patternCard: {
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
  patternHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  patternName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  patternMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  difficultyText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  statusIconText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  patternDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  patternDetails: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 16,
  },
  patternTags: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#6b7280',
  },
  patternActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  actionButtonActive: {
    backgroundColor: '#6366f1',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  actionButtonTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  userContributedTag: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    borderWidth: 1,
  },
  userContributedText: {
    color: '#92400e',
    fontWeight: '600',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    margin: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  contributeButton: {
    backgroundColor: '#6366f1',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  contributeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
