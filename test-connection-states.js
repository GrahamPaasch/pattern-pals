// Test script to verify connection state updates after accepting requests
const { supabase } = require('./test-config');

async function testConnectionStateUpdates() {
  console.log('🔄 Testing Connection State Updates After Request Acceptance');
  console.log('==========================================================');

  try {
    // First, let's see what connections exist in the database
    console.log('\n1. Current connections in database:');
    const { data: connections, error: connectionsError } = await supabase
      .from('connections')
      .select('*')
      .eq('status', 'active');

    if (connectionsError) {
      console.error('❌ Error fetching connections:', connectionsError);
    } else {
      console.log(`✅ Found ${connections.length} active connections:`);
      connections.forEach((conn, index) => {
        console.log(`   ${index + 1}. ${conn.user1_name} ↔ ${conn.user2_name}`);
        console.log(`      IDs: ${conn.user1_id} ↔ ${conn.user2_id}`);
        console.log(`      Created: ${new Date(conn.created_at).toLocaleString()}`);
        console.log('');
      });
    }

    // Next, let's see what requests are still pending
    console.log('\n2. Pending connection requests:');
    const { data: requests, error: requestsError } = await supabase
      .from('connection_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (requestsError) {
      console.error('❌ Error fetching requests:', requestsError);
    } else {
      console.log(`📨 Found ${requests.length} pending requests:`);
      requests.forEach((req, index) => {
        console.log(`   ${index + 1}. ${req.from_user_name} → ${req.to_user_name}`);
        console.log(`      IDs: ${req.from_user_id} → ${req.to_user_id}`);
        console.log(`      Created: ${new Date(req.created_at).toLocaleString()}`);
        console.log('');
      });
    }

    // Let's also check what happens for a specific user (Graham)
    const { data: users } = await supabase
      .from('users')
      .select('id, name')
      .eq('name', 'Graham Paasch')
      .limit(1);

    if (users && users.length > 0) {
      const graham = users[0];
      console.log(`\n3. Connection states for ${graham.name}:`);
      console.log('=====================================');

      // Get his connections
      const grahamConnections = connections.filter(conn => 
        conn.user1_id === graham.id || conn.user2_id === graham.id
      );

      // Get incoming requests
      const incomingRequests = requests.filter(req => 
        req.to_user_id === graham.id
      );

      // Get outgoing requests
      const outgoingRequests = requests.filter(req => 
        req.from_user_id === graham.id
      );

      console.log(`✅ Connected to ${grahamConnections.length} users:`);
      grahamConnections.forEach(conn => {
        const otherUser = conn.user1_id === graham.id ? conn.user2_name : conn.user1_name;
        console.log(`   🟢 ${otherUser} (connected)`);
      });

      console.log(`📥 ${incomingRequests.length} incoming requests:`);
      incomingRequests.forEach(req => {
        console.log(`   🔵 ${req.from_user_name} (pending_in - needs response)`);
      });

      console.log(`📤 ${outgoingRequests.length} outgoing requests:`);
      outgoingRequests.forEach(req => {
        console.log(`   🟡 ${req.to_user_name} (pending_out - waiting for response)`);
      });

      console.log('\n🎯 Expected button states in app:');
      console.log('================================');
      
      // For each connection, Graham should see "✓ Connected" (green)
      grahamConnections.forEach(conn => {
        const otherUser = conn.user1_id === graham.id ? conn.user2_name : conn.user1_name;
        console.log(`   ${otherUser}: ✓ Connected (green, disabled)`);
      });

      // For each incoming request, Graham should see "↗️ Respond" (blue)
      incomingRequests.forEach(req => {
        console.log(`   ${req.from_user_name}: ↗️ Respond (blue, clickable)`);
      });

      // For each outgoing request, Graham should see "⏳ Pending" (yellow)
      outgoingRequests.forEach(req => {
        console.log(`   ${req.to_user_name}: ⏳ Pending (yellow, disabled)`);
      });

      // All other users should show "Connect" (purple)
      console.log('   Other users: Connect (purple, clickable)');
    }

    console.log('\n💡 How to test the fix:');
    console.log('======================');
    console.log('1. Open PatternPals app');
    console.log('2. Sign in as "Graham Paasch"');
    console.log('3. Go to Requests tab and accept any pending requests');
    console.log('4. Check that the button changes to "✓ Connected" (green)');
    console.log('5. Switch to Search tab and verify the same user shows "✓ Connected"');
    console.log('6. Sign out and sign in as the other user');
    console.log('7. Verify they also see "✓ Connected" for Graham');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testConnectionStateUpdates();
