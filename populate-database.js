// Populate PatternPals Database with Real User Data
const { supabase } = require('./test-config');

// Real juggling patterns from your app's pattern library
const PATTERNS = [
  '6 Count',
  'Walking Pass', 
  '645',
  'Custom Double Spin',
  'Chocolate Bar',
  'Countdown',
  'Social Distancing',
  'Madison Marmosets',
  'Benzene Ring',
  'Mills Mess Pass',
  'Four Leaf Clover',
  'Takeout Doubles',
  'Hurricane',
  'Funky Bookends',
  'Jim\'s 2-count',
  'Not Likely',
  'PPS',
  'Why Not',
  'Maybe',
  'Martin\'s One Count'
];

// Realistic juggler profiles for advertising patterns
const DEMO_USERS = [
  {
    name: 'Graham Paasch',
    email: 'graham@patternpals.com',
    experience: 'Advanced',
    preferred_props: ['clubs', 'balls'],
    location: 'San Francisco, CA',
    bio: 'Love exploring new passing patterns and teaching others! Always looking for practice partners.',
    known_patterns: ['6 Count', 'Walking Pass', '645', 'Custom Double Spin', 'Chocolate Bar', 'Countdown'],
    want_to_learn_patterns: ['Madison Marmosets', 'Benzene Ring', 'Hurricane']
  },
  {
    name: 'Peter Kaseman',
    email: 'peter@patternpals.com', 
    experience: 'Advanced',
    preferred_props: ['clubs'],
    location: 'Berkeley, CA',
    bio: 'Pattern inventor and passing enthusiast. Creator of several well-known patterns.',
    known_patterns: ['6 Count', 'Walking Pass', '645', 'Custom Double Spin', 'Chocolate Bar', 'Madison Marmosets', 'Benzene Ring', 'Mills Mess Pass'],
    want_to_learn_patterns: ['Jim\'s 2-count', 'Not Likely']
  },
  {
    name: 'Sarah Chen',
    email: 'sarah@patternpals.com',
    experience: 'Intermediate', 
    preferred_props: ['clubs', 'rings'],
    location: 'Oakland, CA',
    bio: 'Professional circus performer looking to expand my passing repertoire.',
    known_patterns: ['6 Count', 'Walking Pass', '645', 'Mills Mess Pass'],
    want_to_learn_patterns: ['Custom Double Spin', 'Chocolate Bar', 'Four Leaf Clover']
  },
  {
    name: 'Mike Rodriguez',
    email: 'mike@patternpals.com',
    experience: 'Advanced',
    preferred_props: ['clubs', 'balls'],
    location: 'San Jose, CA',
    bio: 'Weekend warrior juggler. Love learning new patterns and meeting fellow jugglers!',
    known_patterns: ['6 Count', 'Walking Pass', '645', 'Countdown', 'Social Distancing'],
    want_to_learn_patterns: ['Takeout Doubles', 'Hurricane', 'Funky Bookends']
  },
  {
    name: 'Anna Thompson',
    email: 'anna@patternpals.com',
    experience: 'Beginner',
    preferred_props: ['clubs'],
    location: 'Santa Clara, CA', 
    bio: 'New to passing patterns but very enthusiastic! Looking for patient practice partners.',
    known_patterns: ['6 Count'],
    want_to_learn_patterns: ['Walking Pass', '645', 'Mills Mess Pass']
  },
  {
    name: 'David Kim',
    email: 'david@patternpals.com',
    experience: 'Intermediate',
    preferred_props: ['clubs', 'balls', 'rings'],
    location: 'Palo Alto, CA',
    bio: 'Tech worker by day, juggler by night. Love the mathematical beauty of passing patterns.',
    known_patterns: ['6 Count', 'Walking Pass', '645', 'Chocolate Bar', 'Four Leaf Clover'],
    want_to_learn_patterns: ['Madison Marmosets', 'PPS', 'Why Not']
  },
  {
    name: 'Lisa Martinez',
    email: 'lisa@patternpals.com', 
    experience: 'Advanced',
    preferred_props: ['clubs'],
    location: 'San Mateo, CA',
    bio: 'Teaching juggling at local schools. Always working on new patterns to show my students.',
    known_patterns: ['6 Count', 'Walking Pass', '645', 'Custom Double Spin', 'Takeout Doubles', 'Hurricane'],
    want_to_learn_patterns: ['Benzene Ring', 'Jim\'s 2-count', 'Martin\'s One Count']
  },
  {
    name: 'Tom Wilson',
    email: 'tom@patternpals.com',
    experience: 'Advanced',
    preferred_props: ['clubs', 'balls'],
    location: 'Mountain View, CA',
    bio: 'Been juggling for 20+ years. Happy to teach any pattern I know!',
    known_patterns: ['6 Count', 'Walking Pass', '645', 'Custom Double Spin', 'Chocolate Bar', 'Madison Marmosets', 'Benzene Ring', 'Hurricane', 'Jim\'s 2-count'],
    want_to_learn_patterns: ['Not Likely', 'Maybe']
  },
  {
    name: 'Jenny Park',
    email: 'jenny@patternpals.com',
    experience: 'Intermediate',
    preferred_props: ['clubs', 'rings'],
    location: 'Fremont, CA',
    bio: 'Love the social aspect of passing! Organizing local juggling meetups.',
    known_patterns: ['6 Count', 'Walking Pass', '645', 'Social Distancing', 'Mills Mess Pass'],
    want_to_learn_patterns: ['Custom Double Spin', 'Four Leaf Clover', 'Funky Bookends']
  },
  {
    name: 'Alex Johnson',
    email: 'alex@patternpals.com',
    experience: 'Beginner',
    preferred_props: ['balls'],
    location: 'Hayward, CA',
    bio: 'Just started learning passing patterns. Excited to meet other jugglers!',
    known_patterns: ['6 Count'],
    want_to_learn_patterns: ['Walking Pass', '645', 'Mills Mess Pass', 'Chocolate Bar']
  }
];

