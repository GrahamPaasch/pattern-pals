# 🚀 Quick Setup Guide for PatternPals Cross-Device Features

## Current Status
Your PatternPals app is currently using **local storage** for user profiles and connection requests. This means:
- ❌ Users can't find each other in the search (GRAHAM and PTRKASEMAN won't see each other)
- ❌ Connection requests are only visible on the device that sent them
- ❌ No real-time sync between users on different devices

## 🛠️ Enable Real Backend (5 minutes)

To enable **cross-device user search and connection requests** that work properly between users:

### 1. Create a Supabase Account
1. Go to [supabase.com](https://supabase.com)
2. Sign up for a free account
3. Create a new project

### 2. Get Your Credentials
1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy your **Project URL** (looks like: `https://your-project.supabase.co`)
3. Copy your **anon/public key** (long string starting with `eyJ...`)

### 3. Update Your .env File
1. Open the `.env` file in your project root
2. Replace the demo values:
```bash
# Replace these with your actual values:
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

### 4. Create Database Tables
In your Supabase dashboard, go to **SQL Editor** and run this:
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

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_connection_requests_updated_at BEFORE UPDATE ON connection_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 5. Restart Your App
1. Stop the Expo server (Ctrl+C)
2. Run `npm start` again
3. Check the app - you should now see "🟢 Supabase" in the backend status

## ✅ You're Done!
- **User Search**: GRAHAM and PTRKASEMAN can now find each other in the search tab
- **Connection requests**: Work across devices and sync in real-time  
- **Shared profiles**: All user profiles are visible to everyone
- **Professional backend**: Using enterprise-grade Supabase infrastructure

## 🔧 Troubleshooting

**Still seeing "🔴 Local Storage"?**
- Double-check your .env file values
- Make sure the Supabase URL starts with `https://` and ends with `.supabase.co`
- Restart the Expo server completely

**Users still can't find each other?**
- Use the "🔍 Debug: Show All Users" button in the search tab
- Check if both users appear in the list
- Make sure both devices are using the Supabase backend (🟢 status)
- Check the Supabase dashboard to see if users appear in the `users` table

**Connection requests not appearing?**
- Make sure both users are using the Supabase backend
- Check the Supabase dashboard for any table data
- Use the "🐛 Debug" button in the app to see all requests

**Need help?**
Check the full `SETUP.md` file for detailed instructions, or open an issue if you encounter problems.
