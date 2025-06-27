/**
 * Test script to verify user search functionality
 * Run this in the browser console or as a standalone test
 */

// Test adding users to local storage
async function testUserStorage() {
  console.log('🧪 Testing User Storage...');
  
  // Clear existing data
  await AsyncStorage.removeItem('all_users');
  console.log('✅ Cleared existing users');
  
  // Add test users
  const testUsers = [
    {
      id: 'graham_test',
      name: 'GRAHAM',
      email: 'graham@test.com',
      experience: 'Intermediate',
      preferredProps: ['clubs'],
      location: 'Test Location',
      lastActive: 'Just now',
      bio: 'Test user for cross-device testing',
      knownPatterns: ['6 Count', 'Walking Pass'],
      wantToLearnPatterns: ['645', 'Custom Double Spin'],
    },
    {
      id: 'ptrkaseman_test',
      name: 'PTRKASEMAN',
      email: 'peter@test.com',
      experience: 'Advanced',
      preferredProps: ['clubs', 'balls'],
      location: 'Test Location',
      lastActive: 'Just now',
      bio: 'Test user for cross-device testing',
      knownPatterns: ['6 Count', 'Walking Pass', '645'],
      wantToLearnPatterns: ['Custom Double Spin', 'Chocolate Bar'],
    }
  ];
  
  // Store users
  await AsyncStorage.setItem('all_users', JSON.stringify(testUsers));
  console.log('✅ Added test users to storage');
  
  // Verify storage
  const stored = await AsyncStorage.getItem('all_users');
  const parsed = stored ? JSON.parse(stored) : [];
  console.log(`✅ Verified: ${parsed.length} users in storage`);
  parsed.forEach(user => {
    console.log(`  - ${user.name} (${user.email})`);
  });
  
  return parsed;
}

// Test user search
async function testUserSearch(query) {
  console.log(`🔍 Testing search for: "${query}"`);
  
  const allUsers = await UserSearchService.getAllUsers('current_user_id');
  console.log(`📊 Total users available: ${allUsers.length}`);
  
  const results = await UserSearchService.searchUsersByName(query, 'current_user_id');
  console.log(`🎯 Search results: ${results.length} found`);
  results.forEach(user => {
    console.log(`  - ${user.name} (${user.email})`);
  });
  
  return results;
}

// Export functions for console use
if (typeof window !== 'undefined') {
  window.testUserStorage = testUserStorage;
  window.testUserSearch = testUserSearch;
}

export { testUserStorage, testUserSearch };
