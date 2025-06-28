/**
 * Migration script to make email field nullable in users table
 * This allows anonymous users to be created without email addresses
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Generate UUID helper
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function fixEmailNullable() {
  try {
    console.log('🔧 Starting email field migration...');

    // Load Supabase config
    let config = {};
    if (fs.existsSync('./src/services/config.json')) {
      config = JSON.parse(fs.readFileSync('./src/services/config.json', 'utf8'));
    }

    const supabaseUrl = config.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = config.supabaseKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ Supabase configuration not found');
      console.log('   Please ensure config.json exists or environment variables are set');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Test if we can create an anonymous user
    console.log('🧪 Testing anonymous user creation...');
    const testUserId = generateUUID();
    const { data: testUser, error: testError } = await supabase
      .from('users')
      .insert([{
        id: testUserId,
        name: 'Test Anonymous User',
        experience: 'Beginner',
        preferred_props: ['Balls'],
        known_patterns: [],
        want_to_learn_patterns: []
        // Note: no email field
      }])
      .select()
      .single();

    if (testError) {
      console.log('❌ Anonymous user creation failed:', testError.message);
      console.log('💡 The email field is likely still required. You need to run this SQL command in Supabase dashboard:');
      console.log('   ALTER TABLE users ALTER COLUMN email DROP NOT NULL;');
      console.log('');
      console.log('📋 Steps to fix:');
      console.log('   1. Go to your Supabase dashboard');
      console.log('   2. Navigate to SQL Editor');
      console.log('   3. Run: ALTER TABLE users ALTER COLUMN email DROP NOT NULL;');
      console.log('   4. Then run this script again to test');
    } else {
      console.log('✅ Anonymous user creation works! Test user created:', testUser.name);
      
      // Clean up test user
      await supabase.from('users').delete().eq('id', testUserId);
      console.log('🧹 Test user cleaned up');
      console.log('🎉 Email field is already nullable - anonymous authentication should work!');
    }

  } catch (error) {
    console.log('❌ Migration test failed:', error.message);
  }
}

fixEmailNullable();
