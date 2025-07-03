-- PatternPals Chat System Database Schema
-- In-App Chat between Connected Users

-- Chat conversations table
CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user1_name TEXT NOT NULL,
    user2_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    last_message TEXT,
    last_message_sender_id UUID,
    
    -- Ensure unique conversation between two users
    UNIQUE(user1_id, user2_id),
    
    -- Check constraint to ensure user1_id < user2_id for consistency
    CHECK (user1_id < user2_id)
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'pattern_share', 'session_invite')),
    read_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Additional data for special message types (pattern shares, session invites)
    metadata JSONB
);

-- Chat message reactions table (for future features like emoji reactions)
CREATE TABLE IF NOT EXISTS chat_message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction TEXT NOT NULL, -- emoji or reaction type
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(message_id, user_id, reaction)
);

-- Chat member preferences table (for muting, blocking, etc.)
CREATE TABLE IF NOT EXISTS chat_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    is_muted BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    last_read_message_id UUID,
    notification_enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, conversation_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user1 ON chat_conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user2 ON chat_conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated_at ON chat_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message_at ON chat_conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient_id ON chat_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_read_at ON chat_messages(read_at);

CREATE INDEX IF NOT EXISTS idx_chat_message_reactions_message_id ON chat_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_reactions_user_id ON chat_message_reactions(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_preferences_user_id ON chat_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_preferences_conversation_id ON chat_preferences(conversation_id);

-- Row Level Security (RLS) policies
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_preferences ENABLE ROW LEVEL SECURITY;

-- Policies for chat_conversations (users can only see conversations they're part of)
CREATE POLICY "Users can view their conversations" ON chat_conversations
    FOR SELECT USING (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "Users can create conversations with connected users" ON chat_conversations
    FOR INSERT WITH CHECK (
        (user1_id = auth.uid() OR user2_id = auth.uid()) AND
        EXISTS (
            SELECT 1 FROM connections
            WHERE (user1_id = connections.user1_id AND user2_id = connections.user2_id) OR
                  (user1_id = connections.user2_id AND user2_id = connections.user1_id)
        )
    );

CREATE POLICY "Users can update their conversations" ON chat_conversations
    FOR UPDATE USING (user1_id = auth.uid() OR user2_id = auth.uid());

-- Policies for chat_messages (users can only see messages in their conversations)
CREATE POLICY "Users can view messages in their conversations" ON chat_messages
    FOR SELECT USING (
        sender_id = auth.uid() OR recipient_id = auth.uid()
    );

CREATE POLICY "Users can send messages in their conversations" ON chat_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM chat_conversations
            WHERE id = conversation_id AND
                  (user1_id = auth.uid() OR user2_id = auth.uid())
        )
    );

CREATE POLICY "Users can update their own messages" ON chat_messages
    FOR UPDATE USING (sender_id = auth.uid());

-- Policies for chat_message_reactions
CREATE POLICY "Users can view reactions in their conversations" ON chat_message_reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_messages
            WHERE chat_messages.id = message_id AND
                  (chat_messages.sender_id = auth.uid() OR chat_messages.recipient_id = auth.uid())
        )
    );

CREATE POLICY "Users can add reactions to messages in their conversations" ON chat_message_reactions
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM chat_messages
            WHERE chat_messages.id = message_id AND
                  (chat_messages.sender_id = auth.uid() OR chat_messages.recipient_id = auth.uid())
        )
    );

CREATE POLICY "Users can remove their own reactions" ON chat_message_reactions
    FOR DELETE USING (user_id = auth.uid());

-- Policies for chat_preferences
CREATE POLICY "Users can manage their chat preferences" ON chat_preferences
    FOR ALL USING (user_id = auth.uid());

-- Function to update conversation's last message info
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_conversations
    SET 
        last_message = NEW.message_text,
        last_message_sender_id = NEW.sender_id,
        last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation when new message is sent
CREATE TRIGGER update_conversation_on_new_message
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- Function to create conversation when first message is sent
CREATE OR REPLACE FUNCTION create_conversation_if_not_exists()
RETURNS TRIGGER AS $$
DECLARE
    conv_id UUID;
    user1_id_var UUID;
    user2_id_var UUID;
    user1_name_var TEXT;
    user2_name_var TEXT;
BEGIN
    -- Ensure user1_id < user2_id for consistent ordering
    IF NEW.sender_id < NEW.recipient_id THEN
        user1_id_var := NEW.sender_id;
        user2_id_var := NEW.recipient_id;
    ELSE
        user1_id_var := NEW.recipient_id;
        user2_id_var := NEW.sender_id;
    END IF;
    
    -- Get user names
    SELECT name INTO user1_name_var FROM users WHERE id = user1_id_var;
    SELECT name INTO user2_name_var FROM users WHERE id = user2_id_var;
    
    -- Check if conversation already exists
    SELECT id INTO conv_id
    FROM chat_conversations
    WHERE user1_id = user1_id_var AND user2_id = user2_id_var;
    
    -- If conversation doesn't exist, create it
    IF conv_id IS NULL THEN
        INSERT INTO chat_conversations (user1_id, user2_id, user1_name, user2_name)
        VALUES (user1_id_var, user2_id_var, user1_name_var, user2_name_var)
        RETURNING id INTO conv_id;
    END IF;
    
    -- Update the message with the conversation ID
    NEW.conversation_id := conv_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create conversation before inserting message
CREATE TRIGGER create_conversation_before_message
    BEFORE INSERT ON chat_messages
    FOR EACH ROW
    WHEN (NEW.conversation_id IS NULL)
    EXECUTE FUNCTION create_conversation_if_not_exists();

-- Function to auto-mark messages as delivered
CREATE OR REPLACE FUNCTION mark_message_delivered()
RETURNS TRIGGER AS $$
BEGIN
    NEW.delivered_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to mark messages as delivered immediately (since we have real-time delivery)
CREATE TRIGGER mark_delivered_on_insert
    BEFORE INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION mark_message_delivered();

-- Function to get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_message_count(target_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO unread_count
    FROM chat_messages
    WHERE recipient_id = target_user_id AND read_at IS NULL;
    
    RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get conversation for two users (creates if doesn't exist)
CREATE OR REPLACE FUNCTION get_or_create_conversation(user1_uuid UUID, user2_uuid UUID)
RETURNS UUID AS $$
DECLARE
    conv_id UUID;
    user1_id_var UUID;
    user2_id_var UUID;
    user1_name_var TEXT;
    user2_name_var TEXT;
BEGIN
    -- Ensure user1_id < user2_id for consistent ordering
    IF user1_uuid < user2_uuid THEN
        user1_id_var := user1_uuid;
        user2_id_var := user2_uuid;
    ELSE
        user1_id_var := user2_uuid;
        user2_id_var := user1_uuid;
    END IF;
    
    -- Get user names
    SELECT name INTO user1_name_var FROM users WHERE id = user1_id_var;
    SELECT name INTO user2_name_var FROM users WHERE id = user2_id_var;
    
    -- Check if conversation already exists
    SELECT id INTO conv_id
    FROM chat_conversations
    WHERE user1_id = user1_id_var AND user2_id = user2_id_var;
    
    -- If conversation doesn't exist, create it
    IF conv_id IS NULL THEN
        INSERT INTO chat_conversations (user1_id, user2_id, user1_name, user2_name)
        VALUES (user1_id_var, user2_id_var, user1_name_var, user2_name_var)
        RETURNING id INTO conv_id;
    END IF;
    
    RETURN conv_id;
END;
$$ LANGUAGE plpgsql;
