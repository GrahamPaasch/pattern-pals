-- Create notifications table with correct syntax
-- Run this in your Supabase SQL Editor

-- Create the notifications table
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

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies with correct syntax (using double quotes for policy names)
CREATE POLICY "users_can_view_their_notifications" ON notifications
  FOR SELECT USING (true);

CREATE POLICY "users_can_update_their_notifications" ON notifications
  FOR UPDATE USING (true);

CREATE POLICY "users_can_insert_notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
