import { patterns, getRecommendedPatterns, EnhancedPatternResult } from '../data/patterns';
import { UserProfile } from './userSearch';
import { Pattern } from '../types';

export interface SearchAnalytics {
  totalSearches: number;
  popularQueries: { query: string; count: number }[];
  searchSuccess: number; // percentage of searches that returned results
}

export interface LearningPathStep {
  pattern: Pattern;
  reason: string;
  prerequisitesMet: boolean;
  difficulty: 'easy' | 'moderate' | 'challenging';
}

export interface LearningPath {
  steps: LearningPathStep[];
  estimatedTimeWeeks: number;
  description: string;
}

/**
 * Enhanced Pattern Intelligence Service
 * Provides smart recommendations, learning paths, and search analytics
 */
export class PatternIntelligenceService {
  private static ANALYTICS_KEY = 'pattern_search_analytics';
  private static USER_PREFERENCES_KEY = 'user_pattern_preferences';

  /**
   * Generate a personalized learning path for a user
   */
  static generateLearningPath(
    userProfile: UserProfile,
    targetPattern: string,
    timeframe: 'fast' | 'moderate' | 'comprehensive' = 'moderate'
  ): LearningPath {
    const target = patterns.find(p => p.name === targetPattern);
    if (!target) {
      return {
        steps: [],
        estimatedTimeWeeks: 0,
        description: 'Pattern not found'
      };
    }

    const knownSet = new Set(userProfile.knownPatterns);
    const steps: LearningPathStep[] = [];
    const visited = new Set<string>();

    // Build prerequisite chain
    const buildPath = (pattern: Pattern) => {
      if (visited.has(pattern.id) || knownSet.has(pattern.name)) return;
      visited.add(pattern.id);

      // Add prerequisites first
      for (const prereqId of pattern.prerequisites) {
        const prereq = patterns.find(p => p.id === prereqId);
        if (prereq && !knownSet.has(prereq.name)) {
          buildPath(prereq);
        }
      }

      // Add current pattern
      const prerequisitesMet = pattern.prerequisites.every(prereqId => {
        const prereq = patterns.find(p => p.id === prereqId);
        return prereq ? knownSet.has(prereq.name) : false;
      });

      const difficulty = this.calculateStepDifficulty(pattern, userProfile);
      const reason = this.generateStepReason(pattern, userProfile);

      steps.push({
        pattern,
        reason,
        prerequisitesMet,
        difficulty
      });

      // Mark as "known" for subsequent prerequisite checks
      knownSet.add(pattern.name);
    };

    buildPath(target);

    // Add recommended practice patterns for reinforcement
    if (timeframe === 'comprehensive') {
      const reinforcementPatterns = this.getReinforcementPatterns(target, userProfile);
      for (const pattern of reinforcementPatterns) {
        if (!visited.has(pattern.id)) {
          steps.push({
            pattern,
            reason: 'Reinforces skills from ' + target.name,
            prerequisitesMet: true,
            difficulty: 'easy'
          });
        }
      }
    }

    const estimatedTime = this.calculateLearningTime(steps, timeframe);
    const description = this.generatePathDescription(target, steps.length, timeframe);

    return {
      steps,
      estimatedTimeWeeks: estimatedTime,
      description
    };
  }

  /**
   * Get smart pattern recommendations based on user's current progress
   */
  static getSmartRecommendations(
    userProfile: UserProfile,
    count: number = 5
  ): EnhancedPatternResult[] {
    const recommendations = getRecommendedPatterns(
      userProfile.knownPatterns,
      userProfile.wantToLearnPatterns,
      userProfile.experience
    );

    // Add contextual information to recommendations
    return recommendations.slice(0, count).map(pattern => ({
      ...pattern,
      matchedFields: [...pattern.matchedFields, this.getRecommendationReason(pattern, userProfile)]
    }));
  }

  /**
   * Find users who could help teach a specific pattern
   */
  static async findPatternMentors(
    patternName: string,
    currentUserId: string,
    allUsers: UserProfile[]
  ): Promise<UserProfile[]> {
    const mentors = allUsers.filter(user => 
      user.id !== currentUserId && 
      user.knownPatterns.includes(patternName)
    );

    // Sort by teaching capability (experience + number of patterns known)
    return mentors.sort((a, b) => {
      const aScore = this.calculateTeachingScore(a);
      const bScore = this.calculateTeachingScore(b);
      return bScore - aScore;
    });
  }

  /**
   * Find patterns that are commonly learned together
   */
  static getPatternClusters(): { [key: string]: string[] } {
    const clusters: { [key: string]: string[] } = {};

    // Group patterns by shared characteristics
    const beginner = patterns.filter(p => p.difficulty === 'Beginner').map(p => p.name);
    const clubsPatterns = patterns.filter(p => p.props.includes('clubs')).map(p => p.name);
    const passingBasics = patterns.filter(p => 
      p.tags.includes('basic') && p.requiredJugglers === 2
    ).map(p => p.name);

    clusters['Beginner Essentials'] = beginner.slice(0, 5);
    clusters['Club Passing'] = clubsPatterns.slice(0, 8);
    clusters['Two-Person Basics'] = passingBasics.slice(0, 6);

    // Find patterns with shared prerequisites
    const advancedPatterns = patterns.filter(p => 
      p.difficulty === 'Advanced' && p.prerequisites.length > 0
    );
    
    if (advancedPatterns.length > 0) {
      clusters['Advanced Techniques'] = advancedPatterns.slice(0, 5).map(p => p.name);
    }

    return clusters;
  }

