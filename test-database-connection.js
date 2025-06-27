// Quick test to verify Supabase database connection and UUID handling
const { supabase } = require('./test-config');

async function testDatabaseConnection() {
  console.log('🔍 Testing Supabase database connection...');
  
  try {
    // Test 1: Check if users table exists and get all users
    console.log('\n1. Testing users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(10);
    
    if (usersError) {
      console.error('❌ Users table error:', usersError.message);
      if (usersError.message.includes('relation "public.users" does not exist')) {
        console.log('💡 Solution: Run the SQL schema in your Supabase dashboard');
        console.log('📋 Copy the SQL from setup-database.md and run it in SQL Editor');
        return;
      }
    } else {
      console.log('✅ Users table exists');
      console.log(`📊 Found ${users.length} users in database`);
      users.forEach(user => {
        console.log(`   - ${user.name} (${user.email})`);
      });
    }

    // Test 2: Check connection_requests table
    console.log('\n2. Testing connection_requests table...');
    const { data: requests, error: requestsError } = await supabase
      .from('connection_requests')
      .select('*')
      .limit(5);
    
    if (requestsError) {
      console.error('❌ Connection requests table error:', requestsError.message);
    } else {
      console.log('✅ Connection requests table exists');
      console.log(`📊 Found ${requests.length} connection requests`);
    }

    // Test 3: Test UUID generation
    console.log('\n3. Testing UUID generation...');
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    const testUUID = generateUUID();
    console.log(`✅ Generated test UUID: ${testUUID}`);
    
    // Test UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    console.log(`✅ UUID format valid: ${uuidRegex.test(testUUID)}`);

    console.log('\n🎉 Database connection test completed!');
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
  }
}

testDatabaseConnection();
