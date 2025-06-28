// Debug script to investigate connection request filtering issue
const { supabase } = require('./test-config');

async function debugConnectionRequests() {
  console.log('🔍 Debugging Connection Request Filtering Issue');
  console.log('==============================================');

  try {
    // Step 1: Get all users and their IDs
    console.log('\n👥 All Users in Database:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email')
      .order('name');

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (${user.email})`);
      console.log(`      ID: ${user.id}`);
      console.log(`      ID Length: ${user.id.length}`);
      console.log(`      ID Type: ${typeof user.id}`);
      console.log('');
    });

    // Step 2: Get all connection requests and show exact format
    console.log('\n📨 All Connection Requests in Database:');
    const { data: requests, error: requestsError } = await supabase
      .from('connection_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (requestsError) {
      console.error('❌ Error fetching requests:', requestsError);
      return;
    }

    if (requests.length === 0) {
      console.log('   No connection requests found in database');
    } else {
      requests.forEach((req, index) => {
        console.log(`   Request ${index + 1}:`);
        console.log(`     ID: ${req.id}`);
        console.log(`     From: ${req.from_user_name} (ID: "${req.from_user_id}")`);
        console.log(`     To: ${req.to_user_name} (ID: "${req.to_user_id}")`);
        console.log(`     Status: ${req.status}`);
        console.log(`     Message: ${req.message || 'No message'}`);
        console.log(`     From ID Length: ${req.from_user_id?.length || 'null'}`);
        console.log(`     To ID Length: ${req.to_user_id?.length || 'null'}`);
        console.log(`     From ID Type: ${typeof req.from_user_id}`);
        console.log(`     To ID Type: ${typeof req.to_user_id}`);
        console.log('');
      });
    }

    // Step 3: Test filtering for each user
    console.log('\n🎯 Testing Request Filtering for Each User:');
    for (const user of users) {
      console.log(`\n   Testing for ${user.name} (ID: "${user.id}"):`);
      
      // Filter incoming requests (user is recipient)
      const incomingRequests = requests.filter(req => {
        const matches = req.to_user_id === user.id && req.status === 'pending';
        console.log(`     Checking: "${req.to_user_id}" === "${user.id}" && status="${req.status}" = ${matches}`);
        return matches;
      });
      
      console.log(`     ✅ Incoming requests: ${incomingRequests.length}`);
      incomingRequests.forEach(req => {
        console.log(`       - From ${req.from_user_name}: "${req.message}"`);
      });
      
      // Filter outgoing requests (user is sender)
      const outgoingRequests = requests.filter(req => req.from_user_id === user.id && req.status === 'pending');
      console.log(`     ✅ Outgoing requests: ${outgoingRequests.length}`);
      outgoingRequests.forEach(req => {
        console.log(`       - To ${req.to_user_name}: "${req.message}"`);
      });
    }

    // Step 4: Test creating a real connection request
    console.log('\n🧪 Creating Test Connection Request:');
    if (users.length >= 2) {
      const fromUser = users[0];
      const toUser = users[1];
      
      console.log(`   Creating request: ${fromUser.name} → ${toUser.name}`);
      
      const testRequest = {
        from_user_id: fromUser.id,
        to_user_id: toUser.id,
        from_user_name: fromUser.name,
        to_user_name: toUser.name,
        status: 'pending',
        message: `Test request from ${fromUser.name} to ${toUser.name} at ${new Date().toLocaleTimeString()}`
      };
      
      const { data: insertedRequest, error: insertError } = await supabase
        .from('connection_requests')
        .insert([testRequest])
        .select();
      
      if (insertError) {
        console.error('   ❌ Error creating test request:', insertError);
      } else {
        console.log('   ✅ Test request created successfully');
        console.log(`   Request ID: ${insertedRequest[0].id}`);
        
        // Now test if it shows up in filtering
        console.log(`\n   Testing if ${toUser.name} can see the new request:`);
        const { data: allRequestsAfter } = await supabase
          .from('connection_requests')
          .select('*');
        
        const toUserRequests = allRequestsAfter.filter(req => {
          const matches = req.to_user_id === toUser.id && req.status === 'pending';
          console.log(`     "${req.to_user_id}" === "${toUser.id}" = ${matches}`);
          return matches;
        });
        
        console.log(`   ✅ ${toUser.name} can see ${toUserRequests.length} incoming requests`);
        
        // Clean up - delete the test request
        await supabase
          .from('connection_requests')
          .delete()
          .eq('id', insertedRequest[0].id);
        console.log('   🧹 Test request cleaned up');
      }
    }

    console.log('\n✅ Debug complete!');
    
  } catch (error) {
    console.error('💥 Debug error:', error);
  }
}

debugConnectionRequests();
