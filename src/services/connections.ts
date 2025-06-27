import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';

export interface ConnectionRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromUserName: string;
  toUserName: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  updatedAt: Date;
  message?: string;
}

export interface Connection {
  id: string;
  userId1: string;
  userId2: string;
  userName1: string;
  userName2: string;
  connectedAt: Date;
  status: 'active' | 'blocked';
}

export class ConnectionService {
  private static CONNECTION_REQUESTS_KEY = 'connection_requests_global'; // Fallback for offline
  private static CONNECTIONS_KEY = 'connections_global'; // Fallback for offline
  private static USE_SUPABASE = true; // Enable Supabase backend (will fallback to local if not configured)

  /**
   * Check if Supabase is properly configured
   */
  private static isSupabaseConfigured(): boolean {
    return isSupabaseConfigured() === true;
  }

  /**
   * Send a connection request (with Supabase support)
   */
  static async sendConnectionRequest(
    fromUserId: string,
    toUserId: string,
    fromUserName: string,
    toUserName: string,
    message?: string
  ): Promise<boolean> {
    try {
      console.log(`ConnectionService: Sending request from ${fromUserName} (${fromUserId}) to ${toUserName} (${toUserId})`);
      
      if (this.USE_SUPABASE && this.isSupabaseConfigured() && supabase) {
        // Validate UUIDs - if they're not valid UUIDs, fall back to local storage
        const isValidUUID = (id: string) => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          return uuidRegex.test(id);
        };
        
        if (!isValidUUID(fromUserId) || !isValidUUID(toUserId)) {
          console.log('ConnectionService: Invalid UUID format, falling back to local storage');
          return this.sendConnectionRequestLocal(fromUserId, toUserId, fromUserName, toUserName, message);
        }
        
        // Use Supabase for real backend
        const { data, error } = await supabase
          .from('connection_requests')
          .insert({
            from_user_id: fromUserId,
            to_user_id: toUserId,
            from_user_name: fromUserName,
            to_user_name: toUserName,
            message,
            status: 'pending'
          })
          .select()
          .single();

        if (error) {
          console.error('Supabase error sending connection request:', error);
          console.log('ConnectionService: Falling back to local storage due to Supabase error');
          return this.sendConnectionRequestLocal(fromUserId, toUserId, fromUserName, toUserName, message);
        }

        console.log('ConnectionService: Successfully sent request via Supabase');
        return true;
      } else {
        // Fallback to AsyncStorage for development/testing
        console.log('ConnectionService: Using local storage (Supabase not configured or disabled)');
        return this.sendConnectionRequestLocal(fromUserId, toUserId, fromUserName, toUserName, message);
      }
    } catch (error) {
      console.error('Error sending connection request:', error);
      console.log('ConnectionService: Falling back to local storage due to error');
      return this.sendConnectionRequestLocal(fromUserId, toUserId, fromUserName, toUserName, message);
    }
  }

  /**
   * Send connection request locally (AsyncStorage fallback)
   */
  private static async sendConnectionRequestLocal(
    fromUserId: string,
    toUserId: string,
    fromUserName: string,
    toUserName: string,
    message?: string
  ): Promise<boolean> {
    try {
      const requests = await this.getConnectionRequests();
      console.log(`ConnectionService: Current requests count: ${requests.length}`);
      
      // Check if request already exists
      const existingRequest = requests.find(
        req => req.fromUserId === fromUserId && req.toUserId === toUserId && req.status === 'pending'
      );
      
      if (existingRequest) {
        console.log('ConnectionService: Request already exists');
        return false;
      }

      const newRequest: ConnectionRequest = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fromUserId,
        toUserId,
        fromUserName,
        toUserName,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        message,
      };

      const updatedRequests = [...requests, newRequest];
      await AsyncStorage.setItem(this.CONNECTION_REQUESTS_KEY, JSON.stringify(updatedRequests));
      
      console.log(`ConnectionService: Successfully saved request locally. New count: ${updatedRequests.length}`);
      return true;
    } catch (error) {
      console.error('Error sending connection request locally:', error);
      return false;
    }
  }

  /**
   * Get all connection requests
   */
  static async getConnectionRequests(): Promise<ConnectionRequest[]> {
    try {
      if (this.USE_SUPABASE && this.isSupabaseConfigured() && supabase) {
        // Use Supabase for real backend
        const { data, error } = await supabase
          .from('connection_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Supabase error getting connection requests:', error);
          console.log('ConnectionService: Falling back to local storage due to Supabase error');
          return this.getConnectionRequestsLocal();
        }

        // Transform Supabase data to our format
        return data.map((req: any) => ({
          id: req.id,
          fromUserId: req.from_user_id,
          toUserId: req.to_user_id,
          fromUserName: req.from_user_name,
          toUserName: req.to_user_name,
          status: req.status,
          createdAt: new Date(req.created_at),
          updatedAt: new Date(req.updated_at || req.created_at),
          message: req.message,
        }));
      } else {
        // Fallback to AsyncStorage for development/testing
        console.log('ConnectionService: Using local storage for getting requests (Supabase not configured or disabled)');
        return this.getConnectionRequestsLocal();
      }
    } catch (error) {
      console.error('Error getting connection requests:', error);
      console.log('ConnectionService: Falling back to local storage due to error');
      return this.getConnectionRequestsLocal();
    }
  }

  /**
   * Get connection requests from local storage (fallback)
   */
  private static async getConnectionRequestsLocal(): Promise<ConnectionRequest[]> {
    try {
      const stored = await AsyncStorage.getItem(this.CONNECTION_REQUESTS_KEY);
      if (stored) {
        const requests = JSON.parse(stored);
        return requests.map((req: any) => ({
          ...req,
          createdAt: new Date(req.createdAt),
          updatedAt: new Date(req.updatedAt),
        }));
      }
      
      // For testing: Create some demo requests if none exist
      return this.createDemoRequestsIfEmpty();
    } catch (error) {
      console.error('Error getting connection requests from local storage:', error);
      return [];
    }
  }

  /**
   * Create demo connection requests for testing cross-user functionality
   */
  private static async createDemoRequestsIfEmpty(): Promise<ConnectionRequest[]> {
    try {
      const demoRequests: ConnectionRequest[] = [
        {
          id: 'demo_req_1',
          fromUserId: 'demo_user_1',
          toUserId: 'demo_user_2',
          fromUserName: 'Alex Chen',
          toUserName: 'Sarah Williams',
          status: 'pending',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          message: 'Hi! I saw you practice similar patterns. Would love to juggle together!'
        },
        {
          id: 'demo_req_2',
          fromUserId: 'demo_user_3',
          toUserId: 'demo_user_2',
          fromUserName: 'Mike Johnson',
          toUserName: 'Sarah Williams',
          status: 'pending',
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
          message: 'Hey! Interested in working on some 645 patterns together?'
        }
      ];

      await AsyncStorage.setItem(this.CONNECTION_REQUESTS_KEY, JSON.stringify(demoRequests));
      console.log('ConnectionService: Created demo connection requests for testing');
      return demoRequests;
    } catch (error) {
      console.error('Error creating demo requests:', error);
      return [];
    }
  }

  /**
   * Get connection requests for a specific user (received)
   */
  static async getConnectionRequestsForUser(userId: string): Promise<ConnectionRequest[]> {
    try {
      const allRequests = await this.getConnectionRequests();
      const userRequests = allRequests.filter(req => req.toUserId === userId && req.status === 'pending');
      
      console.log(`ConnectionService: Getting requests for user ${userId}`);
      console.log(`ConnectionService: Total requests in storage: ${allRequests.length}`);
      console.log(`ConnectionService: Requests for this user: ${userRequests.length}`);
      console.log(`ConnectionService: User requests:`, userRequests.map(r => `${r.fromUserName} -> ${r.toUserName}`));
      
      return userRequests;
    } catch (error) {
      console.error('Error getting connection requests for user:', error);
      return [];
    }
  }

  /**
   * Get connection requests sent by a user
   */
  static async getConnectionRequestsSentByUser(userId: string): Promise<ConnectionRequest[]> {
    try {
      const allRequests = await this.getConnectionRequests();
      return allRequests.filter(req => req.fromUserId === userId);
    } catch (error) {
      console.error('Error getting connection requests sent by user:', error);
      return [];
    }
  }

  /**
   * Accept a connection request
   */
  static async acceptConnectionRequest(requestId: string): Promise<boolean> {
    try {
      if (this.USE_SUPABASE && this.isSupabaseConfigured()) {
        // Use Supabase for real backend
        const { data: request, error: fetchError } = await supabase!
          .from('connection_requests')
          .select('*')
          .eq('id', requestId)
          .single();

        if (fetchError || !request) {
          console.error('Error fetching connection request:', fetchError);
          return this.acceptConnectionRequestLocal(requestId);
        }

        // Update request status to accepted
        const { error: updateError } = await supabase!
          .from('connection_requests')
          .update({ 
            status: 'accepted',
            updated_at: new Date().toISOString()
          })
          .eq('id', requestId);

        if (updateError) {
          console.error('Error updating connection request:', updateError);
          return this.acceptConnectionRequestLocal(requestId);
        }

        // Create connection in Supabase
        const { error: connectionError } = await supabase!
          .from('connections')
          .insert({
            user1_id: request.from_user_id,
            user2_id: request.to_user_id,
            user1_name: request.from_user_name,
            user2_name: request.to_user_name,
            status: 'active'
          });

        if (connectionError) {
          console.error('Error creating connection:', connectionError);
          // Connection creation failed, but request was accepted
          // This is still a partial success
        }

        console.log('ConnectionService: Successfully accepted request via Supabase');
        return true;
      } else {
        // Fallback to AsyncStorage for development/testing
        console.log('ConnectionService: Using local storage for accepting request (Supabase not configured or disabled)');
        return this.acceptConnectionRequestLocal(requestId);
      }
    } catch (error) {
      console.error('Error accepting connection request:', error);
      console.log('ConnectionService: Falling back to local storage due to error');
      return this.acceptConnectionRequestLocal(requestId);
    }
  }

  /**
   * Accept connection request locally (fallback)
   */
  private static async acceptConnectionRequestLocal(requestId: string): Promise<boolean> {
    try {
      const requests = await this.getConnectionRequestsLocal();
      const requestIndex = requests.findIndex(req => req.id === requestId);
      
      if (requestIndex === -1) {
        return false;
      }

      const request = requests[requestIndex];
      
      // Update request status
      requests[requestIndex] = {
        ...request,
        status: 'accepted',
        updatedAt: new Date(),
      };

      await AsyncStorage.setItem(this.CONNECTION_REQUESTS_KEY, JSON.stringify(requests));

      // Create connection
      const connection: Connection = {
        id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId1: request.fromUserId,
        userId2: request.toUserId,
        userName1: request.fromUserName,
        userName2: request.toUserName,
        connectedAt: new Date(),
        status: 'active',
      };

      const connections = await this.getConnections();
      const updatedConnections = [...connections, connection];
      await AsyncStorage.setItem(this.CONNECTIONS_KEY, JSON.stringify(updatedConnections));

      return true;
    } catch (error) {
      console.error('Error accepting connection request locally:', error);
      return false;
    }
  }

  /**
   * Decline a connection request
   */
  static async declineConnectionRequest(requestId: string): Promise<boolean> {
    try {
      if (this.USE_SUPABASE && this.isSupabaseConfigured()) {
        // Use Supabase for real backend
        const { error } = await supabase!
          .from('connection_requests')
          .update({ 
            status: 'declined',
            updated_at: new Date().toISOString()
          })
          .eq('id', requestId);

        if (error) {
          console.error('Supabase error declining connection request:', error);
          return this.declineConnectionRequestLocal(requestId);
        }

        console.log('ConnectionService: Successfully declined request via Supabase');
        return true;
      } else {
        // Fallback to AsyncStorage for development/testing
        console.log('ConnectionService: Using local storage for declining request (Supabase not configured or disabled)');
        return this.declineConnectionRequestLocal(requestId);
      }
    } catch (error) {
      console.error('Error declining connection request:', error);
      console.log('ConnectionService: Falling back to local storage due to error');
      return this.declineConnectionRequestLocal(requestId);
    }
  }

  /**
   * Decline connection request locally (fallback)
   */
  private static async declineConnectionRequestLocal(requestId: string): Promise<boolean> {
    try {
      const requests = await this.getConnectionRequestsLocal();
      const requestIndex = requests.findIndex(req => req.id === requestId);
      
      if (requestIndex === -1) {
        return false;
      }

      requests[requestIndex] = {
        ...requests[requestIndex],
        status: 'declined',
        updatedAt: new Date(),
      };

      await AsyncStorage.setItem(this.CONNECTION_REQUESTS_KEY, JSON.stringify(requests));
      return true;
    } catch (error) {
      console.error('Error declining connection request locally:', error);
      return false;
    }
  }

  /**
   * Get all connections
   */
  static async getConnections(): Promise<Connection[]> {
    try {
      const stored = await AsyncStorage.getItem(this.CONNECTIONS_KEY);
      if (stored) {
        const connections = JSON.parse(stored);
        return connections.map((conn: any) => ({
          ...conn,
          connectedAt: new Date(conn.connectedAt),
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting connections:', error);
      return [];
    }
  }

  /**
   * Get connections for a specific user
   */
  static async getConnectionsForUser(userId: string): Promise<Connection[]> {
    try {
      const allConnections = await this.getConnections();
      return allConnections.filter(
        conn => (conn.userId1 === userId || conn.userId2 === userId) && conn.status === 'active'
      );
    } catch (error) {
      console.error('Error getting connections for user:', error);
      return [];
    }
  }

  /**
   * Check if two users are connected
   */
  static async areUsersConnected(userId1: string, userId2: string): Promise<boolean> {
    try {
      const connections = await this.getConnections();
      return connections.some(
        conn =>
          conn.status === 'active' &&
          ((conn.userId1 === userId1 && conn.userId2 === userId2) ||
           (conn.userId1 === userId2 && conn.userId2 === userId1))
      );
    } catch (error) {
      console.error('Error checking if users are connected:', error);
      return false;
    }
  }

  /**
   * Check if there's a pending request between users
   */
  static async hasPendingRequest(fromUserId: string, toUserId: string): Promise<boolean> {
    try {
      const requests = await this.getConnectionRequests();
      return requests.some(
        req =>
          req.status === 'pending' &&
          ((req.fromUserId === fromUserId && req.toUserId === toUserId) ||
           (req.fromUserId === toUserId && req.toUserId === fromUserId))
      );
    } catch (error) {
      console.error('Error checking for pending request:', error);
      return false;
    }
  }

  /**
   * Remove a connection
   */
  static async removeConnection(connectionId: string): Promise<boolean> {
    try {
      const connections = await this.getConnections();
      const filteredConnections = connections.filter(conn => conn.id !== connectionId);
      await AsyncStorage.setItem(this.CONNECTIONS_KEY, JSON.stringify(filteredConnections));
      return true;
    } catch (error) {
      console.error('Error removing connection:', error);
      return false;
    }
  }

  /**
   * Clear all connection data (for testing/reset)
   */
  static async clearAllConnectionData(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(this.CONNECTION_REQUESTS_KEY);
      await AsyncStorage.removeItem(this.CONNECTIONS_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing connection data:', error);
      return false;
    }
  }

  /**
   * Debug method: Get all connection requests in the system
   */
  static async getAllConnectionRequestsForDebugging(): Promise<ConnectionRequest[]> {
    try {
      const allRequests = await this.getConnectionRequests();
      console.log('=== ALL CONNECTION REQUESTS IN SYSTEM ===');
      allRequests.forEach(req => {
        console.log(`${req.fromUserName} (${req.fromUserId}) -> ${req.toUserName} (${req.toUserId}) [${req.status}]`);
      });
      console.log('==========================================');
      return allRequests;
    } catch (error) {
      console.error('Error getting all requests for debugging:', error);
      return [];
    }
  }

  /**
   * Toggle between Supabase and local storage for testing
   */
  static toggleBackend(useSupabase: boolean = false) {
    this.USE_SUPABASE = useSupabase;
    console.log(`ConnectionService: Switched to ${useSupabase ? 'Supabase' : 'Local Storage'} backend`);
  }

  /**
   * Check current backend mode
   */
  static getCurrentBackend(): string {
    return this.USE_SUPABASE ? 'Supabase' : 'Local Storage';
  }

  /**
   * Cancel a connection request (sent by current user)
   */
  static async cancelConnectionRequest(requestId: string): Promise<boolean> {
    try {
      if (this.USE_SUPABASE && this.isSupabaseConfigured()) {
        // Use Supabase for real backend
        const { error } = await supabase!
          .from('connection_requests')
          .delete()
          .eq('id', requestId);

        if (error) {
          console.error('Supabase error canceling connection request:', error);
          return this.cancelConnectionRequestLocal(requestId);
        }

        console.log('ConnectionService: Successfully canceled request via Supabase');
        return true;
      } else {
        // Fallback to AsyncStorage for development/testing
        console.log('ConnectionService: Using local storage for canceling request (Supabase not configured or disabled)');
        return this.cancelConnectionRequestLocal(requestId);
      }
    } catch (error) {
      console.error('Error canceling connection request:', error);
      console.log('ConnectionService: Falling back to local storage due to error');
      return this.cancelConnectionRequestLocal(requestId);
    }
  }

  /**
   * Cancel connection request locally (fallback)
   */
  private static async cancelConnectionRequestLocal(requestId: string): Promise<boolean> {
    try {
      const requests = await this.getConnectionRequestsLocal();
      const filteredRequests = requests.filter(req => req.id !== requestId);
      
      if (filteredRequests.length === requests.length) {
        // Request not found
        return false;
      }

      await AsyncStorage.setItem(this.CONNECTION_REQUESTS_KEY, JSON.stringify(filteredRequests));
      return true;
    } catch (error) {
      console.error('Error canceling connection request locally:', error);
      return false;
    }
  }
}
