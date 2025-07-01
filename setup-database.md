# 🔧 Fix: Database Setup Required

## The Issue
Your app is showing the error: `"relation 'public.users' does not exist"`

This means your Supabase project is connected correctly, but the database tables haven't been created yet.

## Quick Fix - Copy & Paste This SQL

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard/project/dmmimfrfclaswkuqtldz
2. **Click "SQL Editor"** in the left sidebar
3. **Click "New Query"**
4. **Copy and paste this entire SQL script:**

```sql
-- PatternPals Database Setup - Quick Fix
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (for user search and profiles)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar TEXT,
  experience TEXT NOT NULL CHECK (experience IN ('Beginner', 'Intermediate', 'Advanced')),
  preferred_props TEXT[] DEFAULT '{}',
  availability JSONB DEFAULT '[]',
  location TEXT,
  bio TEXT,
  known_patterns TEXT[] DEFAULT '{}',
  want_to_learn_patterns TEXT[] DEFAULT '{}',
  avoid_patterns TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Connection requests table
CREATE TABLE connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  from_user_name TEXT NOT NULL,
  to_user_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Connections table (for accepted connections)
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  user1_name TEXT NOT NULL,
  user2_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User patterns table
CREATE TABLE user_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pattern_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('known', 'want_to_learn', 'want_to_avoid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_connection_requests_to_user ON connection_requests(to_user_id);
CREATE INDEX idx_connection_requests_from_user ON connection_requests(from_user_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_patterns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all operations for now)
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations on connection_requests" ON connection_requests FOR ALL USING (true);
CREATE POLICY "Allow all operations on connections" ON connections FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_patterns" ON user_patterns FOR ALL USING (true);
```

5. **Click "Run"** to execute the script
6. **Restart your app** - Press Ctrl+C in the terminal, then run `npm start` again

## After Running the SQL

✅ The error should be fixed
✅ User search will work cross-device
✅ Connection requests will work properly

## Verify It's Working

1. Open your app
2. Go to the "Search" tab
3. Click "🔍 Debug: Show All Users" - you should see your inserted users
4. The backend status should show "🟢 Supabase"

---

**That's it! Your database is now properly set up and the error should be gone.**
