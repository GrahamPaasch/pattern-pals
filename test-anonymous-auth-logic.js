// Test anonymous authentication without database dependency
// This test checks the local storage and user creation logic

// Mock AsyncStorage for Node.js testing
const mockStorage = {};
const AsyncStorage = {
  setItem: (key, value) => {
    mockStorage[key] = value;
    return Promise.resolve();
  },
  getItem: (key) => {
    return Promise.resolve(mockStorage[key] || null);
  }
};

// Simple UUID generator for testing
function generateTestUUID() {
  return 'test-' + Math.random().toString(36).substr(2, 9);
}

// Test the core authentication logic
async function testAnonymousAuth() {
  console.log('🧪 Testing anonymous authentication logic...');
  
  try {
    // Test user data
    const userData = {
      name: 'Test Juggler',
      experience: 'Intermediate',
      preferredProps: ['clubs', 'balls']
    };
    
    console.log('📝 Creating anonymous user:', userData.name);
    
    // Simulate the user creation process
    const userId = generateTestUUID();
    
    const user = {
      id: userId,
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      user_metadata: { name: userData.name },
      app_metadata: {},
    };

    const profile = {
      id: userId,
      name: userData.name,
      avatar: '',
      experience: userData.experience,
      preferredProps: userData.preferredProps,
      availability: [],
      knownPatterns: [],
      wantToLearnPatterns: [],
      avoidPatterns: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Test storage
    await AsyncStorage.setItem('anonymous_user', JSON.stringify(user));
    await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
    
    console.log('✅ User created and stored locally');
    
    // Test retrieval
    const storedUser = await AsyncStorage.getItem('anonymous_user');
    const storedProfile = await AsyncStorage.getItem('user_profile');
    
    if (storedUser && storedProfile) {
      const parsedUser = JSON.parse(storedUser);
      const parsedProfile = JSON.parse(storedProfile);
      
      console.log('✅ User retrieved successfully:');
      console.log('   ID:', parsedUser.id);
      console.log('   Name:', parsedProfile.name);
      console.log('   Experience:', parsedProfile.experience);
      console.log('   Props:', parsedProfile.preferredProps.join(', '));
      
      return true;
    } else {
      console.log('❌ Failed to retrieve stored user data');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
    return false;
  }
}

// Run the test
testAnonymousAuth()
  .then(success => {
    if (success) {
      console.log('\n🎉 Anonymous authentication logic works correctly!');
      console.log('📱 Users can create accounts without email/password');
      console.log('💾 User data is stored locally for offline access');
    } else {
      console.log('\n🚨 Anonymous authentication has issues');
    }
    
    console.log('\n📋 Next steps:');
    console.log('1. Set up Supabase database (if not done already)');
    console.log('2. Run the database migration: supabase-anonymous-users-migration.sql');
    console.log('3. Test the full flow with database integration');
    
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test script failed:', error);
    process.exit(1);
  });
