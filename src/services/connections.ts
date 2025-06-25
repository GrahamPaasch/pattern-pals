import AsyncStorage from '@react-native-async-storage/async-storage';

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
  private static CONNECTION_REQUESTS_KEY = 'connection_requests';
  private static CONNECTIONS_KEY = 'connections';

  /**
   * Send a connection request
   */
  static async sendConnectionRequest(
    fromUserId: string,
    toUserId: string,
    fromUserName: string,
    toUserName: string,
    message?: string
  ): Promise<boolean> {
    try {
      const requests = await this.getConnectionRequests();
      
      // Check if request already exists
      const existingRequest = requests.find(
        req => req.fromUserId === fromUserId && req.toUserId === toUserId && req.status === 'pending'
      );
      
      if (existingRequest) {
        return false; // Request already exists
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
      
      return true;
    } catch (error) {
      console.error('Error sending connection request:', error);
      return false;
    }
  }

  /**
   * Get all connection requests
   */
  static async getConnectionRequests(): Promise<ConnectionRequest[]> {
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
      return [];
    } catch (error) {
      console.error('Error getting connection requests:', error);
      return [];
    }
  }

  /**
   * Get connection requests for a specific user (received)
   */
  static async getConnectionRequestsForUser(userId: string): Promise<ConnectionRequest[]> {
    try {
      const allRequests = await this.getConnectionRequests();
      return allRequests.filter(req => req.toUserId === userId && req.status === 'pending');
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
      const requests = await this.getConnectionRequests();
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
      console.error('Error accepting connection request:', error);
      return false;
    }
  }

  /**
   * Decline a connection request
   */
  static async declineConnectionRequest(requestId: string): Promise<boolean> {
    try {
      const requests = await this.getConnectionRequests();
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
      console.error('Error declining connection request:', error);
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
}
