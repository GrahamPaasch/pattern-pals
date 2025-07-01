# 🚀 URGENT: Fix User Search Issue

## Problem: Users can't find each other

You're using demo Supabase credentials, so the app falls back to local storage. This means users are only stored on their own devices and can't see each other.



## Permanent Fix (5 minutes) - Real Backend:

### Step 1: Create Supabase Account
1. Go to [supabase.com](https://supabase.com)
2. Sign up/login
3. Click "New Project"
4. Choose organization and enter project details
5. Wait for project to be created (1-2 minutes)

### Step 2: Get Your Credentials
1. In your Supabase dashboard, go to **Settings** (⚙️) → **API**
2. Copy your **Project URL** (looks like: `https://abcdefg.supabase.co`)
3. Copy your **anon public key** (long string starting with `eyJ...`)

### Step 3: Update .env File
1. Open the `.env` file in your project
2. Replace these lines:
```
EXPO_PUBLIC_SUPABASE_URL=https://abcdefg.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

### Step 4: Create Database Tables
In your Supabase dashboard, go to **SQL Editor** → **New Query** and run:

```sql
-- Users table (for user search)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar TEXT,
  experience TEXT NOT NULL CHECK (experience IN ('Beginner', 'Intermediate', 'Advanced')),
  preferred_props TEXT[] DEFAULT '{}',
  location TEXT,
  bio TEXT,
  known_patterns TEXT[] DEFAULT '{}',
  want_to_learn_patterns TEXT[] DEFAULT '{}',
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

-- Connections table  
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  user1_name TEXT NOT NULL,
  user2_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_connection_requests_to_user ON connection_requests(to_user_id);
CREATE INDEX idx_connection_requests_from_user ON connection_requests(from_user_id);
CREATE INDEX idx_connections_user1 ON connections(user1_id);
CREATE INDEX idx_connections_user2 ON connections(user2_id);
```

### Step 5: Restart App
1. Stop Expo server (Ctrl+C)
2. Run `npm start` again
3. Check the app - you should see **"🟢 Supabase"** status
4. Users will now sync across all devices!

## Troubleshooting:

**Still seeing "🔴 Local Storage"?**
- Double-check your .env file values
- Make sure URL starts with `https://` and ends with `.supabase.co`
- Restart the Expo server completely

**Users still not appearing?**
- Use "🔍 Debug: Show All Users" to see what's in the system
- Check Supabase dashboard → Table Editor → users table
- Make sure both devices show "🟢 Supabase" status

**Need to start fresh?**
- Use "🗑️ Clear All Stored Users" to reset local storage
- This will force the app to use the backend only

The user search issue will be completely resolved once Supabase is set up! 🎉
