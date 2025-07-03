import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pattern, PropType } from '../types';

// Comprehensive juggling pattern library based on curriculum flowchart
export const CURRICULUM_PATTERNS: Pattern[] = [
  // SOLO PATTERNS - BASIC
  {
    id: 'solo_001',
    name: 'One Ball Flash',
    difficulty: 'Beginner',
    requiredJugglers: 1,
    props: ['balls'],
    description: 'Flash one ball from hand to hand at eye level',
    tags: ['solo', 'beginner', 'balls', 'flash', 'foundation'],
    source: {
      name: 'Curriculum Flowchart',
      type: 'official',
      dateAdded: '2025-01-09'
    },
    prerequisites: [],
    timing: 'fully_async',
    numberOfProps: 1,
    period: 1,
    squeezes: 0,
    isPublic: true,
    siteswap: { local: { 'A': '3' } },
    wordDescriptions: { 'A': ['throw'] },
    isGroundState: true
  },
  {
    id: 'solo_002',
    name: 'Two Ball Columns',
    difficulty: 'Beginner',
    requiredJugglers: 1,
    props: ['balls'],
    description: 'Two balls thrown straight up in parallel columns',
    tags: ['solo', 'beginner', 'balls', 'columns', 'foundation'],
    source: {
      name: 'Curriculum Flowchart',
      type: 'official',
      dateAdded: '2025-01-09'
    },
    prerequisites: ['solo_001'],
    timing: 'fully_async',
    numberOfProps: 2,
    period: 2,
    squeezes: 0,
    isPublic: true,
    siteswap: { local: { 'A': '40' } },
    wordDescriptions: { 'A': ['throw', 'hold'] },
    isGroundState: true
  },
  {
    id: 'solo_003',
    name: 'Two Ball Flash',
    difficulty: 'Beginner',
    requiredJugglers: 1,
    props: ['balls'],
    description: 'Flash two balls crossing in the air',
    tags: ['solo', 'beginner', 'balls', 'flash', 'crossing'],
    source: {
      name: 'Curriculum Flowchart',
      type: 'official',
      dateAdded: '2025-01-09'
    },
    prerequisites: ['solo_001'],
    timing: 'fully_async',
    numberOfProps: 2,
    period: 2,
    squeezes: 0,
    isPublic: true,
    siteswap: { local: { 'A': '33' } },
    wordDescriptions: { 'A': ['throw', 'throw'] },
    isGroundState: true
  },
  {
    id: 'solo_004',
    name: 'Three Ball Cascade',
    difficulty: 'Intermediate',
    requiredJugglers: 1,
    props: ['balls'],
    description: 'Classic three ball cascade pattern',
    tags: ['solo', 'intermediate', 'balls', 'cascade', 'continuous'],
    source: {
      name: 'Curriculum Flowchart',
      type: 'official',
      dateAdded: '2025-01-09'
    },
    prerequisites: ['solo_003'],
    timing: 'fully_async',
    numberOfProps: 3,
    period: 3,
    squeezes: 0,
    isPublic: true,
    siteswap: { local: { 'A': '333' } },
    wordDescriptions: { 'A': ['throw', 'throw', 'throw'] },
    isGroundState: true
  },
  {
    id: 'solo_005',
    name: 'Three Ball Flash',
    difficulty: 'Intermediate',
    requiredJugglers: 1,
    props: ['balls'],
    description: 'Flash all three balls and catch in starting hands',
    tags: ['solo', 'intermediate', 'balls', 'flash', 'quick'],
    source: {
      name: 'Curriculum Flowchart',
      type: 'official',
      dateAdded: '2025-01-09'
    },
    prerequisites: ['solo_004'],
    timing: 'fully_async',
    numberOfProps: 3,
    period: 3,
    squeezes: 0,
    isPublic: true,
    siteswap: { local: { 'A': '555' } },
    wordDescriptions: { 'A': ['throw', 'throw', 'throw'] },
    isGroundState: true
  },
  {
    id: 'solo_006',
    name: 'Four Ball Fountain',
    difficulty: 'Advanced',
    requiredJugglers: 1,
    props: ['balls'],
    description: 'Four balls in synchronous fountain pattern',
    tags: ['solo', 'advanced', 'balls', 'fountain', 'synchronous'],
    source: {
      name: 'Curriculum Flowchart',
      type: 'official',
      dateAdded: '2025-01-09'
    },
    prerequisites: ['solo_004'],
    timing: 'fully_sync',
    numberOfProps: 4,
    period: 4,
    squeezes: 0,
    isPublic: true,
    siteswap: { local: { 'A': '4444' } },
    wordDescriptions: { 'A': ['throw', 'throw', 'throw', 'throw'] },
    isGroundState: true
  },

  // PARTNER PATTERNS - PASSING
  {
    id: 'partner_001',
    name: '6 Count',
    difficulty: 'Beginner',
    requiredJugglers: 2,
    props: ['clubs'],
    description: 'Pass every 6th throw, foundation of passing',
    tags: ['partner', 'beginner', 'clubs', 'passing', 'synchronous'],
    source: {
      name: 'Curriculum Flowchart',
      type: 'official',
      dateAdded: '2025-01-09'
    },
    prerequisites: [],
    timing: 'fully_sync',
    numberOfProps: 6,
    period: 6,
    squeezes: 0,
    isPublic: true,
    siteswap: {
      local: { 'A': '6p6666', 'B': '6p6666' },
      global: '(6p,6p)(6,6)(6,6)(6,6)(6,6)(6,6)'
    },
    handOrder: '(AR, BR)(AL, BL)(AR, BR)(AL, BL)(AR, BR)(AL, BL)',
    wordDescriptions: {
      'A': ['pass', 'self', 'self', 'self', 'self', 'self'],
      'B': ['pass', 'self', 'self', 'self', 'self', 'self']
    },
    isGroundState: true
  },
  {
    id: 'partner_002',
    name: '4 Count',
    difficulty: 'Intermediate',
    requiredJugglers: 2,
    props: ['clubs'],
    description: 'Pass every 4th throw, more frequent passing',
    tags: ['partner', 'intermediate', 'clubs', 'passing', 'synchronous'],
    source: {
      name: 'Curriculum Flowchart',
      type: 'official',
      dateAdded: '2025-01-09'
    },
    prerequisites: ['partner_001'],
    timing: 'fully_sync',
    numberOfProps: 6,
    period: 4,
    squeezes: 0,
    isPublic: true,
    siteswap: {
      local: { 'A': '6p666', 'B': '6p666' },
      global: '(6p,6p)(6,6)(6,6)(6,6)'
    },
    handOrder: '(AR, BR)(AL, BL)(AR, BR)(AL, BL)',
    wordDescriptions: {
      'A': ['pass', 'self', 'self', 'self'],
      'B': ['pass', 'self', 'self', 'self']
    },
    isGroundState: true
  },
  {
    id: 'partner_003',
    name: '2 Count',
    difficulty: 'Advanced',
    requiredJugglers: 2,
    props: ['clubs'],
    description: 'Pass every 2nd throw, rapid passing',
    tags: ['partner', 'advanced', 'clubs', 'passing', 'synchronous', 'rapid'],
    source: {
      name: 'Curriculum Flowchart',
      type: 'official',
      dateAdded: '2025-01-09'
    },
    prerequisites: ['partner_002'],
    timing: 'fully_sync',
    numberOfProps: 6,
    period: 2,
    squeezes: 0,
    isPublic: true,
    siteswap: {
      local: { 'A': '6p6', 'B': '6p6' },
      global: '(6p,6p)(6,6)'
    },
    handOrder: '(AR, BR)(AL, BL)',
    wordDescriptions: {
      'A': ['pass', 'self'],
      'B': ['pass', 'self']
    },
    isGroundState: true
  },

  // ZAP PATTERNS
  {
    id: 'zap_001',
    name: 'Single Zap',
    difficulty: 'Intermediate',
    requiredJugglers: 2,
    props: ['clubs'],
    description: 'Quick horizontal pass from 6 count',
    tags: ['partner', 'intermediate', 'clubs', 'zap', 'horizontal'],
    source: {
      name: 'Curriculum Flowchart',
      type: 'official',
      dateAdded: '2025-01-09'
    },
    prerequisites: ['partner_001'],
    timing: 'semi_sync',
    numberOfProps: 6,
    period: 6,
    squeezes: 0,
    isPublic: true,
    siteswap: {
      local: { 'A': '6p6z666', 'B': '6p6z666' }
    },
    wordDescriptions: {
      'A': ['pass', 'self', 'zap', 'self', 'self', 'self'],
      'B': ['pass', 'self', 'zap', 'self', 'self', 'self']
    },
    isGroundState: true
  },
  {
    id: 'zap_002',
    name: 'Double Zap',
    difficulty: 'Advanced',
    requiredJugglers: 2,
    props: ['clubs'],
    description: 'Two consecutive zaps in sequence',
    tags: ['partner', 'advanced', 'clubs', 'zap', 'double', 'sequence'],
    source: {
      name: 'Curriculum Flowchart',
      type: 'official',
      dateAdded: '2025-01-09'
    },
    prerequisites: ['zap_001'],
    timing: 'semi_sync',
    numberOfProps: 6,
    period: 8,
    squeezes: 0,
    isPublic: true,
    siteswap: {
      local: { 'A': '6p6zz666', 'B': '6p6zz666' }
    },
    wordDescriptions: {
      'A': ['pass', 'self', 'zap', 'zap', 'self', 'self', 'self'],
      'B': ['pass', 'self', 'zap', 'zap', 'self', 'self', 'self']
    },
    isGroundState: true
  },

  // FEED PATTERNS
  {
    id: 'feed_001',
    name: 'Two Person Feed',
    difficulty: 'Intermediate',
    requiredJugglers: 3,
    props: ['clubs'],
    description: 'One feeder passes to two feedees alternately',
    tags: ['feed', 'intermediate', 'clubs', 'three-person', 'alternating'],
    source: {
      name: 'Curriculum Flowchart',
      type: 'official',
      dateAdded: '2025-01-09'
    },
    prerequisites: ['partner_001'],
    timing: 'semi_sync',
    numberOfProps: 9,
    period: 12,
    squeezes: 0,
    isPublic: true,
    siteswap: {
      local: { 
        'Feeder': '6p6p666666666',
        'Feedee1': '666p666666666', 
        'Feedee2': '666666p666666'
      }
    },
    wordDescriptions: {
      'Feeder': ['pass-to-1', 'pass-to-2', 'self', 'self', 'self', 'self', 'self', 'self', 'self', 'self', 'self', 'self'],
      'Feedee1': ['self', 'self', 'self', 'pass-to-feeder', 'self', 'self', 'self', 'self', 'self', 'self', 'self', 'self'],
      'Feedee2': ['self', 'self', 'self', 'self', 'self', 'self', 'pass-to-feeder', 'self', 'self', 'self', 'self', 'self']
    },
    isGroundState: true
  },
  {
    id: 'feed_002',
    name: 'Three Person Feed',
    difficulty: 'Advanced',
    requiredJugglers: 4,
    props: ['clubs'],
    description: 'One feeder passes to three feedees in rotation',
    tags: ['feed', 'advanced', 'clubs', 'four-person', 'rotation'],
    source: {
      name: 'Curriculum Flowchart',
      type: 'official',
      dateAdded: '2025-01-09'
    },
    prerequisites: ['feed_001'],
    timing: 'semi_sync',
    numberOfProps: 12,
    period: 18,
    squeezes: 0,
    isPublic: true,
    siteswap: {
      local: { 
        'Feeder': '6p6p6p666666666666666',
        'Feedee1': '666p666666666666666', 
        'Feedee2': '666666p666666666666',
        'Feedee3': '666666666p666666666'
      }
    },
    isGroundState: true
  },

  // MOVEMENT PATTERNS
  {
    id: 'move_001',
    name: 'Walking Pass',
    difficulty: 'Intermediate',
    requiredJugglers: 2,
    props: ['clubs'],
    description: 'Passing while walking forward together',
    tags: ['partner', 'intermediate', 'clubs', 'walking', 'movement'],
    source: {
      name: 'Curriculum Flowchart',
      type: 'official',
      dateAdded: '2025-01-09'
    },
    prerequisites: ['partner_001'],
    timing: 'semi_sync',
    numberOfProps: 6,
    period: 6,
    squeezes: 0,
    isPublic: true,
    siteswap: {
      local: { 'A': '6p6666', 'B': '6p6666' }
    },
    wordDescriptions: {
      'A': ['pass', 'self', 'self', 'self', 'self', 'self'],
      'B': ['pass', 'self', 'self', 'self', 'self', 'self']
    },
    isGroundState: true
  },
  {
    id: 'move_002',
    name: 'Weaving',
    difficulty: 'Advanced',
    requiredJugglers: 2,
    props: ['clubs'],
    description: 'Jugglers weave around each other while passing',
    tags: ['partner', 'advanced', 'clubs', 'weaving', 'complex-movement'],
    source: {
      name: 'Curriculum Flowchart',
      type: 'official',
      dateAdded: '2025-01-09'
    },
    prerequisites: ['move_001'],
    timing: 'semi_sync',
    numberOfProps: 6,
    period: 8,
    squeezes: 0,
    isPublic: true,
    siteswap: {
      local: { 'A': '6p666666', 'B': '6p666666' }
    },
    isGroundState: true
  },

  // BALL PASSING
  {
    id: 'ball_001',
    name: 'Ball Passing Basics',
    difficulty: 'Beginner',
    requiredJugglers: 2,
    props: ['balls'],
    description: 'Simple ball passing between two jugglers',
    tags: ['partner', 'beginner', 'balls', 'passing', 'foundation'],
    source: {
      name: 'Curriculum Flowchart',
      type: 'official',
      dateAdded: '2025-01-09'
    },
    prerequisites: ['solo_004'],
    timing: 'fully_sync',
    numberOfProps: 6,
    period: 6,
    squeezes: 0,
    isPublic: true,
    siteswap: {
      local: { 'A': '3p3333', 'B': '3p3333' }
    },
    wordDescriptions: {
      'A': ['pass', 'self', 'self', 'self', 'self', 'self'],
      'B': ['pass', 'self', 'self', 'self', 'self', 'self']
    },
    isGroundState: true
  },
  {
    id: 'ball_002',
    name: 'Shower Pass',
    difficulty: 'Intermediate',
    requiredJugglers: 2,
    props: ['balls'],
    description: 'One-sided passing pattern with balls',
    tags: ['partner', 'intermediate', 'balls', 'shower', 'one-sided'],
    source: {
      name: 'Curriculum Flowchart',
      type: 'official',
      dateAdded: '2025-01-09'
    },
    prerequisites: ['ball_001'],
    timing: 'fully_async',
    numberOfProps: 6,
    period: 4,
    squeezes: 0,
    isPublic: true,
    siteswap: {
      local: { 'A': '5p13', 'B': '3p51' }
    },
    isGroundState: true
  },

  // TECHNICAL PATTERNS
  {
    id: 'tech_001',
    name: 'Slam',
    difficulty: 'Advanced',
    requiredJugglers: 2,
    props: ['clubs'],
    description: 'Throwing to opposite hand across pattern',
    tags: ['partner', 'advanced', 'clubs', 'slam', 'cross-throw'],
    source: {
      name: 'Curriculum Flowchart',
      type: 'official',
      dateAdded: '2025-01-09'
    },
    prerequisites: ['partner_002'],
    timing: 'semi_sync',
    numberOfProps: 6,
    period: 8,
    squeezes: 0,
    isPublic: true,
    siteswap: {
      local: { 'A': '6p6s6666', 'B': '6p6s6666' }
    },
    isGroundState: true
  },
  {
    id: 'tech_002',
    name: 'Flip',
    difficulty: 'Intermediate',
    requiredJugglers: 1,
    props: ['clubs'],
    description: 'Single club flip in solo pattern',
    tags: ['solo', 'intermediate', 'clubs', 'flip', 'manipulation'],
    source: {
      name: 'Curriculum Flowchart',
      type: 'official',
      dateAdded: '2025-01-09'
    },
    prerequisites: ['solo_004'],
    timing: 'fully_async',
    numberOfProps: 3,
    period: 3,
    squeezes: 0,
    isPublic: true,
    siteswap: { local: { 'A': '3f33' } },
    isGroundState: true
  },

  // ADVANCED COMBINATIONS
  {
    id: 'combo_001',
    name: 'Zap Slam Combo',
    difficulty: 'Advanced',
    requiredJugglers: 2,
    props: ['clubs'],
    description: 'Combination of zap and slam throws',
    tags: ['partner', 'expert', 'clubs', 'combination', 'zap', 'slam'],
    source: {
      name: 'Curriculum Flowchart',
      type: 'official',
      dateAdded: '2025-01-09'
    },
    prerequisites: ['zap_001', 'tech_001'],
    timing: 'semi_sync',
    numberOfProps: 6,
    period: 12,
    squeezes: 0,
    isPublic: true,
    siteswap: {
      local: { 'A': '6p6z6s666666', 'B': '6p6z6s666666' }
    },
    isGroundState: true
  }
];

