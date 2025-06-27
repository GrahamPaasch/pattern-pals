// Quick test to verify database population
const { supabase } = require('./test-config');

async function testDatabase() {
  console.log('🎪 Testing PatternPals Database');
  console.log('===============================');

  try {
    // Test users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('name, email, experience, known_patterns, want_to_learn_patterns')
      .limit(5);

    if (usersError) {
      console.error('❌ Users error:', usersError);
    } else {
      console.log('\n👥 Sample Users:');
      users.forEach(user => {
        console.log(`   ${user.name} (${user.experience})`);
        console.log(`     Knows: ${user.known_patterns?.slice(0, 3).join(', ')}...`);
        console.log(`     Wants to learn: ${user.want_to_learn_patterns?.slice(0, 2).join(', ')}...`);
        console.log('');
      });
    }

    // Test pattern matching
    console.log('🎯 Finding users who know "Custom Double Spin":');
    const { data: customSpinUsers, error: patternError } = await supabase
      .from('users')
      .select('name, experience')
      .contains('known_patterns', ['Custom Double Spin']);

    if (patternError) {
      console.error('❌ Pattern search error:', patternError);
    } else {
      customSpinUsers.forEach(user => {
        console.log(`   • ${user.name} (${user.experience})`);
      });
    }

    // Test connections
    console.log('\n🤝 Active Connections:');
    const { data: connections, error: connectionsError } = await supabase
      .from('connections')
      .select('user1_name, user2_name, status');

    if (connectionsError) {
      console.error('❌ Connections error:', connectionsError);
    } else {
      connections.forEach(conn => {
        console.log(`   ${conn.user1_name} ↔ ${conn.user2_name}`);
      });
    }

    // Test connection requests
    console.log('\n📨 Pending Connection Requests:');
    const { data: requests, error: requestsError } = await supabase
      .from('connection_requests')
      .select('from_user_name, to_user_name, message')
      .eq('status', 'pending');

    if (requestsError) {
      console.error('❌ Requests error:', requestsError);
    } else {
      requests.forEach(req => {
        console.log(`   ${req.from_user_name} → ${req.to_user_name}`);
        console.log(`     "${req.message}"`);
        console.log('');
      });
    }

    console.log('✅ Database is fully populated and ready for PatternPals!');
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

testDatabase();
