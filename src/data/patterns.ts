import { Pattern } from '../types';

// Enhanced search interfaces
export interface PatternSearchOptions {
  fuzzyMatch?: boolean;
  includePrerequisites?: boolean;
  includeSimilar?: boolean;
  maxResults?: number;
  sortBy?: 'relevance' | 'difficulty' | 'popularity' | 'name';
}

export interface EnhancedPatternResult extends Pattern {
  searchScore: number;
  matchedFields: string[];
  similarPatterns?: string[];
  prerequisiteChain?: string[];
}

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

// Enhanced semantic search for patterns
export const enhancedPatternSearch = (
  query: string,
  options: PatternSearchOptions = {}
): EnhancedPatternResult[] => {
  const {
    fuzzyMatch = true,
    includePrerequisites = true,
    includeSimilar = true,
    maxResults = 20,
    sortBy = 'relevance'
  } = options;

  if (!query.trim()) {
    return convertToEnhancedResults(patterns, '');
  }

  const queryLower = query.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/);
  const results: EnhancedPatternResult[] = [];

  for (const pattern of patterns) {
    let searchScore = 0;
    const matchedFields: string[] = [];

    // Name matching (highest priority)
    const nameScore = calculateFieldScore(pattern.name, queryWords, fuzzyMatch);
    if (nameScore > 0) {
      searchScore += nameScore * 4;
      matchedFields.push('name');
    }

    // Description matching
    const descScore = calculateFieldScore(pattern.description, queryWords, fuzzyMatch);
    if (descScore > 0) {
      searchScore += descScore * 2;
      matchedFields.push('description');
    }

    // Tags matching
    for (const tag of pattern.tags) {
      const tagScore = calculateFieldScore(tag, queryWords, fuzzyMatch);
      if (tagScore > 0) {
        searchScore += tagScore * 1.5;
        matchedFields.push('tags');
        break; // Only count tags once
      }
    }

    // Difficulty matching
    const difficultyScore = calculateFieldScore(pattern.difficulty, queryWords, fuzzyMatch);
    if (difficultyScore > 0) {
      searchScore += difficultyScore * 1.2;
      matchedFields.push('difficulty');
    }

    // Props matching
    for (const prop of pattern.props) {
      const propScore = calculateFieldScore(prop, queryWords, fuzzyMatch);
      if (propScore > 0) {
        searchScore += propScore * 1.0;
        matchedFields.push('props');
        break; // Only count props once
      }
    }

    // Source matching
    const sourceScore = calculateFieldScore(pattern.source.name, queryWords, fuzzyMatch);
    if (sourceScore > 0) {
      searchScore += sourceScore * 0.8;
      matchedFields.push('source');
    }

    // Siteswap matching (for technical searches)
    if (pattern.siteswap?.local) {
      for (const [juggler, siteswap] of Object.entries(pattern.siteswap.local)) {
        const siteswapScore = calculateFieldScore(siteswap, queryWords, false); // Exact match for siteswap
        if (siteswapScore > 0) {
          searchScore += siteswapScore * 1.0;
          matchedFields.push('siteswap');
          break;
        }
      }
    }

    if (searchScore > 0) {
      // Add semantic enhancements
      const similar = includeSimilar ? findSimilarPatterns(pattern) : [];
      const prereqChain = includePrerequisites ? buildPrerequisiteChain(pattern) : [];

      results.push({
        ...pattern,
        searchScore,
        matchedFields,
        similarPatterns: similar,
        prerequisiteChain: prereqChain
      });
    }
  }

  // Sort results
  const sortedResults = sortPatternResults(results, sortBy);
  
  return maxResults > 0 ? sortedResults.slice(0, maxResults) : sortedResults;
};