async function populateDatabase() {
  console.log('🎪 Populating PatternPals Database...');
  console.log('====================================');

  try {
    // Step 1: Clear existing data
    console.log('\n🧹 Clearing existing data...');
    await supabase.from('user_patterns').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('connections').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('connection_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Step 2: Insert users
    console.log('\n👥 Adding demo users...');
    const { data: insertedUsers, error: usersError } = await supabase
      .from('users')
      .insert(DEMO_USERS.map(user => ({
        name: user.name,
        email: user.email,
        experience: user.experience,
        preferred_props: user.preferred_props,
        location: user.location,
        bio: user.bio,
        known_patterns: user.known_patterns,
        want_to_learn_patterns: user.want_to_learn_patterns
      })))
      .select();

    if (usersError) {
      console.error('❌ Error inserting users:', usersError);
      return;
    }

    console.log(`✅ Added ${insertedUsers.length} users`);

    // Step 3: Create user pattern records for each user
    console.log('\n🎯 Adding pattern preferences...');
    const userPatterns = [];

    for (const user of insertedUsers) {
      const userData = DEMO_USERS.find(u => u.email === user.email);
      
      // Add known patterns
      for (const pattern of userData.known_patterns) {
        userPatterns.push({
          user_id: user.id,
          pattern_id: pattern,
          status: 'known'
        });
      }

      // Add want to learn patterns
      for (const pattern of userData.want_to_learn_patterns) {
        userPatterns.push({
          user_id: user.id,
          pattern_id: pattern,
          status: 'want_to_learn'
        });
      }
    }

    const { error: patternsError } = await supabase
      .from('user_patterns')
      .insert(userPatterns);

    if (patternsError) {
      console.error('❌ Error inserting patterns:', patternsError);
      return;
    }

    console.log(`✅ Added ${userPatterns.length} pattern preferences`);

    // Step 4: Create some connections between compatible users
    console.log('\n🤝 Creating connections between compatible jugglers...');
    const connections = [
      {
        user1_id: insertedUsers.find(u => u.name === 'Graham Paasch')?.id,
        user2_id: insertedUsers.find(u => u.name === 'Peter Kaseman')?.id,
        user1_name: 'Graham Paasch',
        user2_name: 'Peter Kaseman',
        status: 'active'
      },
      {
        user1_id: insertedUsers.find(u => u.name === 'Sarah Chen')?.id,
        user2_id: insertedUsers.find(u => u.name === 'Mike Rodriguez')?.id,
        user1_name: 'Sarah Chen', 
        user2_name: 'Mike Rodriguez',
        status: 'active'
      },
      {
        user1_id: insertedUsers.find(u => u.name === 'David Kim')?.id,
        user2_id: insertedUsers.find(u => u.name === 'Lisa Martinez')?.id,
        user1_name: 'David Kim',
        user2_name: 'Lisa Martinez',
        status: 'active'
      }
    ];

    const { error: connectionsError } = await supabase
      .from('connections')
      .insert(connections);

    if (connectionsError) {
      console.error('❌ Error inserting connections:', connectionsError);
      return;
    }

    console.log(`✅ Created ${connections.length} connections`);

    // Step 5: Create some pending connection requests
    console.log('\n📨 Creating pending connection requests...');
    const connectionRequests = [
      {
        from_user_id: insertedUsers.find(u => u.name === 'Anna Thompson')?.id,
        to_user_id: insertedUsers.find(u => u.name === 'Sarah Chen')?.id,
        from_user_name: 'Anna Thompson',
        to_user_name: 'Sarah Chen',
        status: 'pending',
        message: 'Hi! I\'m new to passing patterns and would love to learn from you. Could we practice together?'
      },
      {
        from_user_id: insertedUsers.find(u => u.name === 'Jenny Park')?.id,
        to_user_id: insertedUsers.find(u => u.name === 'Tom Wilson')?.id,
        from_user_name: 'Jenny Park',
        to_user_name: 'Tom Wilson',
        status: 'pending',
        message: 'I see you know many advanced patterns I want to learn. Would you be interested in teaching?'
      },
      {
        from_user_id: insertedUsers.find(u => u.name === 'Alex Johnson')?.id,
        to_user_id: insertedUsers.find(u => u.name === 'Anna Thompson')?.id,
        from_user_name: 'Alex Johnson',
        to_user_name: 'Anna Thompson',
        status: 'pending',
        message: 'Hey! We\'re both beginners - want to learn together?'
      }
    ];

    const { error: requestsError } = await supabase
      .from('connection_requests')
      .insert(connectionRequests);

    if (requestsError) {
      console.error('❌ Error inserting connection requests:', requestsError);
      return;
    }

    console.log(`✅ Created ${connectionRequests.length} connection requests`);

    // Step 6: Verify the data was inserted
    console.log('\n📊 Database Summary:');
    
    const { data: users, error: usersCountError } = await supabase
      .from('users')
      .select('*');
    
    const { data: patterns, error: patternsCountError } = await supabase
      .from('user_patterns')
      .select('*');
      
    const { data: connectionsData, error: connectionsCountError } = await supabase
      .from('connections')
      .select('*');
      
    const { data: requestsData, error: requestsCountError } = await supabase
      .from('connection_requests')
      .select('*');

    if (!usersCountError) console.log(`   👥 Users: ${users.length}`);
    if (!patternsCountError) console.log(`   🎯 Pattern Preferences: ${patterns.length}`);
    if (!connectionsCountError) console.log(`   🤝 Active Connections: ${connectionsData.length}`);
    if (!requestsCountError) console.log(`   📨 Pending Requests: ${requestsData.length}`);

    console.log('\n🎉 SUCCESS! Database populated with realistic juggling data');
    console.log('\n✨ What you can now do:');
    console.log('   • Search for users with specific pattern knowledge');
    console.log('   • See who knows patterns you want to learn');
    console.log('   • Find practice partners with complementary skills');
    console.log('   • View active connections and pending requests');
    console.log('   • Experience the full PatternPals matching system!');
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
  }
}

// Run the population script
populateDatabase();
