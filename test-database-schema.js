// Test script to check database schema and run migration if needed
const { createClient } = require('@supabase/supabase-js');

// Test if database allows NULL emails
async function testDatabaseSchema() {
  try {
    // Check if we have Supabase config
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.log('❌ Supabase not configured - skipping database test');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    console.log('🔍 Testing database schema for anonymous users...');
    
    // Try to create a test user without email
    const testUser = {
      id: 'test-anonymous-' + Date.now(),
      name: 'Test Anonymous User',
      experience: 'Beginner',
      preferred_props: ['clubs'],
      known_patterns: [],
      want_to_learn_patterns: []
    };
    
    const { data, error } = await supabase
      .from('users')
      .insert([testUser])
      .select()
      .single();
    
    if (error) {
      if (error.message.includes('null value in column "email"')) {
        console.log('❌ Database schema needs migration - email column is NOT NULL');
        console.log('📝 Please run the migration script: supabase-anonymous-users-migration.sql');
        console.log('   1. Open Supabase Dashboard');
        console.log('   2. Go to SQL Editor');
        console.log('   3. Create New Query');
        console.log('   4. Paste the migration script');
        console.log('   5. Run the query');
        return false;
      } else {
        console.log('❌ Other database error:', error.message);
        return false;
      }
    } else {
      console.log('✅ Database schema supports anonymous users!');
      
      // Clean up test user
      await supabase.from('users').delete().eq('id', testUser.id);
      console.log('🧹 Test user cleaned up');
      return true;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Run the test
testDatabaseSchema()
  .then(success => {
    if (success) {
      console.log('\n🎉 Database is ready for anonymous authentication!');
    } else {
      console.log('\n🚨 Database migration required before anonymous auth will work');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test script failed:', error);
    process.exit(1);
  });
