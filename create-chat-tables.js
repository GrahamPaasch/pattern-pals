const { supabase } = require('./test-config');

async function createChatTables() {
  console.log('🔧 Creating chat tables...');
  
  try {
    // Create chat_conversations table
    console.log('Creating chat_conversations table...');
    const { error: conv_error } = await supabase
      .from('chat_conversations')
      .select('*')
      .limit(1);
      
    if (conv_error && conv_error.message.includes('does not exist')) {
      console.log('Table does not exist, creating it...');
      
      // Since we can't execute DDL directly, let's just inform the user
      console.log('⚠️  Chat tables need to be created in Supabase Dashboard');
      console.log('📋 Run this SQL in Supabase Dashboard -> SQL Editor:');
      console.log('');
      console.log('-- Chat conversations table');
      console.log('CREATE TABLE IF NOT EXISTS chat_conversations (');
      console.log('  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),');
      console.log('  user1_id UUID NOT NULL,');
      console.log('  user2_id UUID NOT NULL,');
      console.log('  user1_name TEXT NOT NULL,');
      console.log('  user2_name TEXT NOT NULL,');
      console.log('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
      console.log('  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
      console.log('  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
      console.log('  last_message TEXT,');
      console.log('  last_message_sender_id UUID,');
      console.log('  CHECK (user1_id < user2_id)');
      console.log(');');
      console.log('');
      console.log('-- Chat messages table');
      console.log('CREATE TABLE IF NOT EXISTS chat_messages (');
      console.log('  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),');
      console.log('  conversation_id UUID NOT NULL,');
      console.log('  sender_id UUID NOT NULL,');
      console.log('  sender_name TEXT NOT NULL,');
      console.log('  recipient_id UUID NOT NULL,');
      console.log('  message_text TEXT NOT NULL,');
      console.log('  message_type TEXT DEFAULT \'text\',');
      console.log('  read_at TIMESTAMP WITH TIME ZONE,');
      console.log('  delivered_at TIMESTAMP WITH TIME ZONE,');
      console.log('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
      console.log('  metadata JSONB');
      console.log(');');
      console.log('');
      console.log('-- Indexes for performance');
      console.log('CREATE INDEX IF NOT EXISTS idx_chat_conversations_user1 ON chat_conversations(user1_id);');
      console.log('CREATE INDEX IF NOT EXISTS idx_chat_conversations_user2 ON chat_conversations(user2_id);');
      console.log('CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);');
      console.log('CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);');
    } else {
      console.log('✅ chat_conversations table already exists');
    }
    
    // Check chat_messages table
    const { error: msg_error } = await supabase
      .from('chat_messages')
      .select('*')
      .limit(1);
      
    if (msg_error && msg_error.message.includes('does not exist')) {
      console.log('❌ chat_messages table does not exist (see SQL above)');
    } else {
      console.log('✅ chat_messages table already exists');
    }
    
  } catch (error) {
    console.error('❌ Error checking chat tables:', error);
  }
}

createChatTables();
