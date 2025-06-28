import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
// Import patterns for semantic understanding
import { patterns, getPatternById } from '../data/patterns';

export interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
  experience: 'Beginner' | 'Intermediate' | 'Advanced';
  preferredProps: string[];
  location?: string;
  lastActive: string;
  bio?: string;
  knownPatterns: string[];
  wantToLearnPatterns: string[];
}

// Add new interfaces for enhanced search
export interface SearchOptions {
  fuzzyMatch?: boolean;
  includePatterns?: boolean;
  includeBio?: boolean;
  includeLocation?: boolean;
  maxDistance?: number;
  experienceRange?: ('Beginner' | 'Intermediate' | 'Advanced')[];
}

export interface EnhancedSearchResult extends UserProfile {
  searchScore: number;
  matchedFields: string[];
  teachingOpportunities: string[];
  learningOpportunities: string[];
  sharedPatterns: string[];
}

export class UserSearchService {
  private static USERS_KEY = 'all_users';
  private static USE_SUPABASE = true; // Enable Supabase backend (will fallback to local if not configured)

  /**
   * Check if Supabase is properly configured
   */
  private static isSupabaseConfigured(): boolean {
    return isSupabaseConfigured() === true;
  }

  /**
   * Get all users in the system (excluding current user)
   */
  static async getAllUsers(currentUserId: string): Promise<UserProfile[]> {
    try {
      console.log(`UserSearchService: getAllUsers called for user ${currentUserId}`);
      
      if (this.USE_SUPABASE && this.isSupabaseConfigured() && supabase) {
        console.log('UserSearchService: Using Supabase backend');
        // Use Supabase for real backend
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .neq('id', currentUserId)
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('Supabase error getting users:', error);
          console.log('UserSearchService: Falling back to local storage due to Supabase error');
          return this.getAllUsersLocal(currentUserId);
        }

        const users = data.map((user: any) => ({
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          experience: user.experience,
          preferredProps: user.preferred_props || [],
          location: user.location,
          lastActive: this.formatLastActive(user.updated_at),
          bio: user.bio || '',
          knownPatterns: user.known_patterns || [],
          wantToLearnPatterns: user.want_to_learn_patterns || [],
        }));

        console.log(`UserSearchService: Loaded ${users.length} users from Supabase`);
        return users;
      } else {
        // Fallback to AsyncStorage for development/testing
        console.log('UserSearchService: Using local storage for getting users (Supabase not configured or disabled)');
        const localUsers = await this.getAllUsersLocal(currentUserId);
        console.log(`UserSearchService: getAllUsers returning ${localUsers.length} users from local storage`);
        return localUsers;
      }
    } catch (error) {
      console.error('Error getting all users:', error);
      console.log('UserSearchService: Falling back to local storage due to error');
      const fallbackUsers = await this.getAllUsersLocal(currentUserId);
      console.log(`UserSearchService: Error fallback returning ${fallbackUsers.length} users`);
      return fallbackUsers;
    }
  }

  /**
   * Get users from local storage (fallback)
   */
  private static async getAllUsersLocal(currentUserId: string): Promise<UserProfile[]> {
    try {
      console.log(`UserSearchService: Getting users from local storage, excluding user ${currentUserId}`);
      const stored = await AsyncStorage.getItem(this.USERS_KEY);
      console.log(`UserSearchService: Raw stored data:`, stored ? `exists (${stored.length} chars)` : 'null');
      
      if (stored) {
        const users = JSON.parse(stored);
        console.log(`UserSearchService: Parsed ${users.length} users from storage:`);
        users.forEach((user: UserProfile, index: number) => {
          console.log(`  ${index + 1}. ${user.name} (${user.id})`);
        });
        
        const filteredUsers = users.filter((user: UserProfile) => user.id !== currentUserId);
        console.log(`UserSearchService: After filtering current user ${currentUserId}, ${filteredUsers.length} users remain:`);
        filteredUsers.forEach((user: UserProfile, index: number) => {
          console.log(`  ${index + 1}. ${user.name} (${user.id})`);
        });
        return filteredUsers;
      }

      // Return demo users if no stored data
      console.log('UserSearchService: No stored users found, returning demo users');
      const demoUsers = this.getDemoUsers().filter(user => user.id !== currentUserId);
      console.log(`UserSearchService: Returning ${demoUsers.length} demo users:`);
      demoUsers.forEach((user: UserProfile, index: number) => {
        console.log(`  ${index + 1}. ${user.name} (${user.id})`);
      });
      return demoUsers;
    } catch (error) {
      console.error('Error getting users from local storage:', error);
      const demoUsers = this.getDemoUsers().filter(user => user.id !== currentUserId);
      console.log(`UserSearchService: Error fallback - returning ${demoUsers.length} demo users`);
      return demoUsers;
    }
  }

  /**
   * Format last active timestamp
   */
  private static formatLastActive(timestamp: string): string {
    const now = new Date();
    const updated = new Date(timestamp);
    const diffMs = now.getTime() - updated.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    return updated.toLocaleDateString();
  }

  /**
   * Search users by name
   */
  static async searchUsersByName(query: string, currentUserId: string): Promise<UserProfile[]> {
    try {
      const allUsers = await this.getAllUsers(currentUserId);
      const lowercaseQuery = query.toLowerCase().trim();
      
      if (!lowercaseQuery) {
        return allUsers;
      }

      return allUsers.filter(user =>
        user.name.toLowerCase().includes(lowercaseQuery)
      );
    } catch (error) {
      console.error('Error searching users by name:', error);
      return [];
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<UserProfile | null> {
    try {
      const allUsers = await this.getAllUsers('');
      return allUsers.find(user => user.id === userId) || null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  /**
   * Add or update a user in the system
   */
  static async addOrUpdateUser(user: UserProfile): Promise<boolean> {
    try {
      if (this.USE_SUPABASE && this.isSupabaseConfigured() && supabase) {
        // Use Supabase for real backend
        const { error } = await supabase
          .from('users')
          .upsert({
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            experience: user.experience,
            preferred_props: user.preferredProps,
            location: user.location,
            bio: user.bio,
            known_patterns: user.knownPatterns,
            want_to_learn_patterns: user.wantToLearnPatterns,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          });

        if (error) {
          console.error('Supabase error adding/updating user:', error);
          console.log('UserSearchService: Falling back to local storage due to Supabase error');
          return this.addOrUpdateUserLocal(user);
        }

        console.log(`UserSearchService: Successfully saved user ${user.name} to Supabase`);
        return true;
      } else {
        // Fallback to AsyncStorage for development/testing
        console.log('UserSearchService: Using local storage for saving user (Supabase not configured or disabled)');
        return this.addOrUpdateUserLocal(user);
      }
    } catch (error) {
      console.error('Error adding/updating user:', error);
      console.log('UserSearchService: Falling back to local storage due to error');
      return this.addOrUpdateUserLocal(user);
    }
  }

  /**
   * Add or update user locally (fallback)
   */
  private static async addOrUpdateUserLocal(user: UserProfile): Promise<boolean> {
    try {
      console.log(`UserSearchService: Adding/updating user ${user.name} (${user.id}) locally`);
      
      const existingUsers = await this.getAllUsersLocal('');  // Get all users, don't filter by current user
      console.log(`UserSearchService: Found ${existingUsers.length} existing users before adding/updating`);
      
      const userIndex = existingUsers.findIndex(u => u.id === user.id);
      
      if (userIndex >= 0) {
        console.log(`UserSearchService: Updating existing user at index ${userIndex}`);
        existingUsers[userIndex] = user;
      } else {
        console.log(`UserSearchService: Adding new user (total will be ${existingUsers.length + 1})`);
        existingUsers.push(user);
      }

      const dataToStore = JSON.stringify(existingUsers);
      console.log(`UserSearchService: Storing ${existingUsers.length} users to key '${this.USERS_KEY}' (${dataToStore.length} chars)`);
      
      await AsyncStorage.setItem(this.USERS_KEY, dataToStore);
      
      // Verify the storage worked
      const verification = await AsyncStorage.getItem(this.USERS_KEY);
      console.log(`UserSearchService: Verification - stored data ${verification ? 'exists' : 'is null'} (${verification?.length || 0} chars)`);
      
      return true;
    } catch (error) {
      console.error('UserSearchService: Error adding/updating user locally:', error);
      return false;
    }
  }

  /**
   * Calculate compatibility score between users based on patterns
   */
  static calculateCompatibilityScore(user1: UserProfile, user2: UserProfile): number {
    const user1Known = new Set(user1.knownPatterns);
    const user1WantToLearn = new Set(user1.wantToLearnPatterns);
    const user2Known = new Set(user2.knownPatterns);
    const user2WantToLearn = new Set(user2.wantToLearnPatterns);

    // Shared patterns both know
    const sharedKnown = [...user1Known].filter(pattern => user2Known.has(pattern));
    
    // Teaching opportunities (user1 knows what user2 wants to learn)
    const user1CanTeachUser2 = [...user1Known].filter(pattern => user2WantToLearn.has(pattern));
    
    // Learning opportunities (user2 knows what user1 wants to learn)
    const user2CanTeachUser1 = [...user2Known].filter(pattern => user1WantToLearn.has(pattern));

    // Base score from shared patterns
    let score = sharedKnown.length * 15;
    
    // Bonus for teaching opportunities (mutual learning)
    score += (user1CanTeachUser2.length + user2CanTeachUser1.length) * 10;
    
    // Experience level compatibility bonus
    const experienceLevels = ['Beginner', 'Intermediate', 'Advanced'];
    const user1Level = experienceLevels.indexOf(user1.experience);
    const user2Level = experienceLevels.indexOf(user2.experience);
    const levelDiff = Math.abs(user1Level - user2Level);
    
    if (levelDiff === 0) score += 20; // Same level
    else if (levelDiff === 1) score += 10; // Adjacent levels
    // No bonus for 2+ level difference

    // Cap the score at 100
    return Math.min(score, 100);
  }

  /**
   * Enhanced semantic search with fuzzy matching and multi-field support
   */
  static async enhancedSearch(
    query: string, 
    currentUserId: string, 
    options: SearchOptions = {}
  ): Promise<EnhancedSearchResult[]> {
    try {
      const {
        fuzzyMatch = true,
        includePatterns = true,
        includeBio = true,
        includeLocation = true,
        maxDistance = 0.6,
        experienceRange = ['Beginner', 'Intermediate', 'Advanced']
      } = options;

      const allUsers = await this.getAllUsers(currentUserId);
      const currentUser = await this.getCurrentUserProfile(currentUserId);
      
      if (!query.trim()) {
        return this.convertToEnhancedResults(allUsers, currentUser);
      }

      const results: EnhancedSearchResult[] = [];
      const queryLower = query.toLowerCase().trim();
      const queryWords = queryLower.split(/\s+/);

      for (const user of allUsers) {
        if (!experienceRange.includes(user.experience)) continue;

        let searchScore = 0;
        const matchedFields: string[] = [];
        
        // Name matching (highest weight)
        const nameScore = this.calculateFieldScore(user.name, queryWords, fuzzyMatch, maxDistance);
        if (nameScore > 0) {
          searchScore += nameScore * 3;
          matchedFields.push('name');
        }

        // Bio matching
        if (includeBio && user.bio) {
          const bioScore = this.calculateFieldScore(user.bio, queryWords, fuzzyMatch, maxDistance);
          if (bioScore > 0) {
            searchScore += bioScore * 1.5;
            matchedFields.push('bio');
          }
        }

        // Location matching
        if (includeLocation && user.location) {
          const locationScore = this.calculateFieldScore(user.location, queryWords, fuzzyMatch, maxDistance);
          if (locationScore > 0) {
            searchScore += locationScore * 1.2;
            matchedFields.push('location');
          }
        }

        // Pattern matching
        if (includePatterns) {
          const patternScore = this.calculatePatternMatchingScore(user, queryWords, fuzzyMatch, maxDistance);
          if (patternScore > 0) {
            searchScore += patternScore;
            matchedFields.push('patterns');
          }
        }

        if (searchScore > 0) {
          const compatibility = this.calculateEnhancedCompatibilityScore(currentUser, user);
          const teachingOps = this.findTeachingOpportunities(currentUser, user);
          const learningOps = this.findLearningOpportunities(currentUser, user);
          const sharedPatterns = this.findSharedPatterns(currentUser, user);

          results.push({
            ...user,
            searchScore: searchScore + (compatibility * 0.1), // Slight compatibility boost
            matchedFields,
            teachingOpportunities: teachingOps,
            learningOpportunities: learningOps,
            sharedPatterns
          });
        }
      }

      // Sort by search relevance then compatibility
      return results.sort((a, b) => b.searchScore - a.searchScore);
    } catch (error) {
      console.error('Error in enhanced search:', error);
      return [];
    }
  }

  /**
   * Calculate field matching score with fuzzy matching support
   */
  private static calculateFieldScore(
    fieldValue: string, 
    queryWords: string[], 
    fuzzyMatch: boolean, 
    maxDistance: number
  ): number {
    if (!fieldValue) return 0;

    const fieldLower = fieldValue.toLowerCase();
    let score = 0;

    for (const word of queryWords) {
      if (fieldLower.includes(word)) {
        // Exact substring match gets full score
        score += 1;
      } else if (fuzzyMatch) {
        // Fuzzy matching for typos and variations
        const fuzzyScore = this.calculateFuzzyMatch(fieldLower, word, maxDistance);
        score += fuzzyScore;
      }
    }

    return score / queryWords.length; // Normalize by number of query words
  }

  /**
   * Calculate pattern matching score with semantic understanding
   */
  private static calculatePatternMatchingScore(
    user: UserProfile, 
    queryWords: string[], 
    fuzzyMatch: boolean, 
    maxDistance: number
  ): number {
    let score = 0;
    const allUserPatterns = [...user.knownPatterns, ...user.wantToLearnPatterns];

    for (const patternName of allUserPatterns) {
      const patternScore = this.calculateFieldScore(patternName, queryWords, fuzzyMatch, maxDistance);
      if (patternScore > 0) {
        // Boost score for known patterns vs want-to-learn
        const isKnown = user.knownPatterns.includes(patternName);
        score += patternScore * (isKnown ? 1.5 : 1.0);
      }

      // Check pattern metadata for semantic matches
      const pattern = patterns.find(p => p.name === patternName);
      if (pattern) {
        // Match against tags
        for (const tag of pattern.tags) {
          const tagScore = this.calculateFieldScore(tag, queryWords, fuzzyMatch, maxDistance);
          score += tagScore * 0.5;
        }

        // Match against description
        const descScore = this.calculateFieldScore(pattern.description, queryWords, fuzzyMatch, maxDistance);
        score += descScore * 0.3;
      }
    }

    return score;
  }

  /**
   * Simple fuzzy matching using Levenshtein distance
   */
  private static calculateFuzzyMatch(text: string, word: string, maxDistance: number): number {
    // Check if word appears anywhere in text with some tolerance
    const words = text.split(/\s+/);
    let bestScore = 0;

    for (const textWord of words) {
      const distance = this.levenshteinDistance(textWord, word);
      const maxLen = Math.max(textWord.length, word.length);
      const similarity = 1 - (distance / maxLen);
      
      if (similarity >= maxDistance) {
        bestScore = Math.max(bestScore, similarity);
      }
    }

    return bestScore;
  }

  /**
   * Calculate Levenshtein distance for fuzzy matching
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Enhanced compatibility scoring with pattern relationship awareness
   */
  private static calculateEnhancedCompatibilityScore(user1: UserProfile | null, user2: UserProfile): number {
    if (!user1) return 0;

    const user1Known = new Set(user1.knownPatterns);
    const user1WantToLearn = new Set(user1.wantToLearnPatterns);
    const user2Known = new Set(user2.knownPatterns);
    const user2WantToLearn = new Set(user2.wantToLearnPatterns);

    let score = 0;

    // Shared patterns (practicing together)
    const sharedKnown = [...user1Known].filter(pattern => user2Known.has(pattern));
    score += sharedKnown.length * 20; // Higher weight for shared patterns

    // Teaching opportunities with difficulty progression awareness
    const user1CanTeach = [...user1Known].filter(pattern => user2WantToLearn.has(pattern));
    const user2CanTeach = [...user2Known].filter(pattern => user1WantToLearn.has(pattern));
    
    // Weight teaching opportunities by pattern difficulty and prerequisites
    for (const patternName of user1CanTeach) {
      const pattern = patterns.find(p => p.name === patternName);
      const weight = this.getPatternTeachingWeight(pattern);
      score += 15 * weight;
    }

    for (const patternName of user2CanTeach) {
      const pattern = patterns.find(p => p.name === patternName);
      const weight = this.getPatternTeachingWeight(pattern);
      score += 15 * weight;
    }

    // Experience level synergy
    const experienceLevels = ['Beginner', 'Intermediate', 'Advanced'];
    const user1Level = experienceLevels.indexOf(user1.experience);
    const user2Level = experienceLevels.indexOf(user2.experience);
    const levelDiff = Math.abs(user1Level - user2Level);
    
    if (levelDiff === 0) score += 25; // Same level - great for peer learning
    else if (levelDiff === 1) score += 15; // One level apart - good mentor/student dynamic
    else score += 5; // Two levels apart - still valuable but less ideal

    // Prop compatibility bonus
    const user1Props = new Set(user1.preferredProps || []);
    const user2Props = new Set(user2.preferredProps || []);
    const sharedProps = [...user1Props].filter(prop => user2Props.has(prop));
    score += sharedProps.length * 10;

    return Math.min(score, 100);
  }

  /**
   * Calculate teaching weight based on pattern complexity and prerequisites
   */
  private static getPatternTeachingWeight(pattern: any): number {
    if (!pattern) return 1;

    let weight = 1;

    // More complex patterns are more valuable to teach
    switch (pattern.difficulty) {
      case 'Advanced': weight *= 1.5; break;
      case 'Intermediate': weight *= 1.2; break;
      case 'Beginner': weight *= 1.0; break;
    }

    // Patterns with prerequisites are more valuable
    if (pattern.prerequisites && pattern.prerequisites.length > 0) {
      weight *= 1.3;
    }

    // Popular/highly rated patterns are more valuable
    if (pattern.communityRating && pattern.communityRating >= 4.0) {
      weight *= 1.2;
    }

    return weight;
  }

  /**
   * Find teaching opportunities between users
   */
  private static findTeachingOpportunities(user1: UserProfile | null, user2: UserProfile): string[] {
    if (!user1) return [];
    
    const user1Known = new Set(user1.knownPatterns);
    const user2WantToLearn = new Set(user2.wantToLearnPatterns);
    
    return [...user1Known].filter(pattern => user2WantToLearn.has(pattern));
  }

  /**
   * Find learning opportunities between users
   */
  private static findLearningOpportunities(user1: UserProfile | null, user2: UserProfile): string[] {
    if (!user1) return [];
    
    const user1WantToLearn = new Set(user1.wantToLearnPatterns);
    const user2Known = new Set(user2.knownPatterns);
    
    return [...user2Known].filter(pattern => user1WantToLearn.has(pattern));
  }

  /**
   * Find shared patterns between users
   */
  private static findSharedPatterns(user1: UserProfile | null, user2: UserProfile): string[] {
    if (!user1) return [];
    
    const user1Known = new Set(user1.knownPatterns);
    const user2Known = new Set(user2.knownPatterns);
    
    return [...user1Known].filter(pattern => user2Known.has(pattern));
  }

  /**
   * Convert regular user profiles to enhanced search results
   */
  private static convertToEnhancedResults(users: UserProfile[], currentUser: UserProfile | null): EnhancedSearchResult[] {
    return users.map(user => ({
      ...user,
      searchScore: 0,
      matchedFields: [],
      teachingOpportunities: this.findTeachingOpportunities(currentUser, user),
      learningOpportunities: this.findLearningOpportunities(currentUser, user),
      sharedPatterns: this.findSharedPatterns(currentUser, user)
    }));
  }

  /**
   * Get current user profile for comparison
   */
  private static async getCurrentUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      // This would typically fetch from your auth/profile service
      const allUsers = await this.getAllUsers('');
      return allUsers.find(user => user.id === userId) || null;
    } catch (error) {
      console.error('Error getting current user profile:', error);
      return null;
    }
  }

  /**
   * Get demo users for testing
   */
  private static getDemoUsers(): UserProfile[] {
    return [
      {
        id: 'peter_caseman',
        name: 'Peter Caseman',
        experience: 'Advanced',
        preferredProps: ['clubs', 'balls'],
        location: 'Berkeley, CA',
        lastActive: '1 hour ago',
        bio: 'Passionate juggler and passing pattern inventor. Love teaching and learning new patterns!',
        knownPatterns: ['6 Count', 'Walking Pass', '645', 'Custom Double Spin', 'Chocolate Bar', 'Countdown', 'Social Distancing'],
        wantToLearnPatterns: ['Madison Marmosets', 'Benzene Ring'],
      },
      {
        id: 'alex_chen',
        name: 'Alex Chen',
        experience: 'Intermediate',
        preferredProps: ['clubs'],
        location: 'San Francisco, CA',
        lastActive: '2 hours ago',
        bio: 'Love practicing passing patterns and meeting new jugglers.',
        knownPatterns: ['6 Count', 'Walking Pass', '645'],
        wantToLearnPatterns: ['Custom Double Spin', 'Chocolate Bar'],
      },
      {
        id: 'sarah_johnson',
        name: 'Sarah Johnson',
        experience: 'Advanced',
        preferredProps: ['clubs', 'rings'],
        location: 'Oakland, CA',
        lastActive: '1 day ago',
        bio: 'Professional juggler and circus performer. Always up for a challenge!',
        knownPatterns: ['6 Count', 'Custom Double Spin', 'Chocolate Bar', 'Benzene Ring'],
        wantToLearnPatterns: ['Social Distancing'],
      },
      {
        id: 'mike_rodriguez',
        name: 'Mike Rodriguez',
        experience: 'Beginner',
        preferredProps: ['balls', 'clubs'],
        location: 'San Jose, CA',
        lastActive: '3 hours ago',
        bio: 'New to passing but eager to learn!',
        knownPatterns: ['6 Count'],
        wantToLearnPatterns: ['Walking Pass', '645'],
      },
      {
        id: 'emma_watson',
        name: 'Emma Watson',
        experience: 'Intermediate',
        preferredProps: ['clubs'],
        location: 'Palo Alto, CA',
        lastActive: '5 hours ago',
        bio: 'Software engineer by day, juggler by night!',
        knownPatterns: ['6 Count', 'Walking Pass'],
        wantToLearnPatterns: ['645', 'Custom Double Spin'],
      },
      {
        id: 'david_kim',
        name: 'David Kim',
        experience: 'Advanced',
        preferredProps: ['clubs', 'balls', 'rings'],
        location: 'Stanford, CA',
        lastActive: '30 minutes ago',
        bio: 'University juggling club president. Love organizing group practices!',
        knownPatterns: ['6 Count', 'Walking Pass', '645', 'Custom Double Spin', 'Chocolate Bar', 'Countdown'],
        wantToLearnPatterns: ['Madison Marmosets', 'Social Distancing'],
      }
    ];
  }

  /**
   * Manually add a user for testing (useful when backend isn't set up yet)
   */
  static async addTestUser(name: string, experience: 'Beginner' | 'Intermediate' | 'Advanced' = 'Intermediate'): Promise<boolean> {
    const testUser: UserProfile = {
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name,
      avatar: '',
      experience,
      preferredProps: ['clubs'],
      location: 'Test Location',
      lastActive: 'Just now',
      bio: 'Test user for cross-device testing',
      knownPatterns: ['6 Count', 'Walking Pass'],
      wantToLearnPatterns: ['645', 'Custom Double Spin'],
    };

    console.log(`UserSearchService: Adding test user ${name}`);
    return this.addOrUpdateUser(testUser);
  }

  /**
   * Get current backend status for debugging
   */
  static getBackendStatus(): string {
    return this.USE_SUPABASE && this.isSupabaseConfigured() ? 'Supabase' : 'Local Storage';
  }

  /**
   * Clear all stored users (for debugging)
   */
  static async clearAllUsers(): Promise<boolean> {
    try {
      console.log('UserSearchService: Clearing all stored users');
      await AsyncStorage.removeItem(this.USERS_KEY);
      console.log('UserSearchService: Successfully cleared all users');
      return true;
    } catch (error) {
      console.error('UserSearchService: Error clearing users:', error);
      return false;
    }
  }

  /**
   * Get storage key for debugging
   */
  static getStorageKey(): string {
    return this.USERS_KEY;
  }
}
