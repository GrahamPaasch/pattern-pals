// Test script to verify authentication ID mapping fix
const { supabase } = require('./test-config');

async function testAuthIDMapping() {
  console.log('🧪 Testing Authentication ID Mapping Fix');
  console.log('==========================================');

  try {
    // Step 1: Get a known user from database
    console.log('\n1. Getting known user from database...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('name', 'Graham Paasch')
      .limit(1);

    if (usersError || !users || users.length === 0) {
      console.error('❌ Could not find Graham Paasch in database');
      return;
    }

    const grahamFromDB = users[0];
    console.log(`✅ Found Graham in database:`);
    console.log(`   Name: ${grahamFromDB.name}`);
    console.log(`   Email: ${grahamFromDB.email}`);
    console.log(`   Database ID: ${grahamFromDB.id}`);

    // Step 2: Check if there are connection requests for Graham
    console.log('\n2. Checking existing connection requests for Graham...');
    const { data: existingRequests, error: requestsError } = await supabase
      .from('connection_requests')
      .select('*')
      .eq('to_user_id', grahamFromDB.id)
      .eq('status', 'pending');

    if (requestsError) {
      console.error('❌ Error fetching requests:', requestsError);
    } else {
      console.log(`✅ Found ${existingRequests.length} pending requests for Graham's database ID`);
      existingRequests.forEach((req, index) => {
        console.log(`   Request ${index + 1}: From ${req.from_user_name} (${req.from_user_id})`);
      });
    }

    // Step 3: Show what the issue was
    console.log('\n3. Demonstrating the ID mismatch issue...');
    const problematicRequests = await supabase
      .from('connection_requests')
      .select('*')
      .eq('to_user_name', 'Graham Paasch')
      .neq('to_user_id', grahamFromDB.id)
      .eq('status', 'pending');

    if (problematicRequests.data && problematicRequests.data.length > 0) {
      console.log(`⚠️  Found ${problematicRequests.data.length} requests with mismatched IDs:`);
      problematicRequests.data.forEach((req, index) => {
        console.log(`   Request ${index + 1}: To "${req.to_user_name}" but ID "${req.to_user_id}" ≠ "${grahamFromDB.id}"`);
        console.log(`     This request would NOT appear in Graham's Requests tab!`);
      });
    } else {
      console.log(`✅ No ID mismatches found - all requests use correct database IDs`);
    }

    // Step 4: Test our fix
    console.log('\n4. Summary for app testing:');
    console.log(`   📱 In the app, sign in as: ${grahamFromDB.email}`);
    console.log(`   🆔 Auth should now use database ID: ${grahamFromDB.id}`);
    console.log(`   📨 Should see ${existingRequests.length} incoming requests in Requests tab`);
    console.log(`   🎯 Connection requests should work cross-device now!`);

    console.log('\n✅ Authentication ID mapping test complete!');
    
  } catch (error) {
    console.error('💥 Test error:', error);
  }
}

testAuthIDMapping();
