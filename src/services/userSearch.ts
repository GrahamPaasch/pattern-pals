import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  experience: 'Beginner' | 'Intermediate' | 'Advanced';
  preferredProps: string[];
  location?: string;
  lastActive: string;
  bio?: string;
  knownPatterns: string[];
  wantToLearnPatterns: string[];
}

export class UserSearchService {
  private static USERS_KEY = 'all_users';

  /**
   * Get all users in the system (excluding current user)
   */
  static async getAllUsers(currentUserId: string): Promise<UserProfile[]> {
    try {
      const stored = await AsyncStorage.getItem(this.USERS_KEY);
      
      if (stored) {
        const users = JSON.parse(stored);
        return users.filter((user: UserProfile) => user.id !== currentUserId);
      }

      // Return demo users if no stored data
      return this.getDemoUsers().filter(user => user.id !== currentUserId);
    } catch (error) {
      console.error('Error getting all users:', error);
      return this.getDemoUsers().filter(user => user.id !== currentUserId);
    }
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
        user.name.toLowerCase().includes(lowercaseQuery) ||
        user.email.toLowerCase().includes(lowercaseQuery)
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
      const existingUsers = await this.getAllUsers('');
      const userIndex = existingUsers.findIndex(u => u.id === user.id);
      
      if (userIndex >= 0) {
        existingUsers[userIndex] = user;
      } else {
        existingUsers.push(user);
      }

      await AsyncStorage.setItem(this.USERS_KEY, JSON.stringify(existingUsers));
      return true;
    } catch (error) {
      console.error('Error adding/updating user:', error);
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
   * Get demo users for testing
   */
  private static getDemoUsers(): UserProfile[] {
    return [
      {
        id: 'peter_caseman',
        name: 'Peter Caseman',
        email: 'peter@example.com',
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
        email: 'alex@example.com',
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
        email: 'sarah@example.com',
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
        email: 'mike@example.com',
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
        email: 'emma@example.com',
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
        email: 'david@example.com',
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
}