export class PatternLibraryService {
  private static STORAGE_KEY = 'user_contributed_patterns';

  static async getUserContributedPatterns(): Promise<Pattern[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return [];
    } catch (error) {
      console.error('Error loading user patterns:', error);
      return [];
    }
  }

  static async addUserPattern(pattern: Pattern): Promise<boolean> {
    try {
      const existing = await this.getUserContributedPatterns();
      const updated = [...existing, pattern];
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
      return true;
    } catch (error) {
      console.error('Error saving user pattern:', error);
      return false;
    }
  }

  static async clearUserPatterns(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing user patterns:', error);
      return false;
    }
  }

  // Get all curriculum patterns
  static getCurriculumPatterns(): Pattern[] {
    return CURRICULUM_PATTERNS;
  }

  // Get patterns by difficulty level
  static getPatternsByDifficulty(difficulty: string): Pattern[] {
    return CURRICULUM_PATTERNS.filter(pattern => pattern.difficulty === difficulty);
  }

  // Get patterns by tags
  static getPatternsByTag(tag: string): Pattern[] {
    return CURRICULUM_PATTERNS.filter(pattern => 
      pattern.tags.some(patternTag => patternTag.toLowerCase() === tag.toLowerCase())
    );
  }

  // Get patterns by juggler count
  static getPatternsByJugglerCount(count: number): Pattern[] {
    return CURRICULUM_PATTERNS.filter(pattern => pattern.requiredJugglers === count);
  }

  // Get patterns by prop type
  static getPatternsByProp(prop: PropType): Pattern[] {
    return CURRICULUM_PATTERNS.filter(pattern => 
      pattern.props.includes(prop)
    );
  }

  // Get beginner progression patterns
  static getBeginnerProgression(): Pattern[] {
    return CURRICULUM_PATTERNS.filter(pattern => 
      pattern.difficulty === 'Beginner' || 
      (pattern.difficulty === 'Intermediate' && pattern.prerequisites.length <= 1)
    ).sort((a, b) => a.prerequisites.length - b.prerequisites.length);
  }

  // Search patterns by name or description
  static searchPatterns(query: string): Pattern[] {
    const lowercaseQuery = query.toLowerCase();
    return CURRICULUM_PATTERNS.filter(pattern =>
      pattern.name.toLowerCase().includes(lowercaseQuery) ||
      pattern.description.toLowerCase().includes(lowercaseQuery) ||
      pattern.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }
}
