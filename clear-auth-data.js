/**
 * Note: This script cannot run in Node.js because AsyncStorage is a React Native API.
 * This file is provided for reference only.
 * 
 * To clear auth data, use one of these methods:
 * 
 * 1. Use the debug tools in the app's Search tab:
 *    - Tap "Clear All Stored Users" to clear the local user cache
 *    - Then sign out and sign in again
 * 
 * 2. Manually delete the app data:
 *    - On Android: Settings > Apps > PatternPals > Storage > Clear Data
 *    - On iOS: Delete and reinstall the app
 * 
 * 3. Use this code snippet directly in your React Native app:
 */

// React Native code (for reference - cannot run in Node.js):
/*
import AsyncStorage from '@react-native-async-storage/async-storage';

async function clearAuthData() {
  try {
    console.log('🔧 Clearing stored authentication data...');
    
    await AsyncStorage.removeItem('mock_user');
    await AsyncStorage.removeItem('mock_profile');
    
    // Also clear any cached user search data
    const allKeys = await AsyncStorage.getAllKeys();
    const userKeys = allKeys.filter(key => 
      key.includes('user') || 
      key.includes('connection') || 
      key === 'all_users'
    );
    
    if (userKeys.length > 0) {
      await AsyncStorage.multiRemove(userKeys);
      console.log(`✅ Cleared ${userKeys.length} user-related keys:`, userKeys);
    }
    
    console.log('✅ Successfully cleared all auth data!');
    console.log('💡 The user should now sign up/sign in again to get a valid UUID');
  } catch (error) {
    console.error('❌ Error clearing auth data:', error);
  }
}
*/

function showInstructions() {
  console.log('📱 CLEAR AUTH DATA INSTRUCTIONS');
  console.log('================================');
  console.log('');
  console.log('❌ This script cannot run in Node.js because AsyncStorage is React Native-only.');
  console.log('');
  console.log('✅ To clear old auth data, use one of these methods:');
  console.log('');
  console.log('1. � IN-APP DEBUG TOOLS (Recommended):');
  console.log('   - Open the PatternPals app');
  console.log('   - Go to the Search tab');
  console.log('   - Tap "Clear All Stored Users"');
  console.log('   - Sign out and sign in again');
  console.log('');
  console.log('2. 📱 RESET APP DATA:');
  console.log('   - Android: Settings > Apps > PatternPals > Storage > Clear Data');
  console.log('   - iOS: Delete and reinstall the app');
  console.log('');
  console.log('3. 🚀 AFTER CLEARING DATA:');
  console.log('   - Sign up/Sign in again to get a valid UUID');
  console.log('   - Check that backend status shows 🟢 Supabase');
  console.log('   - Test user search functionality');
  console.log('');
}

showInstructions();
