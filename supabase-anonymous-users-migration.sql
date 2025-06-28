-- Migration to support anonymous users in PatternPals
-- This makes the email field nullable to support anonymous authentication
-- Run this in Supabase Dashboard -> SQL Editor -> New Query

-- Remove the NOT NULL constraint from email column
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Drop the unique constraint on email since we'll have many NULL emails
DROP INDEX IF EXISTS idx_users_email;

-- Create a new partial unique index that only applies to non-NULL emails
CREATE UNIQUE INDEX idx_users_email_unique ON users(email) WHERE email IS NOT NULL;

-- Update the email index to be partial (only for non-NULL emails)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;

-- Remove the sample data with hardcoded emails since we're going anonymous
DELETE FROM users WHERE email IN ('demo1@example.com', 'demo2@example.com');

-- Verify the changes
SELECT 'Migration completed successfully!' as status;
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'email';
