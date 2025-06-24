import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
} from 'react-native';
import { patterns, searchPatterns } from '../data/patterns';
import { Pattern, PatternStatus } from '../types';

export default function PatternsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [filteredPatterns, setFilteredPatterns] = useState<Pattern[]>(patterns);

  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    filterPatterns(query, selectedDifficulty);
  };

  const handleDifficultyFilter = (difficulty: string) => {
    setSelectedDifficulty(difficulty);
    filterPatterns(searchQuery, difficulty);
  };

  const filterPatterns = (query: string, difficulty: string) => {
    let filtered = patterns;

    if (query.trim()) {
      filtered = searchPatterns(query);
    }

    if (difficulty !== 'All') {
      filtered = filtered.filter(pattern => pattern.difficulty === difficulty);
    }

    setFilteredPatterns(filtered);
  };

  const getStatusIcon = (status: PatternStatus) => {
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

  const renderPatternItem = ({ item }: { item: Pattern }) => (
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
          <Text style={styles.statusIcon}>{getStatusIcon('known')}</Text>
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
      </View>

      <View style={styles.patternTags}>
        {item.tags.slice(0, 3).map((tag, index) => (
          <View key={index} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      <View style={styles.patternActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Mark as Known</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Want to Learn</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

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
      </View>

      <FlatList
        data={filteredPatterns}
        renderItem={renderPatternItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
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
    fontSize: 16,
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
  actionButtonText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
});
