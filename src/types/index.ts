export type ExperienceLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export type PropType = 'clubs' | 'balls' | 'rings';

export type PatternStatus = 'known' | 'want_to_learn' | 'want_to_avoid';

export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface TimeBlock {
  day: WeekDay;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  experience: ExperienceLevel;
  preferredProps: PropType[];
  availability: TimeBlock[];
  knownPatterns: string[]; // Pattern IDs
  wantToLearnPatterns: string[]; // Pattern IDs
  avoidPatterns: string[]; // Pattern IDs
  createdAt: Date;
  updatedAt: Date;
}

export interface Pattern {
  id: string;
  name: string;
  difficulty: ExperienceLevel;
  requiredJugglers: number;
  props: PropType[];
  videoUrl?: string;
  tutorialUrl?: string;
  description: string;
  tags: string[];
}

export interface UserPattern {
  userId: string;
  patternId: string;
  status: PatternStatus;
}

export interface Match {
  id: string;
  user1Id: string;
  user2Id: string;
  score: number; // 0-100
  sharedAvailability: TimeBlock[];
  sharedPatterns: string[]; // Pattern IDs both know
  teachingOpportunities: {
    user1CanTeach: string[]; // Pattern IDs user1 knows but user2 wants to learn
    user2CanTeach: string[]; // Pattern IDs user2 knows but user1 wants to learn
  };
  createdAt: Date;
}

export interface Session {
  id: string;
  hostId: string;
  participantIds: string[];
  scheduledTime: Date;
  duration: number; // minutes
  location?: string;
  plannedPatterns: string[]; // Pattern IDs
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'new_match' | 'session_reminder' | 'session_invite' | 'workshop_announcement';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  relatedId?: string; // Match ID, Session ID, etc.
}
