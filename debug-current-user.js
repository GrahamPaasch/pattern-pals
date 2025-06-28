// Debug script to show current user and their connection requests
// Mock AsyncStorage for Node.js testing
const fs = require('fs');
const path = require('path');

// Simple AsyncStorage mock for testing
const AsyncStorage = {
  async getItem(key) {
    try {
      const data = fs.readFileSync(path.join(__dirname, `storage_${key}.json`), 'utf8');
      return data;
    } catch (error) {
      return null;
    }
  }
};

async function debugCurrentUser() {
  console.log('🔍 Debugging Current User & Connection Requests');
  console.log('===============================================');

  try {
    // Get current user from local storage
    console.log('\n1. Getting current user from local storage...');
    const existingUser = await AsyncStorage.getItem('anonymous_user');
    const existingProfile = await AsyncStorage.getItem('user_profile');
    
    if (!existingUser || !existingProfile) {
      console.log('❌ No current user found in local storage');
      console.log('💡 This means no one is currently logged in');
      return;
    }

    const user = JSON.parse(existingUser);
    const profile = JSON.parse(existingProfile);
    
    console.log('✅ Current user found:');
    console.log(`   Name: ${profile.name}`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Experience: ${profile.experience}`);
    
    // Check connection requests for this user
    console.log('\n2. Getting connection requests for current user...');
    const requestsData = await AsyncStorage.getItem('connection_requests');
    
    if (!requestsData) {
      console.log('❌ No connection requests found in local storage');
      return;
    }
    
    const allRequests = JSON.parse(requestsData);
    console.log(`📨 Total requests in storage: ${allRequests.length}`);
    
    // Filter requests for current user
    const incomingRequests = allRequests.filter(req => 
      req.toUserId === user.id && req.status === 'pending'
    );
    
    console.log('\n3. Incoming requests for current user:');
    if (incomingRequests.length === 0) {
      console.log('❌ No incoming requests for current user');
      console.log(`💡 Looking for requests where toUserId === "${user.id}"`);
    } else {
      console.log(`✅ Found ${incomingRequests.length} incoming requests:`);
      incomingRequests.forEach((req, index) => {
        console.log(`   ${index + 1}. From: ${req.fromUserName}`);
        console.log(`      Request ID: ${req.id}`);
        console.log(`      Message: "${req.message || 'No message'}"`);
      });
    }
    
    // Show all requests to see the pattern
    console.log('\n4. All requests in storage (debug):');
    allRequests.forEach((req, index) => {
      console.log(`   Request ${index + 1}:`);
      console.log(`     From: ${req.fromUserName} (${req.fromUserId})`);
      console.log(`     To: ${req.toUserName} (${req.toUserId})`);
      console.log(`     Status: ${req.status}`);
      console.log(`     Is for current user? ${req.toUserId === user.id}`);
      console.log('');
    });
    
    // Summary
    console.log('\n🎯 SUMMARY:');
    console.log(`   Current user: ${profile.name} (${user.id})`);
    console.log(`   Incoming requests: ${incomingRequests.length}`);
    console.log(`   Total requests in app: ${allRequests.length}`);
    
    if (profile.name !== 'Graham Paasch') {
      console.log('\n💡 TO SEE GRAHAM PAASCH\'S REQUESTS:');
      console.log('   1. Sign out of current account');
      console.log('   2. Sign up/in as "Graham Paasch"');
      console.log('   3. Then his requests will be visible');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugCurrentUser();