// Helper function for field scoring with fuzzy matching
const calculateFieldScore = (
  fieldValue: string,
  queryWords: string[],
  fuzzyMatch: boolean
): number => {
  if (!fieldValue) return 0;

  const fieldLower = fieldValue.toLowerCase();
  let score = 0;

  for (const word of queryWords) {
    if (fieldLower.includes(word)) {
      // Exact match gets full score
      score += 1;
    } else if (fuzzyMatch) {
      // Check for fuzzy matches
      const fuzzyScore = calculateFuzzyMatch(fieldLower, word);
      score += fuzzyScore;
    }
  }

  return score / queryWords.length;
};

// Simple fuzzy matching
const calculateFuzzyMatch = (text: string, word: string): number => {
  const words = text.split(/\s+/);
  let bestScore = 0;

  for (const textWord of words) {
    const distance = levenshteinDistance(textWord, word);
    const maxLen = Math.max(textWord.length, word.length);
    const similarity = 1 - (distance / maxLen);
    
    // Only consider matches above 60% similarity
    if (similarity >= 0.6) {
      bestScore = Math.max(bestScore, similarity * 0.8); // Reduce score for fuzzy matches
    }
  }

  return bestScore;
};

// Levenshtein distance calculation
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  return matrix[str2.length][str1.length];
};

// Find similar patterns based on shared characteristics
const findSimilarPatterns = (pattern: Pattern): string[] => {
  const similar: string[] = [];
  
  for (const otherPattern of patterns) {
    if (otherPattern.id === pattern.id) continue;
    
    let similarity = 0;
    
    // Same difficulty
    if (otherPattern.difficulty === pattern.difficulty) similarity += 2;
    
    // Same number of jugglers
    if (otherPattern.requiredJugglers === pattern.requiredJugglers) similarity += 2;
    
    // Shared props
    const sharedProps = pattern.props.filter(prop => otherPattern.props.includes(prop));
    similarity += sharedProps.length;
    
    // Shared tags
    const sharedTags = pattern.tags.filter(tag => otherPattern.tags.includes(tag));
    similarity += sharedTags.length * 0.5;
    
    // Same timing
    if (otherPattern.timing === pattern.timing) similarity += 1;
    
    // Prerequisites relationship
    if (pattern.prerequisites.includes(otherPattern.id) || 
        otherPattern.prerequisites.includes(pattern.id)) {
      similarity += 3;
    }
    
    if (similarity >= 3) {
      similar.push(otherPattern.name);
    }
  }
  
  return similar.slice(0, 5); // Limit to top 5 similar patterns
};

// Build prerequisite learning chain
const buildPrerequisiteChain = (pattern: Pattern): string[] => {
  const chain: string[] = [];
  const visited = new Set<string>();
  
  const buildChain = (patternId: string) => {
    if (visited.has(patternId)) return; // Avoid cycles
    visited.add(patternId);
    
    const currentPattern = patterns.find(p => p.id === patternId);
    if (!currentPattern) return;
    
    for (const prereqId of currentPattern.prerequisites) {
      const prereqPattern = patterns.find(p => p.id === prereqId);
      if (prereqPattern) {
        buildChain(prereqId); // Recursive build
        if (!chain.includes(prereqPattern.name)) {
          chain.push(prereqPattern.name);
        }
      }
    }
  };
  
  buildChain(pattern.id);
  return chain;
};

// Sort pattern results by different criteria
const sortPatternResults = (
  results: EnhancedPatternResult[],
  sortBy: 'relevance' | 'difficulty' | 'popularity' | 'name'
): EnhancedPatternResult[] => {
  switch (sortBy) {
    case 'relevance':
      return results.sort((a, b) => b.searchScore - a.searchScore);
    
    case 'difficulty':
      const difficultyOrder = ['Beginner', 'Intermediate', 'Advanced'];
      return results.sort((a, b) => {
        const aIndex = difficultyOrder.indexOf(a.difficulty);
        const bIndex = difficultyOrder.indexOf(b.difficulty);
        return aIndex - bIndex;
      });
    
    case 'popularity':
      return results.sort((a, b) => {
        const aRating = a.communityRating || 0;
        const bRating = b.communityRating || 0;
        const aCount = a.ratingCount || 0;
        const bCount = b.ratingCount || 0;
        
        // Sort by rating * count (popularity metric)
        return (bRating * bCount) - (aRating * aCount);
      });
    
    case 'name':
      return results.sort((a, b) => a.name.localeCompare(b.name));
    
    default:
      return results.sort((a, b) => b.searchScore - a.searchScore);
  }
};

