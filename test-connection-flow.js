// Quick test to verify connection requests are loading properly
const { supabase } = require('./test-config');

async function testConnectionFlow() {
  console.log('🧪 Testing Connection Request Flow');
  console.log('==================================');

  try {
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email');

    if (usersError) {
      console.error('❌ Users error:', usersError);
      return;
    }

    console.log('\n👥 Available Users:');
    users.forEach(user => {
      console.log(`   ${user.name} (${user.id.substring(0, 8)}...)`);
    });

    // Check current connection requests
    const { data: requests, error: requestsError } = await supabase
      .from('connection_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (requestsError) {
      console.error('❌ Requests error:', requestsError);
      return;
    }

    console.log('\n📨 Current Connection Requests:');
    if (requests.length === 0) {
      console.log('   No connection requests found');
    } else {
      requests.forEach(req => {
        console.log(`   ${req.from_user_name} → ${req.to_user_name} (${req.status})`);
        console.log(`     Request ID: ${req.id}`);
        console.log(`     Created: ${new Date(req.created_at).toLocaleString()}`);
        if (req.message) console.log(`     Message: "${req.message}"`);
        console.log('');
      });
    }

    // For testing: Let's check specific users that would show up in Graham's requests tab
    const graham = users.find(u => u.name === 'Graham Paasch');
    if (graham) {
      console.log(`\n🔍 Connection Requests FOR Graham (${graham.id.substring(0, 8)}...):`);
      const grahamRequests = requests.filter(req => req.to_user_id === graham.id && req.status === 'pending');
      
      if (grahamRequests.length === 0) {
        console.log('   No pending incoming requests for Graham');
      } else {
        grahamRequests.forEach(req => {
          console.log(`   📩 From: ${req.from_user_name}`);
          console.log(`     Message: "${req.message || 'No message'}"`);
          console.log(`     Created: ${new Date(req.created_at).toLocaleString()}`);
        });
      }

      console.log(`\n📤 Connection Requests FROM Graham:`);
      const grahamSentRequests = requests.filter(req => req.from_user_id === graham.id && req.status === 'pending');
      
      if (grahamSentRequests.length === 0) {
        console.log('   No pending outgoing requests from Graham');
      } else {
        grahamSentRequests.forEach(req => {
          console.log(`   📨 To: ${req.to_user_name}`);
          console.log(`     Message: "${req.message || 'No message'}"`);
          console.log(`     Created: ${new Date(req.created_at).toLocaleString()}`);
        });
      }
    }

    // Check current connections
    const { data: connections, error: connectionsError } = await supabase
      .from('connections')
      .select('*');

    if (!connectionsError) {
      console.log('\n🤝 Current Connections:');
      if (connections.length === 0) {
        console.log('   No connections found');
      } else {
        connections.forEach(conn => {
          console.log(`   ${conn.user1_name} ↔ ${conn.user2_name} (${conn.status})`);
        });
      }
    }

    console.log('\n✅ Connection flow test complete!');
    console.log('\n💡 In the app:');
    console.log('   • "Connect" button = Send new request');
    console.log('   • "Pending" button (yellow) = Request sent, waiting for response');
    console.log('   • "Connected" button (green) = Users are connected');
    console.log('   • Requests tab = Shows incoming requests that need response');

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

testConnectionFlow();
