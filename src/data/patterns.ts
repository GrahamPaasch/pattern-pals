import { Pattern } from '../types';

export const patterns: Pattern[] = [
  // BASIC PASSING PATTERNS
  {
    id: '1',
    name: '6 Count',
    difficulty: 'Beginner',
    requiredJugglers: 2,
    props: ['clubs'],
    description: 'Pass every 6th throw, good for beginners to get comfortable with timing',
    tags: ['basic', 'clubs', 'synchronous', 'beginner-friendly'],
    
    source: {
      name: 'Classic Pattern',
      type: 'official',
      dateAdded: '2025-06-25',
      verificationStatus: 'verified'
    },
    prerequisites: [],
    timing: 'fully_sync',
    numberOfProps: 6,
    period: 6,
    squeezes: 0,
    isPublic: true,
    
    siteswap: {
      local: {
        'A': '6p66666',
        'B': '6p66666'
      },
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
    id: '2',
    name: 'Walking Pass',
    difficulty: 'Intermediate',
    requiredJugglers: 2,
    props: ['clubs'],
    description: 'Passing while walking side by side',
    tags: ['intermediate', 'clubs', 'walking', 'moving'],
    
    source: {
      name: 'Traditional Pattern',
      type: 'official',
      dateAdded: '2025-06-25'
    },
    prerequisites: ['1'], // Should know 6 Count first
    timing: 'semi_sync',
    numberOfProps: 6,
    period: 4,
    squeezes: 0,
    isPublic: true,
    
    siteswap: {
      local: {
        'A': '6p666',
        'B': '6p666'
      }
    },
    wordDescriptions: {
      'A': ['pass', 'self', 'self', 'self'],
      'B': ['pass', 'self', 'self', 'self']
    },
    isGroundState: false
  },
  // Example pattern from Passist (645)
  {
    id: '3',
    name: '645',
    difficulty: 'Intermediate',
    requiredJugglers: 2,
    props: ['clubs'],
    description: '5 props, 3-beat period pattern with alternating passes',
    tags: ['intermediate', 'clubs', 'async', 'passist'],
    
    source: {
      name: 'Passist',
      type: 'official',
      url: 'https://passist.org/patterns/645',
      dateAdded: '2025-06-25'
    },
    prerequisites: ['1'], // Should know 6 Count first
    timing: 'fully_async',
    numberOfProps: 5,
    period: 3,
    squeezes: 0,
    isPublic: true,
    orbits: {
      '600': 2,
      '045': 3
    },
    
    siteswap: {
      local: {
        'A': '645',
        'B': '456'
      },
      prechac: {
        'A': '5X 4',
        'B': '6 5||'
      }
    },
    handOrder: 'Ar Br Al Bl',
    wordDescriptions: {
      'A': ['self', 'zap', 'flip'],
      'B': ['flip', 'self', 'zap']
    },
    isGroundState: true
  },
  // Example user-contributed pattern
  {
    id: '4',
    name: 'Custom Double Spin',
    difficulty: 'Advanced',
    requiredJugglers: 2,
    props: ['clubs'],
    description: 'A user-created variation with double spins on the passes',
    tags: ['advanced', 'clubs', 'spins', 'user-created'],
    
    source: {
      name: 'User Submission',
      type: 'user_contributed',
      contributorId: 'user_123',
      dateAdded: '2025-06-25',
      verificationStatus: 'pending'
    },
    prerequisites: ['1', '3'], // Need 6 Count and 645
    timing: 'fully_sync',
    numberOfProps: 6,
    period: 4,
    squeezes: 1,
    isPublic: true,
    
    createdBy: 'user_123',
    communityRating: 4.2,
    ratingCount: 15,
    lastModified: '2025-06-25',
    
    siteswap: {
      local: {
        'A': '6p2p66',
        'B': '6p2p66'
      }
    },
    wordDescriptions: {
      'A': ['double pass', 'double pass', 'self', 'self'],
      'B': ['double pass', 'double pass', 'self', 'self']
    },
    isGroundState: true
  }
];

export const getPatternById = (id: string): Pattern | undefined => {
  return patterns.find(pattern => pattern.id === id);
};

export const getPatternsByDifficulty = (difficulty: string): Pattern[] => {
  return patterns.filter(pattern => pattern.difficulty === difficulty);
};

export const getPatternsByProps = (props: string[]): Pattern[] => {
  return patterns.filter(pattern => 
    pattern.props.some(prop => props.includes(prop))
  );
};

export const getPatternsByJugglerCount = (count: number): Pattern[] => {
  return patterns.filter(pattern => pattern.requiredJugglers === count);
};

export const searchPatterns = (query: string): Pattern[] => {
  const lowercaseQuery = query.toLowerCase();
  return patterns.filter(pattern =>
    pattern.name.toLowerCase().includes(lowercaseQuery) ||
    pattern.description.toLowerCase().includes(lowercaseQuery) ||
    pattern.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
};

export const getPatternsByTag = (tag: string): Pattern[] => {
  return patterns.filter(pattern => 
    pattern.tags.some(patternTag => patternTag.toLowerCase() === tag.toLowerCase())
  );
};

export const getPatternCountByDifficulty = () => {
  const counts = { Beginner: 0, Intermediate: 0, Advanced: 0 };
  patterns.forEach(pattern => {
    counts[pattern.difficulty]++;
  });
  return counts;
};

export const getPatternsByTiming = (timing: string): Pattern[] => {
  return patterns.filter(pattern => pattern.timing === timing);
};

export const getPatternsByPrerequisite = (prerequisiteId: string): Pattern[] => {
  return patterns.filter(pattern => 
    pattern.prerequisites.includes(prerequisiteId)
  );
};

export const getPatternsWithoutPrerequisites = (): Pattern[] => {
  return patterns.filter(pattern => pattern.prerequisites.length === 0);
};

export const getPatternsBySource = (sourceName: string): Pattern[] => {
  return patterns.filter(pattern => 
    pattern.source.name.toLowerCase().includes(sourceName.toLowerCase())
  );
};

export const getPatternsByPropCount = (count: number): Pattern[] => {
  return patterns.filter(pattern => pattern.numberOfProps === count);
};

export const getPatternsBySourceType = (sourceType: string): Pattern[] => {
  return patterns.filter(pattern => pattern.source.type === sourceType);
};

export const getUserContributedPatterns = (): Pattern[] => {
  return patterns.filter(pattern => pattern.source.type === 'user_contributed');
};

export const getPatternsByContributor = (contributorId: string): Pattern[] => {
  return patterns.filter(pattern => 
    pattern.source.contributorId === contributorId || pattern.createdBy === contributorId
  );
};

export const getPendingPatterns = (): Pattern[] => {
  return patterns.filter(pattern => 
    pattern.source.verificationStatus === 'pending'
  );
};

export const getHighRatedPatterns = (minRating: number = 4): Pattern[] => {
  return patterns.filter(pattern => 
    pattern.communityRating && pattern.communityRating >= minRating
  );
};

export const getPublicPatterns = (): Pattern[] => {
  return patterns.filter(pattern => pattern.isPublic !== false);
};
