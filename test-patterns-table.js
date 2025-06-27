// Quick test to check user_patterns table
const { supabase } = require('./test-config');

async function testPatternsTable() {
  console.log('🔍 Testing user_patterns table...');
  
  try {
    const { data, error } = await supabase
      .from('user_patterns')
      .select('*')
      .limit(10);
    
    if (error) {
      console.error('❌ Error:', error.message);
      if (error.message.includes('does not exist')) {
        console.log('💡 The user_patterns table doesn\'t exist yet');
        console.log('📋 This table is needed for syncing pattern preferences across devices');
      }
    } else {
      console.log('✅ user_patterns table exists');
      console.log(`📊 Found ${data.length} pattern preferences in database`);
      if (data.length > 0) {
        console.log('📝 Sample data:');
        data.forEach(pattern => {
          console.log(`   - User ${pattern.user_id}: ${pattern.pattern_id} = ${pattern.status}`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Connection error:', error.message);
  }
}

testPatternsTable();
