/**
 * Example usage of the enhanced semantic search capabilities
 * This file demonstrates the new features and how to use them
 */

import { UserSearchService, PatternIntelligenceService } from '../services';
import { enhancedPatternSearch, getRecommendedPatterns } from '../data/patterns';

// Example 1: Enhanced User Search with Semantic Matching
export async function exampleEnhancedUserSearch() {
  const currentUserId = 'user123';
  const query = 'bay area intermediate passing';

  try {
    // Use the new enhanced search
    const results = await UserSearchService.enhancedSearch(query, currentUserId, {
      fuzzyMatch: true,
      includePatterns: true,
      includeBio: true,
      includeLocation: true,
      maxDistance: 0.6,
      experienceRange: ['Intermediate', 'Advanced']
    });

    console.log('Enhanced search results:');
    results.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (Score: ${user.searchScore.toFixed(2)})`);
      console.log(`   Matched fields: ${user.matchedFields.join(', ')}`);
      console.log(`   Can teach you: ${user.teachingOpportunities.join(', ')}`);
      console.log(`   You can teach: ${user.learningOpportunities.join(', ')}`);
      console.log(`   Shared patterns: ${user.sharedPatterns.join(', ')}`);
      console.log('');
    });

    return results;
  } catch (error) {
    console.error('Enhanced search failed:', error);
    
    // Fallback to basic search
    const basicResults = await UserSearchService.searchUsersByName(query, currentUserId);
    console.log('Using basic search fallback:', basicResults.length, 'results');
    return basicResults;
  }
}

// Example 2: Semantic Pattern Search
export function examplePatternSearch() {
  const query = 'double spin clubs';

  console.log('Searching for patterns with query:', query);

  // Use enhanced pattern search
  const results = enhancedPatternSearch(query, {
    fuzzyMatch: true,
    includePrerequisites: true,
    includeSimilar: true,
    maxResults: 10,
    sortBy: 'relevance'
  });

  console.log(`Found ${results.length} patterns:`);
  results.forEach((pattern, index) => {
    console.log(`${index + 1}. ${pattern.name} (Score: ${pattern.searchScore.toFixed(2)})`);
    console.log(`   Difficulty: ${pattern.difficulty}`);
    console.log(`   Matched fields: ${pattern.matchedFields.join(', ')}`);
    console.log(`   Prerequisites: ${pattern.prerequisiteChain?.join(' → ') || 'None'}`);
    console.log(`   Similar patterns: ${pattern.similarPatterns?.join(', ') || 'None'}`);
    console.log('');
  });

  return results;
}

// Example 3: Personalized Learning Path Generation
export function exampleLearningPath() {
  const userProfile = {
    id: 'user123',
    name: 'Alice',
    email: 'alice@example.com',
    experience: 'Intermediate' as const,
    preferredProps: ['clubs'],
    knownPatterns: ['6 Count', 'Walking Pass'],
    wantToLearnPatterns: ['Custom Double Spin', 'Chocolate Bar'],
    lastActive: '1 hour ago',
    location: 'San Francisco, CA',
    bio: 'Love learning new patterns!'
  };

  const targetPattern = 'Custom Double Spin';
  
  console.log(`Generating learning path for ${userProfile.name} to learn ${targetPattern}:`);

  const learningPath = PatternIntelligenceService.generateLearningPath(
    userProfile,
    targetPattern,
    'comprehensive'
  );

  console.log(`\nLearning Path: ${learningPath.description}`);
  console.log(`Estimated time: ${learningPath.estimatedTimeWeeks} weeks`);
  console.log('\nSteps:');

  learningPath.steps.forEach((step, index) => {
    const difficultyIcon = {
      'easy': '🟢',
      'moderate': '🟡',
      'challenging': '🔴'
    }[step.difficulty];

    console.log(`${index + 1}. ${step.pattern.name} ${difficultyIcon}`);
    console.log(`   ${step.reason}`);
    console.log(`   Prerequisites met: ${step.prerequisitesMet ? '✅' : '❌'}`);
    console.log(`   Difficulty: ${step.difficulty}`);
    console.log('');
  });

  return learningPath;
}

// Example 4: Smart Pattern Recommendations
export function exampleSmartRecommendations() {
  const userProfile = {
    id: 'user456',
    name: 'Bob',
    email: 'bob@example.com',
    experience: 'Beginner' as const,
    preferredProps: ['clubs'],
    knownPatterns: ['6 Count'],
    wantToLearnPatterns: ['Walking Pass'],
    lastActive: '2 hours ago',
    location: 'Berkeley, CA',
    bio: 'New to juggling but very enthusiastic!'
  };

  console.log(`Getting smart recommendations for ${userProfile.name}:`);

  const recommendations = PatternIntelligenceService.getSmartRecommendations(
    userProfile,
    5
  );

  console.log(`\nRecommended patterns for ${userProfile.name}:`);
  recommendations.forEach((pattern, index) => {
    console.log(`${index + 1}. ${pattern.name}`);
    console.log(`   Difficulty: ${pattern.difficulty}`);
    console.log(`   Reason: ${pattern.matchedFields.slice(-1)[0]}`); // Last field is the reason
    console.log(`   Prerequisites: ${pattern.prerequisiteChain?.join(' → ') || 'None'}`);
    console.log('');
  });

  return recommendations;
}

// Example 5: Pattern Mentor Finding
export async function exampleFindMentors() {
  const patternName = 'Custom Double Spin';
  const currentUserId = 'user123';
  
  // Mock user data for demonstration
  const allUsers = [
    {
      id: 'mentor1',
      name: 'Expert Peter',
      email: 'peter@example.com',
      experience: 'Advanced' as const,
      preferredProps: ['clubs'],
      knownPatterns: ['6 Count', 'Walking Pass', '645', 'Custom Double Spin', 'Chocolate Bar'],
      wantToLearnPatterns: ['Madison Marmosets'],
      lastActive: '30 minutes ago',
      location: 'San Francisco, CA',
      bio: 'Love teaching new patterns!'
    },
    {
      id: 'mentor2',
      name: 'Intermediate Sarah',
      email: 'sarah@example.com',
      experience: 'Intermediate' as const,
      preferredProps: ['clubs'],
      knownPatterns: ['6 Count', 'Walking Pass', 'Custom Double Spin'],
      wantToLearnPatterns: ['645'],
      lastActive: '1 hour ago',
      location: 'Oakland, CA',
      bio: 'Happy to help beginners!'
    }
  ];

  console.log(`Finding mentors for ${patternName}:`);

  const mentors = await PatternIntelligenceService.findPatternMentors(
    patternName,
    currentUserId,
    allUsers
  );

  console.log(`\nFound ${mentors.length} potential mentors:`);
  mentors.forEach((mentor, index) => {
    console.log(`${index + 1}. ${mentor.name} (${mentor.experience})`);
    console.log(`   Location: ${mentor.location}`);
    console.log(`   Known patterns: ${mentor.knownPatterns.length}`);
    console.log(`   Bio: ${mentor.bio}`);
    console.log('');
  });

  return mentors;
}

// Example 6: Pattern Clustering
export function examplePatternClusters() {
  console.log('Pattern clusters for organized learning:');

  const clusters = PatternIntelligenceService.getPatternClusters();

  Object.entries(clusters).forEach(([clusterName, patterns]) => {
    console.log(`\n${clusterName}:`);
    patterns.forEach(pattern => {
      console.log(`  • ${pattern}`);
    });
  });

  return clusters;
}

// Demo function to run all examples
export async function runAllExamples() {
  console.log('=== PatternPals Enhanced Search Demo ===\n');

  try {
    console.log('1. Enhanced User Search');
    console.log('========================');
    await exampleEnhancedUserSearch();

    console.log('\n2. Semantic Pattern Search');
    console.log('===========================');
    examplePatternSearch();

    console.log('\n3. Personalized Learning Path');
    console.log('==============================');
    exampleLearningPath();

    console.log('\n4. Smart Recommendations');
    console.log('=========================');
    exampleSmartRecommendations();

    console.log('\n5. Pattern Mentors');
    console.log('==================');
    await exampleFindMentors();

    console.log('\n6. Pattern Clusters');
    console.log('===================');
    examplePatternClusters();

    console.log('\n=== Demo Complete ===');
  } catch (error) {
    console.error('Demo error:', error);
  }
}
