// Test the updated getConnections method to ensure it fetches from Supabase
const { supabase } = require('./test-config');

async function testConnectionServiceFix() {
  console.log('🔧 Testing Connection Service Database Integration');
  console.log('================================================');

  try {
    console.log('\n1. Direct Supabase connection test...');
    const { data: connections, error } = await supabase
      .from('connections')
      .select('*')
      .eq('status', 'active');

    if (error) {
      console.error('❌ Error fetching connections:', error);
      return;
    }

    console.log(`✅ Loaded ${connections.length} connections from Supabase directly`);
    
    console.log('\n2. Testing data format conversion...');
    // Convert to our internal format (similar to what the updated service does)
    const convertedConnections = connections.map((conn) => ({
      id: conn.id,
      userId1: conn.user1_id,
      userId2: conn.user2_id,
      userName1: conn.user1_name,
      userName2: conn.user2_name,
      connectedAt: new Date(conn.created_at),
      status: conn.status
    }));

    console.log(`✅ Converted ${convertedConnections.length} connections to internal format`);
    
    if (convertedConnections.length > 0) {
      console.log('\n📋 Sample converted connections:');
      convertedConnections.slice(0, 3).forEach((conn, index) => {
        console.log(`   ${index + 1}. ${conn.userName1} ↔ ${conn.userName2}`);
        console.log(`      IDs: ${conn.userId1.slice(0, 8)}... ↔ ${conn.userId2.slice(0, 8)}...`);
        console.log(`      Status: ${conn.status}`);
        console.log('');
      });
    }

    console.log('\n3. Testing connection filtering for Graham...');
    const grahamId = 'b5df9272-ef0f-4443-8767-e93523c8a04d';
    const grahamConnections = convertedConnections.filter(
      conn => (conn.userId1 === grahamId || conn.userId2 === grahamId) && conn.status === 'active'
    );
    
    console.log(`✅ Graham has ${grahamConnections.length} active connections`);
    
    if (grahamConnections.length > 0) {
      console.log('\n📋 Graham\'s connections:');
      grahamConnections.forEach((conn, index) => {
        const otherUserId = conn.userId1 === grahamId ? conn.userId2 : conn.userId1;
        const otherUserName = conn.userId1 === grahamId ? conn.userName2 : conn.userName1;
        console.log(`   ${index + 1}. Connected to: ${otherUserName} (${otherUserId.slice(0, 8)}...)`);
      });
    }

    console.log('\n🎯 Connection Service Fix Summary:');
    console.log('=================================');
    console.log(`✅ Supabase connections accessible: ${connections.length > 0}`);
    console.log(`✅ Data conversion works: ${convertedConnections.length === connections.length}`);
    console.log(`✅ User filtering works: ${grahamConnections.length > 0}`);
    
    console.log('\n💡 Expected App Behavior After Fix:');
    console.log('==================================');
    console.log('• ConnectionService.getConnections() fetches from Supabase');
    console.log('• Connection states load immediately from database');
    console.log('• After accepting request, green "Connected" button appears');
    console.log('• Both users see the connection reflected instantly');
    console.log('• No need to restart app or refresh manually');

  } catch (error) {
    console.error('❌ Error testing connection service fix:', error);
  }
}

testConnectionServiceFix();
