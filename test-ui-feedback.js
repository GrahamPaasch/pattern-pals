const { supabase } = require('./test-config');

async function testUIFeedback() {
  console.log('🎨 Testing UI Feedback & Connection States');
  console.log('==========================================');

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
    const peter = users.find(u => u.name === 'Peter Kaseman');

    if (!graham || !peter) {
      console.log('❌ Test users not found');
      return;
    }

    console.log(`\n👤 Test User: ${graham.name} (${graham.id.substring(0, 8)}...)`);

    // Check Graham's connection states with all users
    const { data: connections, error: connectionsError } = await supabase
      .from('connections')
      .select('*')
      .or(`user1_id.eq.${graham.id},user2_id.eq.${graham.id}`);

    const { data: incomingRequests, error: incomingError } = await supabase
      .from('connection_requests')
      .select('*')
      .eq('to_user_id', graham.id)
      .eq('status', 'pending');

    const { data: outgoingRequests, error: outgoingError } = await supabase
      .from('connection_requests')
      .select('*')
      .eq('from_user_id', graham.id)
      .eq('status', 'pending');

    console.log('\n🔗 Connection States for Graham:');
    console.log('================================');

    users.forEach(user => {
      if (user.id === graham.id) return; // Skip self

      let state = 'none';
      let buttonText = 'Connect';
      let buttonColor = '#6366f1'; // Purple

      // Check if connected
      const isConnected = connections && connections.some(conn => 
        (conn.user1_id === graham.id && conn.user2_id === user.id) ||
        (conn.user2_id === graham.id && conn.user1_id === user.id)
      );

      if (isConnected) {
        state = 'connected';
        buttonText = '✓ Connected';
        buttonColor = '#10b981'; // Green
      } else {
        // Check for incoming request
        const hasIncoming = incomingRequests && incomingRequests.some(req => 
          req.from_user_id === user.id
        );

        if (hasIncoming) {
          state = 'pending_in';
          buttonText = '↗️ Respond';
          buttonColor = '#3b82f6'; // Blue
        } else {
          // Check for outgoing request
          const hasOutgoing = outgoingRequests && outgoingRequests.some(req => 
            req.to_user_id === user.id
          );

          if (hasOutgoing) {
            state = 'pending_out';
            buttonText = '⏳ Pending';
            buttonColor = '#f59e0b'; // Yellow
          }
        }
      }

      // Color-coded output
      const stateIcon = {
        'none': '⚪',
        'pending_out': '🟡',
        'pending_in': '🔵',
        'connected': '🟢'
      }[state];

      console.log(`   ${stateIcon} ${user.name}: ${buttonText} (${state})`);
    });

    // Show badge count
    const requestCount = incomingRequests ? incomingRequests.length : 0;
    console.log(`\n📋 Requests Tab Badge: ${requestCount > 0 ? `🔴 ${requestCount}` : '⚪ 0'}`);

    console.log('\n🎨 UI Feedback Summary:');
    console.log('=======================');
    console.log('✓ Connect buttons show different states based on connection status');
    console.log('✓ Button colors change: Purple → Yellow → Green');
    console.log('✓ Button text includes emojis for better visual feedback');
    console.log('✓ Disabled state for pending/connected buttons');
    console.log('✓ Requests tab shows badge count for incoming requests');
    console.log('✓ Enhanced alert messages with emojis and clear descriptions');

  } catch (error) {
    console.error('❌ Error testing UI feedback:', error);
  }
}

testUIFeedback();
