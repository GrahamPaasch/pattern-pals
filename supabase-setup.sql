-- PatternPals Database Setup for Supabase
-- Run this entire script in Supabase Dashboard -> SQL Editor -> New Query

-- Enable Row Level Security and UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (for user search and profiles)
CREATE TABLE IF NOT EXISTS users (
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
CREATE TABLE IF NOT EXISTS connection_requests (
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
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  user1_name TEXT NOT NULL,
  user2_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User patterns table (for pattern library integration)
CREATE TABLE IF NOT EXISTS user_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pattern_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('known', 'want_to_learn', 'want_to_avoid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('new_match', 'session_reminder', 'session_invite', 'workshop_announcement', 'connection_request')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_users_experience ON users(experience);
CREATE INDEX IF NOT EXISTS idx_connection_requests_to_user ON connection_requests(to_user_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_from_user ON connection_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_status ON connection_requests(status);
CREATE INDEX IF NOT EXISTS idx_connections_user1 ON connections(user1_id);
CREATE INDEX IF NOT EXISTS idx_connections_user2 ON connections(user2_id);
CREATE INDEX IF NOT EXISTS idx_user_patterns_user_id ON user_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_connection_requests_updated_at ON connection_requests;
CREATE TRIGGER update_connection_requests_updated_at 
    BEFORE UPDATE ON connection_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table (users can read all, but only update their own)
CREATE POLICY "Users can view all users" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own data" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own data" ON users
    FOR UPDATE USING (true);

-- RLS Policies for connection_requests (users can see requests to/from them)
CREATE POLICY "Users can view their connection requests" ON connection_requests
    FOR SELECT USING (true);

CREATE POLICY "Users can create connection requests" ON connection_requests
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their connection requests" ON connection_requests
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete their connection requests" ON connection_requests
    FOR DELETE USING (true);

-- RLS Policies for connections (users can see their connections)
CREATE POLICY "Users can view their connections" ON connections
    FOR SELECT USING (true);

CREATE POLICY "Users can create connections" ON connections
    FOR INSERT WITH CHECK (true);

-- RLS Policies for user_patterns
CREATE POLICY "Users can view all user patterns" ON user_patterns
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their patterns" ON user_patterns
    FOR ALL USING (true);

-- RLS Policies for notifications
CREATE POLICY "Users can view their notifications" ON notifications
    FOR SELECT USING (true);

CREATE POLICY "Users can update their notifications" ON notifications
    FOR UPDATE USING (true);

-- Insert some sample data for testing (optional)
INSERT INTO users (id, name, email, experience, preferred_props, known_patterns, want_to_learn_patterns) VALUES
  ('demo-user-1', 'Demo User 1', 'demo1@example.com', 'Intermediate', ARRAY['clubs'], ARRAY['6 Count', 'Walking Pass'], ARRAY['645', 'Custom Double Spin']),
  ('demo-user-2', 'Demo User 2', 'demo2@example.com', 'Advanced', ARRAY['clubs', 'balls'], ARRAY['6 Count', '645', 'Custom Double Spin'], ARRAY['Chocolate Bar', 'Benzene Ring'])
ON CONFLICT (email) DO NOTHING;

-- Verify setup
SELECT 'Setup completed successfully! Tables created:' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'connection_requests', 'connections', 'user_patterns', 'notifications');
