import { useState, useEffect, useCallback } from 'react';
import { RealTimeSyncService } from '../services/realTimeSync';
import { useAuth } from './useAuth';

export interface RealTimeEvent {
  id: string;
  type: 'connection_request' | 'pattern_learned' | 'friend_activity' | 'presence_update';
  data: any;
  timestamp: Date;
  read: boolean;
}

export interface UseRealTimeUpdatesReturn {
  events: RealTimeEvent[];
  unreadCount: number;
  connectionRequests: any[];
  friendActivities: any[];
  presenceUpdates: Map<string, any>;
  markEventAsRead: (eventId: string) => void;
  markAllAsRead: () => void;
  clearEvents: () => void;
}

export const useRealTimeUpdates = (): UseRealTimeUpdatesReturn => {
  const { user } = useAuth();
  const [events, setEvents] = useState<RealTimeEvent[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<any[]>([]);
  const [friendActivities, setFriendActivities] = useState<any[]>([]);
  const [presenceUpdates, setPresenceUpdates] = useState<Map<string, any>>(new Map());

  const addEvent = useCallback((type: RealTimeEvent['type'], data: any) => {
    const newEvent: RealTimeEvent = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: new Date(),
      read: false
    };
    
    setEvents(prev => [newEvent, ...prev.slice(0, 49)]); // Keep last 50 events
    
    // Update specific state based on event type
    switch (type) {
      case 'connection_request':
        setConnectionRequests(prev => [data, ...prev]);
        break;
      case 'pattern_learned':
      case 'friend_activity':
        setFriendActivities(prev => [data, ...prev.slice(0, 19)]); // Keep last 20 activities
        break;
      case 'presence_update':
        setPresenceUpdates(prev => {
          const newMap = new Map(prev);
          newMap.set(data.userId, data);
          return newMap;
        });
        break;
    }
  }, []);

  const markEventAsRead = useCallback((eventId: string) => {
    setEvents(prev => prev.map(event => 
      event.id === eventId ? { ...event, read: true } : event
    ));
  }, []);

  const markAllAsRead = useCallback(() => {
    setEvents(prev => prev.map(event => ({ ...event, read: true })));
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setConnectionRequests([]);
    setFriendActivities([]);
    setPresenceUpdates(new Map());
  }, []);

  // Calculate unread count
  const unreadCount = events.filter(event => !event.read).length;

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user?.id) {
      clearEvents();
      return;
    }

    console.log('useRealTimeUpdates: Setting up subscriptions for user:', user.id);

    // Note: Real-time updates temporarily disabled - using polling instead
    // TODO: Implement proper real-time subscriptions when backend supports it
    
    const pollInterval = setInterval(() => {
      // Could poll for updates here if needed
    }, 30000);

    return () => {
      console.log('useRealTimeUpdates: Cleaning up subscriptions');
      clearInterval(pollInterval);
    };
  }, [user?.id, addEvent]);

  return {
    events,
    unreadCount,
    connectionRequests,
    friendActivities,
    presenceUpdates,
    markEventAsRead,
    markAllAsRead,
    clearEvents
  };
};
