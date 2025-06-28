// Test script to debug connection acceptance flow
const { supabase } = require('./test-config');

async function testConnectionAcceptance() {
  console.log('🧪 Testing Connection Request Acceptance Flow');
  console.log('===========================================');

  try {
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email');

    if (usersError) {
      console.error('❌ Users error:', usersError);
      return;
    }

    const graham = users.find(u => u.name === 'Graham Paasch');
    if (!graham) {
      console.log('❌ Graham not found');
      return;
    }

    console.log(`\n1. Current state for Graham (${graham.id.substring(0, 8)}...)`);
    
    // Check Graham's incoming requests
    const { data: incomingRequests, error: requestsError } = await supabase
      .from('connection_requests')
      .select('*')
      .eq('to_user_id', graham.id)
      .eq('status', 'pending');

    if (requestsError) {
      console.error('❌ Requests error:', requestsError);
      return;
    }

    console.log(`📨 Graham has ${incomingRequests.length} pending incoming requests:`);
    incomingRequests.forEach((req, index) => {
      console.log(`   ${index + 1}. From: ${req.from_user_name} (ID: ${req.id})`);
      console.log(`      Message: "${req.message || 'No message'}"`);
    });

    if (incomingRequests.length === 0) {
      console.log('❌ No requests to accept');
      return;
    }

    const testRequest = incomingRequests[0];
    console.log(`\n2. Simulating acceptance of request from ${testRequest.from_user_name}...`);

    // Simulate accepting the request (what the ConnectionService.acceptConnectionRequest does)
    
    // Step 1: Update request status to 'accepted'
    const { error: updateError } = await supabase
      .from('connection_requests')
      .update({ 
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', testRequest.id);

    if (updateError) {
      console.error('❌ Error updating request:', updateError);
      return;
    }

    console.log('✅ Step 1: Request status updated to "accepted"');

    // Step 2: Create connection in database
    const connectionData = {
      user1_id: testRequest.from_user_id,
      user2_id: testRequest.to_user_id,
      user1_name: testRequest.from_user_name,
      user2_name: testRequest.to_user_name,
      status: 'active'
    };

    const { data: newConnection, error: connectionError } = await supabase
      .from('connections')
      .insert(connectionData)
      .select()
      .single();

    if (connectionError) {
      console.error('❌ Error creating connection:', connectionError);
      return;
    }

    console.log('✅ Step 2: Connection created in database');
    console.log(`   Connection ID: ${newConnection.id}`);

    // Step 3: Verify the connection is now visible
    console.log('\n3. Verifying connection visibility...');

    const { data: connections, error: connectionsError } = await supabase
      .from('connections')
      .select('*')
      .eq('status', 'active')
      .or(`user1_id.eq.${graham.id},user2_id.eq.${graham.id}`);

    if (!connectionsError) {
      console.log(`✅ Graham now has ${connections.length} active connections:`);
      connections.forEach((conn, index) => {
        const otherUserName = conn.user1_id === graham.id ? conn.user2_name : conn.user1_name;
        console.log(`   ${index + 1}. Connected with: ${otherUserName}`);
      });
    }

    // Step 4: Check what the UI should show
    console.log('\n4. UI State Analysis:');
    console.log('=====================');
    
    const otherUserId = testRequest.from_user_id;
    const otherUserName = testRequest.from_user_name;
    
    console.log(`For user ${otherUserName} (${otherUserId.substring(0, 8)}...):`);
    console.log(`✅ Should show: "✓ Connected" (Green button)`);
    console.log(`✅ Button should be disabled`);
    console.log(`✅ Both users should see the same state`);

    // Step 5: What might be going wrong in the app
    console.log('\n5. Potential Issues in App:');
    console.log('===========================');
    console.log('❓ Is getConnectionsForUser() properly fetching from database?');
    console.log('❓ Is loadConnectionStates() being called after acceptance?');
    console.log('❓ Are the user IDs matching correctly?');
    console.log('❓ Is there a race condition in the UI refresh?');

    // Step 6: Test the user perspective
    console.log('\n6. From both user perspectives:');
    console.log('===============================');
    
    // Graham's perspective (the accepter)
    const grahamConnections = connections.filter(conn => 
      conn.user1_id === graham.id || conn.user2_id === graham.id
    );
    console.log(`Graham's connections: ${grahamConnections.length}`);
    grahamConnections.forEach(conn => {
      const otherUser = conn.user1_id === graham.id ? 
        { id: conn.user2_id, name: conn.user2_name } : 
        { id: conn.user1_id, name: conn.user1_name };
      console.log(`   - Should see "${otherUser.name}" as "✓ Connected"`);
    });

    // Other user's perspective (the requester)
    const otherUser = users.find(u => u.id === testRequest.from_user_id);
    if (otherUser) {
      const otherUserConnections = connections.filter(conn => 
        conn.user1_id === otherUser.id || conn.user2_id === otherUser.id
      );
      console.log(`${otherUser.name}'s connections: ${otherUserConnections.length}`);
      otherUserConnections.forEach(conn => {
        const connectedUser = conn.user1_id === otherUser.id ? 
          { id: conn.user2_id, name: conn.user2_name } : 
          { id: conn.user1_id, name: conn.user1_name };
        console.log(`   - Should see "${connectedUser.name}" as "✓ Connected"`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testConnectionAcceptance();
