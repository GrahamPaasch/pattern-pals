# Database Schema Fix Required

## Issue
The PatternPals app has been successfully updated to use anonymous authentication (no email/password required), but the Supabase database still has a NOT NULL constraint on the `email` field in the `users` table. This prevents anonymous users from being created.

## Error
```
null value in column "email" of relation "users" violates not-null constraint
```

## Quick Fix (Required)

### Option 1: Manual SQL Update (Recommended)
1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Create a new query and run:
   ```sql
   ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
   ```
4. Click **Run** to execute

### Option 2: Recreate Table (Alternative)
If the above doesn't work, you can recreate the table:
1. Go to **Supabase Dashboard > SQL Editor**
2. Run the complete `supabase-setup.sql` script from this project
3. This will recreate all tables with the correct schema

## Verify Fix
After making the change, run this command to test:
```bash
node fix-email-nullable.js
```

You should see:
```
✅ Anonymous user creation works! Test user created: Test Anonymous User
🧹 Test user cleaned up
🎉 Email field is already nullable - anonymous authentication should work!
```

## What This Enables
- ✅ Anonymous user registration (no email/password)
- ✅ Minimalist onboarding (name, experience, props only)
- ✅ Full app functionality without personal information
- ✅ Privacy-focused authentication

## Code Changes Already Complete
- ✅ Updated navigation to use anonymous auth
- ✅ SimpleAuthService implemented
- ✅ WelcomeScreen for minimal onboarding
- ✅ Removed all email/password requirements from UI

## Next Steps
1. Fix the database schema (above)
2. Test the app end-to-end
3. Verify all features work with anonymous users
