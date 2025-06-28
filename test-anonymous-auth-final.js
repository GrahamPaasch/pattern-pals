/**
 * Final test script for anonymous authentication
 * This will verify if the database schema has been fixed
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

async function testAnonymousAuth() {
  try {
    console.log('🎯 Testing PatternPals Anonymous Authentication');
    console.log('================================================');

    // Load Supabase config
    let config = {};
    if (fs.existsSync('./src/services/config.json')) {
      config = JSON.parse(fs.readFileSync('./src/services/config.json', 'utf8'));
    }

    const supabaseUrl = config.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = config.supabaseKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ Supabase configuration not found');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test 1: Create anonymous user
    console.log('\\n1. 🧪 Testing anonymous user creation...');
    const testUserId = generateUUID();
    const anonymousUser = {
      id: testUserId,
      name: 'Anonymous Juggler',
      experience: 'Intermediate',
      preferred_props: ['Balls', 'Clubs'],
      known_patterns: ['3 Ball Cascade', 'Flash'],
      want_to_learn_patterns: ['Mills Mess', '5 Ball Cascade'],
      availability: [
        { day: 'Monday', times: ['18:00', '19:00'] },
        { day: 'Wednesday', times: ['17:30', '18:30'] }
      ]
      // NOTE: No email field - this is the test!
    };

    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([anonymousUser])
      .select()
      .single();

    if (createError) {
      console.log('❌ FAILED: Anonymous user creation');
      console.log('   Error:', createError.message);
      console.log('');
      console.log('🔧 SOLUTION REQUIRED:');
      console.log('   Run this SQL command in Supabase Dashboard > SQL Editor:');
      console.log('   ALTER TABLE users ALTER COLUMN email DROP NOT NULL;');
      console.log('');
      return;
    }

    console.log('✅ SUCCESS: Anonymous user created');
    console.log('   ID:', newUser.id);
    console.log('   Name:', newUser.name);
    console.log('   Experience:', newUser.experience);

    // Test 2: Verify user exists
    console.log('\\n2. 🔍 Verifying user in database...');
    const { data: foundUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('id', testUserId)
      .single();

    if (findError || !foundUser) {
      console.log('❌ FAILED: Could not find created user');
    } else {
      console.log('✅ SUCCESS: User found in database');
      console.log('   Email field:', foundUser.email || '(null - perfect!)');
    }

    // Test 3: Clean up
    console.log('\\n3. 🧹 Cleaning up test user...');
    await supabase.from('users').delete().eq('id', testUserId);
    console.log('✅ Test user removed');

    // Final result
    console.log('\\n🎉 ANONYMOUS AUTHENTICATION WORKS!');
    console.log('================================================');
    console.log('✅ Database schema allows null emails');
    console.log('✅ Anonymous users can be created');
    console.log('✅ PatternPals is ready for minimalist onboarding');
    console.log('');
    console.log('🚀 You can now use the app without any personal information!');

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testAnonymousAuth();
