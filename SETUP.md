# PatternPals Setup Guide

## Overview
PatternPals is a React Native mobile app built with Expo that helps jugglers find compatible partners for passing patterns. This guide will help you get the app running on your development environment.

## Prerequisites
- Node.js (v18 or later)
- npm or yarn
- Expo CLI: `npm install -g @expo/cli`
- Expo Go app on your mobile device (for testing)

## Supabase Setup

Before running the app, you need to set up a Supabase project:

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from the API settings

### 2. Database Schema
Run these SQL commands in your Supabase SQL editor to create the required tables:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  avatar TEXT,
  experience TEXT NOT NULL CHECK (experience IN ('Beginner', 'Intermediate', 'Advanced')),
  preferred_props TEXT[] NOT NULL,
  availability JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User patterns table
CREATE TABLE user_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  pattern_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('known', 'want_to_learn', 'want_to_avoid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, pattern_id)
);

-- Matches table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  shared_availability JSONB DEFAULT '[]'::jsonb,
  shared_patterns TEXT[] DEFAULT '{}',
  teaching_opportunities JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES users(id) ON DELETE CASCADE,
  participant_ids UUID[] DEFAULT '{}',
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER NOT NULL, -- minutes
  location TEXT,
  planned_patterns TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('new_match', 'session_reminder', 'session_invite', 'workshop_announcement')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can manage their own patterns" ON user_patterns FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view matches involving them" ON matches FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can view sessions they're involved in" ON sessions FOR SELECT USING (auth.uid() = host_id OR auth.uid() = ANY(participant_ids));

CREATE POLICY "Users can view their own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);
```

### 3. Update Supabase Configuration
Edit `src/services/supabase.ts` and replace the placeholder values:

```typescript
const SUPABASE_URL = 'your-actual-project-url';
const SUPABASE_ANON_KEY = 'your-actual-anon-key';
```

## Installation & Setup

1. **Clone and install dependencies:**
   ```bash
   cd pattern-pals
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm start
   # or
   expo start
   ```

3. **Run on device:**
   - Scan the QR code with Expo Go app (iOS/Android)
   - Or press 'a' for Android emulator, 'i' for iOS simulator

## Project Structure

```
src/
├── components/        # Reusable UI components
├── data/             # Static data (patterns library)
├── hooks/            # Custom React hooks (auth, etc.)
├── navigation/       # Navigation configuration
├── screens/          # App screens
├── services/         # External services (Supabase)
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
```

## Key Features Implemented

### ✅ Authentication & User Management
- User registration with email/password
- Profile creation with juggling experience and preferences
- Secure authentication with Supabase

### ✅ Navigation & UI
- Tab-based navigation with 5 main screens
- Modern, clean UI with consistent design system
- Onboarding flow for new users

### ✅ Pattern Library
- 10 pre-loaded passing patterns with details
- Search and filter functionality
- Pattern difficulty levels and props
- Pattern status tracking (known/learning/avoiding)

### ✅ Matching System UI
- Mock match cards with compatibility scores
- Teaching/learning opportunity highlights
- Partner discovery interface

### ✅ Notifications System UI
- Notification feed with different types
- Read/unread status management
- Filter by notification type

### ✅ Profile Management
- User profile display
- Pattern statistics
- Settings and preferences access

## Next Steps for Full Implementation

1. **Backend Integration:**
   - Implement real matching algorithm
   - Add pattern status management
   - Implement notification sending

2. **Enhanced Features:**
   - Real-time availability matching
   - Session scheduling
   - Location-based matching
   - Push notifications

3. **Social Features:**
   - Messaging between matched users
   - Session feedback and ratings
   - Community events and workshops

4. **Performance:**
   - Image handling and optimization
   - Offline support
   - Caching strategies

## Development Commands

- `npm start` - Start development server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run web` - Run on web

## Troubleshooting

**Common Issues:**
1. **Metro bundler issues**: Clear cache with `expo start -c`
2. **Navigation errors**: Ensure all screen files are created
3. **Supabase connection**: Check your project URL and API keys
4. **TypeScript errors**: Run `npx tsc --noEmit` to check types

**Device Testing:**
- Ensure your device and computer are on the same network
- Try restarting the Expo Go app
- Check firewall settings if QR code doesn't work

## Contributing

1. Follow the existing code style and structure
2. Add TypeScript types for new features
3. Test on both iOS and Android
4. Update this README for new features

---

**Happy Juggling! 🤹‍♂️🤹‍♀️**
