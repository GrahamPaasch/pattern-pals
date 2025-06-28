/**
 * Test script to verify the sign-up flow with user1@user1.com
 */
const { AuthService } = require('./src/services/authService');

async function testSignUp() {
  console.log('🧪 Testing sign-up for user1@user1.com...\n');
  
  try {
    const result = await AuthService.signUp(
      'user1@user1.com',
      'password123',
      {
        name: 'Test User 1',
        experience: 'beginner',
        preferredProps: ['clubs', 'balls']
      }
    );
    
    console.log('✅ Sign-up result:', result);
    
    if (result.error) {
      console.error('❌ Sign-up failed:', result.error);
    } else {
      console.log('✅ Sign-up successful!');
      console.log('User:', result.user);
      console.log('Profile:', result.profile);
    }
  } catch (error) {
    console.error('❌ Exception during sign-up:', error.message);
  }
}

testSignUp();
