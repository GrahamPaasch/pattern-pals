-- Real-Time Push Notification Delivery Tracking Tables
-- Add these tables to support enhanced push notification delivery tracking

-- Notification delivery status tracking
CREATE TABLE IF NOT EXISTS notification_delivery_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'expired')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Critical notifications for fallback delivery
CREATE TABLE IF NOT EXISTS critical_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_data JSONB NOT NULL,
    is_fallback BOOLEAN DEFAULT FALSE,
    delivered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ
);

-- Enhanced user push tokens table (if not exists)
CREATE TABLE IF NOT EXISTS user_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    push_token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, device_id)
);

-- Notification analytics for tracking delivery performance
CREATE TABLE IF NOT EXISTS notification_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    delivery_method TEXT NOT NULL CHECK (delivery_method IN ('push', 'webhook', 'fallback')),
    delivery_time_ms INTEGER,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_delivery_status_notification_id ON notification_delivery_status(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_status_timestamp ON notification_delivery_status(timestamp);
CREATE INDEX IF NOT EXISTS idx_critical_notifications_user_id ON critical_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_critical_notifications_delivered ON critical_notifications(delivered);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_active ON user_push_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_notification_analytics_user_id ON notification_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_analytics_type ON notification_analytics(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_analytics_created_at ON notification_analytics(created_at);

-- Row Level Security (RLS) policies
ALTER TABLE notification_delivery_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE critical_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_analytics ENABLE ROW LEVEL SECURITY;

-- Policies for notification_delivery_status (admin only)
CREATE POLICY "Admin can view delivery status" ON notification_delivery_status
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Policies for critical_notifications (users can see their own)
CREATE POLICY "Users can view their critical notifications" ON critical_notifications
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can delete their delivered critical notifications" ON critical_notifications
    FOR DELETE TO authenticated USING (user_id = auth.uid() AND delivered = true);

-- Policies for user_push_tokens (users can manage their own tokens)
CREATE POLICY "Users can manage their push tokens" ON user_push_tokens
    FOR ALL TO authenticated USING (user_id = auth.uid());

-- Policies for notification_analytics (users can view their own analytics)
CREATE POLICY "Users can view their notification analytics" ON notification_analytics
    FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Function to clean up old delivery status records
CREATE OR REPLACE FUNCTION cleanup_old_delivery_status()
RETURNS void AS $$
BEGIN
    DELETE FROM notification_delivery_status 
    WHERE timestamp < NOW() - INTERVAL '30 days';
    
    DELETE FROM notification_analytics 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updating timestamps
CREATE TRIGGER update_user_push_tokens_updated_at 
    BEFORE UPDATE ON user_push_tokens 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_delivery_status_updated_at 
    BEFORE UPDATE ON notification_delivery_status 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_delivery_status TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON critical_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_push_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_analytics TO authenticated;