// Convert regular patterns to enhanced results
const convertToEnhancedResults = (patterns: Pattern[], query: string): EnhancedPatternResult[] => {
  return patterns.map(pattern => ({
    ...pattern,
    searchScore: 0,
    matchedFields: [],
    similarPatterns: findSimilarPatterns(pattern),
    prerequisiteChain: buildPrerequisiteChain(pattern)
  }));
};

// Enhanced pattern recommendations based on user's known patterns
export const getRecommendedPatterns = (
  knownPatterns: string[],
  wantToLearnPatterns: string[] = [],
  experience: 'Beginner' | 'Intermediate' | 'Advanced' = 'Intermediate'
): EnhancedPatternResult[] => {
  const knownSet = new Set(knownPatterns);
  const wantToLearnSet = new Set(wantToLearnPatterns);
  const recommendations: EnhancedPatternResult[] = [];

  for (const pattern of patterns) {
    if (knownSet.has(pattern.name) || wantToLearnSet.has(pattern.name)) {
      continue; // Skip already known or wanted patterns
    }

    let score = 0;
    const matchedFields: string[] = [];

    // Check if prerequisites are met
    const prereqsMet = pattern.prerequisites.every(prereqId => {
      const prereqPattern = patterns.find(p => p.id === prereqId);
      return prereqPattern ? knownSet.has(prereqPattern.name) : false;
    });

    if (!prereqsMet && pattern.prerequisites.length > 0) {
      continue; // Skip patterns where prerequisites aren't met
    }

    // Score based on difficulty appropriateness
    const experienceLevels = ['Beginner', 'Intermediate', 'Advanced'];
    const userLevel = experienceLevels.indexOf(experience);
    const patternLevel = experienceLevels.indexOf(pattern.difficulty);

    if (patternLevel === userLevel) {
      score += 3; // Perfect match
      matchedFields.push('difficulty');
    } else if (patternLevel === userLevel + 1) {
      score += 2; // Slightly challenging
      matchedFields.push('difficulty');
    } else if (patternLevel === userLevel - 1) {
      score += 1; // Slightly easier
    }

    // Bonus for patterns that build on known patterns
    let buildingBonus = 0;
    for (const knownPattern of knownPatterns) {
      const knownPatternData = patterns.find(p => p.name === knownPattern);
      if (knownPatternData) {
        const similarity = calculatePatternSimilarity(knownPatternData, pattern);
        buildingBonus += similarity;
      }
    }
    score += buildingBonus;

    if (score > 0) {
      recommendations.push({
        ...pattern,
        searchScore: score,
        matchedFields,
        similarPatterns: findSimilarPatterns(pattern),
        prerequisiteChain: buildPrerequisiteChain(pattern)
      });
    }
  }

  return recommendations
    .sort((a, b) => b.searchScore - a.searchScore)
    .slice(0, 10); // Top 10 recommendations
};

// Calculate similarity between two patterns
const calculatePatternSimilarity = (pattern1: Pattern, pattern2: Pattern): number => {
  let similarity = 0;

  // Same props
  const sharedProps = pattern1.props.filter(prop => pattern2.props.includes(prop));
  similarity += sharedProps.length * 0.5;

  // Same tags
  const sharedTags = pattern1.tags.filter(tag => pattern2.tags.includes(tag));
  similarity += sharedTags.length * 0.3;

  // Same timing
  if (pattern1.timing === pattern2.timing) similarity += 0.5;

  // Same number of jugglers
  if (pattern1.requiredJugglers === pattern2.requiredJugglers) similarity += 0.5;

  return similarity;
};
