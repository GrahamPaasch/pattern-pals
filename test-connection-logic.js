/**
 * Test script to validate the connection request filtering logic
 * and UUID generation without needing to run the full app
 */

// Mock AsyncStorage for testing
const mockAsyncStorage = {
  data: {},
  async getItem(key) {
    return this.data[key] || null;
  },
  async setItem(key, value) {
    this.data[key] = value;
  }
};

// Mock the ConnectionService functions
class TestConnectionService {
  static CONNECTION_REQUESTS_KEY = '@connection_requests';
  static USE_SUPABASE = false; // Use local storage for testing
  
  static generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  static async getConnectionRequests() {
    const stored = await mockAsyncStorage.getItem(this.CONNECTION_REQUESTS_KEY);
    return stored ? JSON.parse(stored) : [];
  }
  
  static async createTestIncomingRequests(currentUserId, currentUserName) {
    console.log(`🧪 Creating test incoming requests for user: ${currentUserName} (${currentUserId})`);
    
    // Create test requests with proper UUIDs
    const testRequests = [
      {
        id: this.generateUUID(),
        fromUserId: this.generateUUID(),
        toUserId: currentUserId,
        fromUserName: 'Test User Alice',
        toUserName: currentUserName || 'Unknown User',
        status: 'pending',
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
        updatedAt: new Date(Date.now() - 30 * 60 * 1000),
        message: `Hi ${currentUserName || 'there'}! I'd love to practice juggling together.`
      },
      {
        id: this.generateUUID(),
        fromUserId: this.generateUUID(),
        toUserId: currentUserId,
        fromUserName: 'Test User Bob',
        toUserName: currentUserName || 'Unknown User',
        status: 'pending',
        createdAt: new Date(Date.now() - 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 60 * 60 * 1000),
        message: `Hey ${currentUserName || 'there'}! I saw your profile and think we could learn from each other.`
      }
    ];
    
    console.log(`🧪 Generated test requests:`, testRequests.map(r => ({ 
      id: r.id, 
      from: r.fromUserId,
      to: r.toUserId,
      fromName: r.fromUserName,
      toName: r.toUserName
    })));
    
    // Add to local storage for testing
    const existingRequests = await this.getConnectionRequests();
    const allRequests = [...existingRequests, ...testRequests];
    await mockAsyncStorage.setItem(this.CONNECTION_REQUESTS_KEY, JSON.stringify(allRequests));
    
    console.log(`🧪 Created ${testRequests.length} test incoming requests for ${currentUserName}`);
    return testRequests;
  }
  
  static async getConnectionRequestsForUser(userId) {
    const allRequests = await this.getConnectionRequests();
    
    console.log(`🔍 DEBUG: Getting requests for user "${userId}" (length: ${userId.length})`);
    console.log(`🔍 DEBUG: Total requests in storage: ${allRequests.length}`);
    
    // Filter for incoming requests
    const incomingRequests = allRequests.filter(req => {
      const isMatch = req.toUserId === userId && req.status === 'pending';
      console.log(`🔍 DEBUG: Checking request: "${req.toUserId}" === "${userId}" && status="${req.status}" = ${isMatch}`);
      return isMatch;
    });
    
    console.log(`🔍 DEBUG: INCOMING requests (to user ${userId}): ${incomingRequests.length}`);
    incomingRequests.forEach((req, index) => {
      console.log(`  INCOMING ${index + 1}: ${req.fromUserName} -> ${req.toUserName} (${req.id})`);
    });
    
    return incomingRequests;
  }
}

async function testConnectionRequests() {
  console.log('🎯 Testing Connection Request Logic...');
  
  // Test with the same user ID from the logs
  const testUserId = '186b4185-cca6-4956-96dc-1db02d20444d';
  const testUserName = 'Test User';
  
  console.log('\n--- Phase 1: Test UUID generation ---');
  for (let i = 0; i < 5; i++) {
    const uuid = TestConnectionService.generateUUID();
    console.log(`Generated UUID ${i + 1}: ${uuid} (length: ${uuid.length})`);
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isValid = uuidRegex.test(uuid);
    console.log(`  Valid UUID format: ${isValid}`);
  }
  
  console.log('\n--- Phase 2: Test with no existing requests ---');
  let requests = await TestConnectionService.getConnectionRequestsForUser(testUserId);
  console.log(`Initial requests found: ${requests.length}`);
  
  console.log('\n--- Phase 3: Create test requests ---');
  await TestConnectionService.createTestIncomingRequests(testUserId, testUserName);
  
  console.log('\n--- Phase 4: Test filtering after creation ---');
  requests = await TestConnectionService.getConnectionRequestsForUser(testUserId);
  console.log(`Requests found after creation: ${requests.length}`);
  
  if (requests.length > 0) {
    console.log('✅ SUCCESS: Connection request filtering is working correctly!');
    requests.forEach((req, index) => {
      console.log(`  Request ${index + 1}: ${req.fromUserName} -> ${req.toUserName}`);
      console.log(`    ID: ${req.id}`);
      console.log(`    From User ID: ${req.fromUserId}`);
      console.log(`    To User ID: ${req.toUserId}`);
      console.log(`    Status: ${req.status}`);
    });
  } else {
    console.log('❌ FAILURE: No requests found after creation - filtering logic issue');
  }
  
  console.log('\n--- Phase 5: Test with different user ID ---');
  const differentUserId = '11111111-2222-3333-4444-555555555555';
  const differentRequests = await TestConnectionService.getConnectionRequestsForUser(differentUserId);
  console.log(`Requests for different user: ${differentRequests.length} (should be 0)`);
  
  if (differentRequests.length === 0) {
    console.log('✅ SUCCESS: Filtering correctly excludes non-matching user IDs');
  } else {
    console.log('❌ FAILURE: Filtering incorrectly includes non-matching user IDs');
  }
}

// Run the test
testConnectionRequests().then(() => {
  console.log('\n🎯 Connection request testing completed!');
}).catch(error => {
  console.error('Test failed:', error);
});
