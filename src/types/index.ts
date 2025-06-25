export type ExperienceLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export type PropType = 'clubs' | 'balls' | 'rings';

export type PatternStatus = 'known' | 'want_to_learn' | 'want_to_avoid';

export type TimingType = 'fully_async' | 'semi_sync' | 'fully_sync';

export type SourceType = 'official' | 'user_contributed' | 'community_verified';

export type VerificationStatus = 'pending' | 'verified' | 'needs_review';

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
  description: string;
  tags: string[];
  
  // New essential fields
  source: {
    name: string;
    type: SourceType;
    url?: string;
    contributorId?: string; // User ID who added it
    dateAdded: string;
    verificationStatus?: VerificationStatus;
  };
  prerequisites: string[]; // Pattern IDs that should be learned first
  timing: TimingType;
  
  // User-generated pattern fields
  createdBy?: string; // User ID of original creator
  communityRating?: number; // Average rating from users (0-5)
  ratingCount?: number; // Number of ratings
  isPublic?: boolean; // Whether visible to other users
  lastModified?: string; // When it was last updated
  
  // Enhanced technical fields
  numberOfProps: number;
  period: number;
  squeezes?: number;
  orbits?: {
    [key: string]: number; // e.g., "600": 2, "045": 3
  };
  
  // Siteswap consolidation
  siteswap: {
    local?: {
      [juggler: string]: string; // e.g., "A": "6544", "B": "4654"
    };
    global?: string;
    prechac?: {
      [juggler: string]: string;
    };
  };
  
  // Hand order and movement descriptions
  handOrder?: string;
  wordDescriptions?: {
    [juggler: string]: string[]; // e.g., "A": ["self", "zap", "flip"]
  };
  
  // Optional fields
  videoUrl?: string;
  isGroundState?: boolean;
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

export interface PatternRating {
  id: string;
  patternId: string;
  userId: string;
  rating: number; // 1-5 stars
  review?: string;
  createdAt: Date;
}

export interface PatternContribution {
  id: string;
  patternId: string;
  contributorId: string;
  contributionType: 'creation' | 'edit' | 'verification';
  changes?: string; // Description of what was changed
  createdAt: Date;
}
