import { Pattern } from '../types';

export const patterns: Pattern[] = [
  {
    id: '1',
    name: 'Ultimate',
    difficulty: 'Beginner',
    requiredJugglers: 2,
    props: ['clubs'],
    description: 'Basic two-person club passing pattern with every right hand throw',
    videoUrl: 'https://www.youtube.com/watch?v=example1',
    tutorialUrl: 'https://www.passist.org/ultimate',
    tags: ['basic', 'clubs', 'synchronous']
  },
  {
    id: '2',
    name: 'Every Others',
    difficulty: 'Beginner',
    requiredJugglers: 2,
    props: ['clubs'],
    description: 'Pass on every other right hand throw',
    videoUrl: 'https://www.youtube.com/watch?v=example2',
    tutorialUrl: 'https://www.passist.org/every-others',
    tags: ['basic', 'clubs', 'synchronous']
  },
  {
    id: '3',
    name: '6 Count',
    difficulty: 'Beginner',
    requiredJugglers: 2,
    props: ['clubs'],
    description: 'Pass every 6th throw, good for beginners to get comfortable',
    videoUrl: 'https://www.youtube.com/watch?v=example3',
    tutorialUrl: 'https://www.passist.org/6-count',
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
    tutorialUrl: 'https://www.passist.org/chocolate-bar',
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
    tutorialUrl: 'https://www.passist.org/french-three-count',
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
    tutorialUrl: 'https://www.passist.org/why-not',
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
    tutorialUrl: 'https://www.passist.org/feed',
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
    tutorialUrl: 'https://www.passist.org/dropback-line',
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
    tutorialUrl: 'https://www.passist.org/ring-cascade',
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
    tutorialUrl: 'https://www.passist.org/typewriter',
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
