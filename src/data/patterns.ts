import { Pattern } from '../types';

export const patterns: Pattern[] = [
  {
    id: '1',
    name: '4-Count Right Handed Passing',
    difficulty: 'Beginner',
    requiredJugglers: 2,
    props: ['clubs', 'balls', 'rings'],
    description: 'Basic two-person club passing pattern. Pass every 4th throw.',
    videoUrl: 'https://www.youtube.com/watch?v=xKSMu7aQYcw',
    globalSiteSwap: '(6p,6p)(6,6)(6,6)(6,6)',
    localSiteSwap: '966966',
    globalHandOrder: '(AR, BR)(AL, BL)(AR, BR)(AL, BL)',
    tags: ['basic', 'clubs', 'balls', 'rings', 'semi-synchronous']
  },
  {
    id: '2',
    name: '4-Count Left Handed Passing',
    difficulty: 'Beginner',
    requiredJugglers: 2,
    props: ['clubs', 'balls', 'rings'],
    description: 'Basic two-person club passing pattern. Pass every 4th throw.',
    videoUrl: 'https://www.youtube.com/watch?v=hO2sR50QW5c',
    globalSiteSwap: '(6p,6p)(6,6)(6,6)(6,6)',
    localSiteSwap: '966966',
    globalHandOrder: '(AL, BL)(AR, BR)(AL, BL)(AR, BR)',
    tags: ['basic', 'clubs', 'balls', 'rings', 'semi-synchronous']
  },
  {
    id: '3',
    name: '6 Count',
    difficulty: 'Beginner',
    requiredJugglers: 2,
    props: ['clubs'],
    description: 'Pass every 6th throw, good for beginners to get comfortable',
    videoUrl: 'https://www.youtube.com/watch?v=example3',
    localSiteSwap: '966',
    tags: ['basic', 'clubs', 'synchronous']
  },
  {
    id: '4',
    name: 'Chocolate Bar',
    difficulty: 'Intermediate',
    requiredJugglers: 2,
    props: ['clubs'],
    description: 'Alternating ultimates and selfs with double passes',
    videoUrl: 'https://www.youtube.com/watch?v=example4',
    localSiteSwap: '978',
    tags: ['intermediate', 'clubs', 'synchronous', 'doubles']
  },
  {
    id: '5',
    name: 'French Three Count',
    difficulty: 'Intermediate',
    requiredJugglers: 2,
    props: ['clubs'],
    description: 'Three count pattern with crossing passes',
    videoUrl: 'https://www.youtube.com/watch?v=example5',
    localSiteSwap: '786',
    tags: ['intermediate', 'clubs', 'synchronous', 'crossing']
  },
  {
    id: '6',
    name: 'Why Not',
    difficulty: 'Advanced',
    requiredJugglers: 2,
    props: ['clubs'],
    description: 'Complex pattern with heffs, zips, and holds',
    videoUrl: 'https://www.youtube.com/watch?v=example6',
    localSiteSwap: '7782',
    tags: ['advanced', 'clubs', 'synchronous', 'heff', 'zip', 'hold']
  },
  {
    id: '7',
    name: 'Feed',
    difficulty: 'Intermediate',
    requiredJugglers: 3,
    props: ['clubs'],
    description: 'One person feeds two others in ultimate timing',
    videoUrl: 'https://www.youtube.com/watch?v=example7',
    localSiteSwap: '966',
    tags: ['intermediate', 'clubs', 'synchronous', 'three-person']
  },
  {
    id: '8',
    name: 'Ball Dropback Line',
    difficulty: 'Beginner',
    requiredJugglers: 4,
    props: ['balls'],
    description: 'Line of jugglers passing balls with dropback pattern',
    videoUrl: 'https://www.youtube.com/watch?v=example8',
    localSiteSwap: '5',
    tags: ['beginner', 'balls', 'line', 'four-person']
  },
  {
    id: '9',
    name: 'Ring Cascade',
    difficulty: 'Beginner',
    requiredJugglers: 2,
    props: ['rings'],
    description: 'Simple ring passing in cascade timing',
    videoUrl: 'https://www.youtube.com/watch?v=example9',
    localSiteSwap: '792',
    tags: ['beginner', 'rings', 'cascade']
  },
  {
    id: '10',
    name: 'Typewriter',
    difficulty: 'Advanced',
    requiredJugglers: 2,
    props: ['clubs'],
    description: 'Advanced pattern with manipulators and various club tricks',
    videoUrl: 'https://www.youtube.com/watch?v=example10',
    localSiteSwap: '96672',
    tags: ['advanced', 'clubs', 'manipulators', 'tricks']
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

export const searchPatterns = (query: string): Pattern[] => {
  const lowercaseQuery = query.toLowerCase();
  return patterns.filter(pattern =>
    pattern.name.toLowerCase().includes(lowercaseQuery) ||
    pattern.description.toLowerCase().includes(lowercaseQuery) ||
    pattern.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
};
