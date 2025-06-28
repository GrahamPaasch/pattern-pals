/**
 * Quick fix script to add valid connection requests for the current user
 * to test the filtering logic in the MatchesScreen
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration (you might need to adjust these)
const supabaseUrl = 'https://zvjlemlhgrhzgisflsov.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2amxlbWxoZ3Joemdpc2Zsc292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0OTI4NzIsImV4cCI6MjA1MTA2ODg3Mn0.CKqKpYbEzz3ZQAr3Sg4Q_SYaD1jf0VDsAcJNBJ1h7qo';

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to generate proper UUIDs
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function fixConnectionRequests() {
  console.log('🔧 Starting connection requests fix...');
  
  try {
    // The current user ID from the logs
    const currentUserId = '186b4185-cca6-4956-96dc-1db02d20444d';
    const currentUserName = 'Unknown User';  // Will be updated by the app
    
    // Get some existing users from the database to create realistic requests
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name')
      .neq('id', currentUserId)
      .limit(3);
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }
    
    console.log(`Found ${users?.length || 0} other users in the database`);
    
    if (!users || users.length === 0) {
      console.log('No other users found, creating test requests with mock users');
      
      // Create test requests with proper UUIDs but use current user data
      const testRequests = [
        {
          id: generateUUID(),
          from_user_id: generateUUID(),
          to_user_id: currentUserId,
          from_user_name: 'Test User Alice',
          to_user_name: currentUserName,
          status: 'pending',
          message: 'Hi! I\'d love to practice juggling together. Are you interested?',
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        },
        {
          id: generateUUID(),
          from_user_id: generateUUID(),
          to_user_id: currentUserId,
          from_user_name: 'Test User Bob',
          to_user_name: currentUserName,
          status: 'pending',
          message: 'Hey! I saw your profile and think we could learn from each other. Want to connect?',
          created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 60 * 60 * 1000).toISOString()
        }
      ];
      
      // Insert the test requests
      const { data, error } = await supabase
        .from('connection_requests')
        .insert(testRequests);
      
      if (error) {
        console.error('Error inserting test requests:', error);
      } else {
        console.log('✅ Successfully added test connection requests for the current user');
        console.log(`   Added ${testRequests.length} incoming requests`);
      }
      
    } else {
      // Create requests from real users
      const testRequests = users.slice(0, 2).map((user, index) => ({
        id: generateUUID(),
        from_user_id: user.id,
        to_user_id: currentUserId,
        from_user_name: user.name || `User ${index + 1}`,
        to_user_name: currentUserName,
        status: 'pending',
        message: `Hi! I'm ${user.name || `User ${index + 1}`} and I'd love to practice patterns together. Want to connect?`,
        created_at: new Date(Date.now() - (index + 1) * 30 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - (index + 1) * 30 * 60 * 1000).toISOString()
      }));
      
      // Insert the test requests
      const { data, error } = await supabase
        .from('connection_requests')
        .insert(testRequests);
      
      if (error) {
        console.error('Error inserting real user requests:', error);
      } else {
        console.log('✅ Successfully added connection requests from real users');
        console.log(`   Added ${testRequests.length} incoming requests`);
      }
    }
    
    // Verify the requests were added
    const { data: verifyRequests, error: verifyError } = await supabase
      .from('connection_requests')
      .select('*')
      .eq('to_user_id', currentUserId)
      .eq('status', 'pending');
    
    if (verifyError) {
      console.error('Error verifying requests:', verifyError);
    } else {
      console.log(`✅ Verification: Found ${verifyRequests?.length || 0} pending incoming requests for user ${currentUserId}`);
      verifyRequests?.forEach((req, index) => {
        console.log(`   ${index + 1}. From: ${req.from_user_name} (${req.from_user_id})`);
      });
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the fix
fixConnectionRequests().then(() => {
  console.log('🎯 Connection requests fix completed');
  process.exit(0);
}).catch(error => {
  console.error('Failed to fix connection requests:', error);
  process.exit(1);
});