  /**
   * Analyze search performance and user behavior
   */
  static async recordSearchQuery(query: string, resultCount: number): Promise<void> {
    try {
      const analytics = await this.getAnalytics();
      
      analytics.totalSearches++;
      
      // Update popular queries
      const existingQuery = analytics.popularQueries.find(q => q.query === query.toLowerCase());
      if (existingQuery) {
        existingQuery.count++;
      } else {
        analytics.popularQueries.push({ query: query.toLowerCase(), count: 1 });
      }

      // Sort popular queries
      analytics.popularQueries.sort((a, b) => b.count - a.count);
      analytics.popularQueries = analytics.popularQueries.slice(0, 20); // Keep top 20

      // Update success rate
      const successfulSearch = resultCount > 0 ? 1 : 0;
      analytics.searchSuccess = (analytics.searchSuccess * (analytics.totalSearches - 1) + successfulSearch) / analytics.totalSearches;

      await this.saveAnalytics(analytics);
    } catch (error) {
      console.error('Error recording search query:', error);
    }
  }

  /**
   * Get search analytics for insights
   */
  static async getSearchInsights(): Promise<SearchAnalytics> {
    return await this.getAnalytics();
  }

  // Private helper methods

  private static calculateStepDifficulty(
    pattern: Pattern, 
    userProfile: UserProfile
  ): 'easy' | 'moderate' | 'challenging' {
    const experienceLevels = ['Beginner', 'Intermediate', 'Advanced'];
    const userLevel = experienceLevels.indexOf(userProfile.experience);
    const patternLevel = experienceLevels.indexOf(pattern.difficulty);

    if (patternLevel <= userLevel) return 'easy';
    if (patternLevel === userLevel + 1) return 'moderate';
    return 'challenging';
  }

  private static generateStepReason(pattern: Pattern, userProfile: UserProfile): string {
    if (pattern.prerequisites.length === 0) {
      return 'Foundation pattern - no prerequisites required';
    }

    const prereqPatterns = pattern.prerequisites
      .map(id => patterns.find(p => p.id === id)?.name)
      .filter(Boolean);

    if (prereqPatterns.length === 1) {
      return `Builds on ${prereqPatterns[0]}`;
    }

    return `Combines skills from ${prereqPatterns.slice(0, 2).join(' and ')}${prereqPatterns.length > 2 ? ' and others' : ''}`;
  }

  private static getReinforcementPatterns(target: Pattern, userProfile: UserProfile): Pattern[] {
    return patterns.filter(p => 
      p.id !== target.id &&
      p.difficulty === target.difficulty &&
      p.props.some(prop => target.props.includes(prop)) &&
      !userProfile.knownPatterns.includes(p.name)
    ).slice(0, 2);
  }

  private static calculateLearningTime(steps: LearningPathStep[], timeframe: string): number {
    let baseTime = steps.length * 1.5; // 1.5 weeks per pattern on average

    switch (timeframe) {
      case 'fast':
        return Math.max(1, Math.round(baseTime * 0.7));
      case 'comprehensive':
        return Math.round(baseTime * 1.5);
      default: // moderate
        return Math.round(baseTime);
    }
  }

  private static generatePathDescription(target: Pattern, stepCount: number, timeframe: string): string {
    const intensity = timeframe === 'fast' ? 'intensive' : timeframe === 'comprehensive' ? 'thorough' : 'balanced';
    return `${intensity.charAt(0).toUpperCase() + intensity.slice(1)} learning path to master ${target.name} in ${stepCount} steps`;
  }

  private static getRecommendationReason(pattern: EnhancedPatternResult, userProfile: UserProfile): string {
    if (pattern.prerequisiteChain && pattern.prerequisiteChain.length === 0) {
      return 'Ready to learn - no prerequisites needed';
    }
    
    if (pattern.difficulty === userProfile.experience) {
      return 'Perfect match for your experience level';
    }

    const sharedProps = pattern.props.filter(prop => 
      userProfile.preferredProps && userProfile.preferredProps.includes(prop)
    );
    
    if (sharedProps.length > 0) {
      return `Uses your preferred props: ${sharedProps.join(', ')}`;
    }

    return 'Recommended based on your learning progress';
  }

  private static calculateTeachingScore(user: UserProfile): number {
    const experienceWeight = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
    const expScore = experienceWeight[user.experience] || 1;
    const patternCount = user.knownPatterns.length;
    
    return expScore * 10 + patternCount;
  }

  private static async getAnalytics(): Promise<SearchAnalytics> {
    try {
      const stored = localStorage.getItem(this.ANALYTICS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }

    return {
      totalSearches: 0,
      popularQueries: [],
      searchSuccess: 0
    };
  }

  private static async saveAnalytics(analytics: SearchAnalytics): Promise<void> {
    try {
      localStorage.setItem(this.ANALYTICS_KEY, JSON.stringify(analytics));
    } catch (error) {
      console.error('Error saving analytics:', error);
    }
  }
}
