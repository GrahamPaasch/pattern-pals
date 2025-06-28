// Script to simulate logging in as Graham Paasch to see his requests
const { supabase } = require('./test-config');

async function loginAsGraham() {
  console.log('👤 Simulating Login as Graham Paasch');
  console.log('====================================');

  try {
    // Get Graham's user data from database
    console.log('\n1. Getting Graham\'s data from database...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('name', 'Graham Paasch')
      .limit(1);

    if (usersError || !users || users.length === 0) {
      console.error('❌ Could not find Graham Paasch in database');
      return;
    }

    const graham = users[0];
    console.log(`✅ Found Graham: ${graham.name} (${graham.id})`);
    console.log(`   Email: ${graham.email}`);
    console.log(`   Experience: ${graham.experience}`);

    // Simulate what would happen when Graham logs in
    console.log('\n2. Simulating Graham\'s session...');
    
    // Create user and profile objects like the app would
    const user = {
      id: graham.id,
      aud: 'authenticated',
      created_at: graham.created_at,
      user_metadata: { name: graham.name },
      app_metadata: {},
    };

    const profile = {
      id: graham.id,
      name: graham.name,
      avatar: graham.avatar || '',
      experience: graham.experience,
      preferredProps: graham.preferred_props || [],
      availability: graham.availability || [],
      knownPatterns: graham.known_patterns || [],
      wantToLearnPatterns: graham.want_to_learn_patterns || [],
      avoidPatterns: graham.avoid_patterns || [],
      createdAt: new Date(graham.created_at),
      updatedAt: new Date(graham.updated_at),
    };

    console.log('✅ Simulated session created for Graham');

    // Check what connection requests Graham would see
    console.log('\n3. Checking connection requests for Graham...');
    const { data: requests, error: requestsError } = await supabase
      .from('connection_requests')
      .select('*')
      .eq('to_user_id', graham.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (requestsError) {
      console.error('❌ Error fetching requests:', requestsError);
      return;
    }

    console.log(`📨 Graham would see ${requests.length} incoming requests:`);
    if (requests.length === 0) {
      console.log('   No pending requests found');
    } else {
      requests.forEach((req, index) => {
        console.log(`   ${index + 1}. From: ${req.from_user_name}`);
        console.log(`      Request ID: ${req.id}`);
        console.log(`      Message: "${req.message || 'No message'}"`);
        console.log(`      Created: ${new Date(req.created_at).toLocaleString()}`);
        console.log('');
      });
    }

    // Check outgoing requests too
    console.log('\n4. Checking outgoing requests from Graham...');
    const { data: outgoingRequests, error: outgoingError } = await supabase
      .from('connection_requests')
      .select('*')
      .eq('from_user_id', graham.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!outgoingError) {
      console.log(`📤 Graham has sent ${outgoingRequests.length} pending requests:`);
      if (outgoingRequests.length === 0) {
        console.log('   No outgoing requests found');
      } else {
        outgoingRequests.forEach((req, index) => {
          console.log(`   ${index + 1}. To: ${req.to_user_name}`);
          console.log(`      Request ID: ${req.id}`);
          console.log(`      Message: "${req.message || 'No message'}"`);
          console.log(`      Created: ${new Date(req.created_at).toLocaleString()}`);
          console.log('');
        });
      }
    }

    console.log('\n🎯 CONCLUSION:');
    console.log(`   If Graham logs into the app, he would see ${requests.length} incoming requests`);
    console.log('   To test this in the app:');
    console.log('   1. Open PatternPals app');
    console.log('   2. If someone else is logged in, sign out');
    console.log('   3. Sign up/in with the name "Graham Paasch"');
    console.log('   4. Go to the Requests tab');
    console.log(`   5. You should see ${requests.length} requests waiting for Graham`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

loginAsGraham();
