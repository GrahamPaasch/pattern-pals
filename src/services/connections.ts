import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { SyncService } from './sync';
import { ErrorService, ErrorType, ErrorSeverity } from './errorService';
import { PerformanceService } from './performanceService';
import { ValidationService } from './validationService';
import { CacheService, CacheKeys } from './cacheService';
import { RealTimeSyncService } from './realTimeSync';

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
   * Generate a proper UUID format for Supabase compatibility
   */
  private static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Check if Supabase is properly configured
   */
  private static isSupabaseConfigured(): boolean {
    const configured = isSupabaseConfigured() === true;
    console.log('🔧 ConnectionService: Supabase configured?', configured);
    console.log('🔧 ConnectionService: Supabase client exists?', !!supabase);
    console.log('🔧 ConnectionService: USE_SUPABASE flag?', this.USE_SUPABASE);
    return configured;
  }

  /**
   * Send a connection request (with enhanced error handling and performance tracking)
   */
  static async sendConnectionRequest(
    fromUserId: string,
    toUserId: string,
    fromUserName: string,
    toUserName: string,
    message?: string
  ): Promise<boolean> {
    // 🔍 DEBUG: Log the actual user IDs being used
    console.log(`🔍 SEND_REQUEST_DEBUG: fromUserId=${fromUserId}, toUserId=${toUserId}`);
    console.log(`🔍 SEND_REQUEST_DEBUG: fromUserName=${fromUserName}, toUserName=${toUserName}`);
    
    const metricId = PerformanceService.startMetric('send_connection_request', 'api', {
      fromUserId,
      toUserId,
      hasMessage: !!message
    });

    try {
      // Validate input data
      const validation = ValidationService.validateWithRules({
        fromUserId,
        toUserId,
        fromUserName,
        toUserName
      }, [
        { field: 'fromUserId', required: true, minLength: 1 },
        { field: 'toUserId', required: true, minLength: 1 },
        { field: 'fromUserName', required: true, minLength: 2, maxLength: 50 },
        { field: 'toUserName', required: true, minLength: 2, maxLength: 50 }
      ]);

      if (!validation.isValid) {
        const error = new Error(`Validation failed: ${validation.errors.join(', ')}`);
        ErrorService.logError(error, ErrorType.VALIDATION, ErrorSeverity.MEDIUM, {
          fromUserId,
          toUserId,
          validationErrors: validation.errors
        });
        PerformanceService.endMetric(metricId, { success: false, error: 'validation_failed' });
        return false;
      }

      console.log(`ConnectionService: Sending request from ${fromUserName} (${fromUserId}) to ${toUserName} (${toUserId})`);
      
      if (this.USE_SUPABASE && this.isSupabaseConfigured() && supabase) {
        // Validate UUIDs - if they're not valid UUIDs, fall back to local storage
        const isValidUUID = (id: string) => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          return uuidRegex.test(id);
        };
        
        if (!isValidUUID(fromUserId) || !isValidUUID(toUserId)) {
          console.log('ConnectionService: Invalid UUID format, falling back to local storage');
          const result = await this.sendConnectionRequestLocal(fromUserId, toUserId, fromUserName, toUserName, message);
          PerformanceService.endMetric(metricId, { success: result, backend: 'local', reason: 'invalid_uuid' });
          return result;
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
          ErrorService.logError(error, ErrorType.DATABASE, ErrorSeverity.MEDIUM, {
            fromUserId,
            toUserId,
            supabaseError: error.message
          });
          console.log('ConnectionService: Falling back to local storage due to Supabase error');
          const result = await this.sendConnectionRequestLocal(fromUserId, toUserId, fromUserName, toUserName, message);
          PerformanceService.endMetric(metricId, { success: result, backend: 'local', reason: 'supabase_error' });
          return result;
        }

        // Invalidate cache for connection requests
        await CacheService.invalidatePattern(`connection_requests_${toUserId}`);
        
        // 🚀 REAL-TIME FEATURE: Instantly notify target user
        await RealTimeSyncService.broadcastConnectionRequest(fromUserId, fromUserName, toUserId, toUserName);
        
        console.log('ConnectionService: Successfully sent request via Supabase');
        PerformanceService.endMetric(metricId, { success: true, backend: 'supabase' });
        return true;
      } else {
        // Fallback to AsyncStorage for development/testing
        console.log('ConnectionService: Using local storage (Supabase not configured or disabled)');
        const result = await this.sendConnectionRequestLocal(fromUserId, toUserId, fromUserName, toUserName, message);
        PerformanceService.endMetric(metricId, { success: result, backend: 'local' });
        return result;
      }
    } catch (error) {
      ErrorService.logError(error instanceof Error ? error : new Error(String(error)), ErrorType.UNKNOWN, ErrorSeverity.HIGH, {
        fromUserId,
        toUserId,
        operation: 'sendConnectionRequest'
      });
      console.log('ConnectionService: Falling back to local storage due to error');
      try {
        const result = await this.sendConnectionRequestLocal(fromUserId, toUserId, fromUserName, toUserName, message);
        PerformanceService.endMetric(metricId, { success: result, backend: 'local', reason: 'exception_fallback' });
        return result;
      } catch (fallbackError) {
        ErrorService.logError(fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)), ErrorType.UNKNOWN, ErrorSeverity.CRITICAL, {
          fromUserId,
          toUserId,
          operation: 'sendConnectionRequestLocal_fallback'
        });
        PerformanceService.endMetric(metricId, { success: false, error: 'complete_failure' });
        return false;
      }
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
        id: this.generateUUID(),
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
      
      // Queue sync operation for when online
      await SyncService.queueOperation({
        service: 'connections',
        action: 'sendRequest',
        data: newRequest,
        timestamp: Date.now(),
      });
      
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
      console.log('🔧 ConnectionService: Getting connection requests...');
      console.log('🔧 ConnectionService: USE_SUPABASE:', this.USE_SUPABASE);
      console.log('🔧 ConnectionService: isSupabaseConfigured():', this.isSupabaseConfigured());
      console.log('🔧 ConnectionService: supabase exists:', !!supabase);
      
      if (this.USE_SUPABASE && this.isSupabaseConfigured() && supabase) {
        console.log('🔧 ConnectionService: Using Supabase backend');
        // Use Supabase for real backend
        const { data, error } = await supabase
          .from('connection_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('🔧 Supabase error getting connection requests:', error);
          console.log('🔧 ConnectionService: Falling back to local storage due to Supabase error');
          return this.getConnectionRequestsLocal();
        }

        console.log('🔧 ConnectionService: Successfully fetched from Supabase:', data?.length || 0, 'requests');
        
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
        console.log('🔧 ConnectionService: Using local storage for getting requests (Supabase not configured or disabled)');
        return this.getConnectionRequestsLocal();
      }
    } catch (error) {
      console.error('🔧 Error getting connection requests:', error);
      console.log('🔧 ConnectionService: Falling back to local storage due to error');
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
   * Updated to use REAL user IDs from current app users for cross-user testing
   */
  private static async createDemoRequestsIfEmpty(): Promise<ConnectionRequest[]> {
    try {
      // Get current users from the app to create realistic cross-user requests
      const { UserSearchService } = await import('./userSearch');
      const allUsers = await UserSearchService.getAllUsers('demo_current_user');
      
      console.log('🎯 Creating realistic demo requests with actual user IDs for cross-user testing');
      console.log(`📊 Found ${allUsers.length} users in the app for demo requests`);
      
      const demoRequests: ConnectionRequest[] = [];
      
      // If we have at least 2 users, create cross-requests between them
      if (allUsers.length >= 2) {
        // Create bidirectional requests between real users for testing
        for (let i = 0; i < Math.min(allUsers.length - 1, 3); i++) {
          const fromUser = allUsers[i];
          const toUser = allUsers[i + 1];
          
          // Request from user A to user B
          demoRequests.push({
            id: this.generateUUID(),
            fromUserId: fromUser.id,
            toUserId: toUser.id,
            fromUserName: fromUser.name,
            toUserName: toUser.name,
            status: 'pending',
            createdAt: new Date(Date.now() - (i + 1) * 30 * 60 * 1000), // Staggered times
            updatedAt: new Date(Date.now() - (i + 1) * 30 * 60 * 1000),
            message: `Hey ${toUser.name}! I'd love to juggle together and share some patterns. Want to connect?`
          });
          
          // Also create reverse request for maximum cross-user testing
          if (i === 0) {
            demoRequests.push({
              id: this.generateUUID(),
              fromUserId: toUser.id,
              toUserId: fromUser.id,
              fromUserName: toUser.name,
              toUserName: fromUser.name,
              status: 'pending',
              createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
              updatedAt: new Date(Date.now() - 15 * 60 * 1000),
              message: `Hi ${fromUser.name}! I noticed we have similar pattern interests. Let's practice together!`
            });
          }
        }
      }
      
      // If no real users yet, create some placeholder requests with more realistic looking IDs
      if (demoRequests.length === 0) {
        console.log('🎯 No real users found, creating realistic placeholder requests');
        demoRequests.push(
          {
            id: 'realistic_req_1',
            fromUserId: '12345678-1234-4567-8901-123456789001',
            toUserId: '12345678-1234-4567-8901-123456789002',
            fromUserName: 'Alex Chen',
            toUserName: 'Sarah Williams',
            status: 'pending',
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            message: 'Hi! I saw you practice similar patterns. Would love to juggle together!'
          },
          {
            id: 'realistic_req_2',
            fromUserId: '12345678-1234-4567-8901-123456789003',
            toUserId: '12345678-1234-4567-8901-123456789002',
            fromUserName: 'Mike Johnson',
            toUserName: 'Sarah Williams',
            status: 'pending',
            createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
            message: 'Hey! Interested in working on some 645 patterns together?'
          }
        );
      }

      await AsyncStorage.setItem(this.CONNECTION_REQUESTS_KEY, JSON.stringify(demoRequests));
      console.log(`🎯 Created ${demoRequests.length} realistic connection requests for cross-user testing`);
      
      if (demoRequests.length > 0) {
        console.log('🎯 Demo requests created with IDs:');
        demoRequests.forEach((req, index) => {
          console.log(`   ${index + 1}. ${req.fromUserName} -> ${req.toUserName} (${req.fromUserId.slice(0, 8)}...)`);
        });
      }
      
      return demoRequests;
    } catch (error) {
      console.error('Error creating realistic demo requests:', error);
      return [];
    }
  }

  /**
   * Create test connection requests for the current user to receive (for debugging purposes)
   */
  static async createTestIncomingRequests(currentUserId: string, currentUserName: string): Promise<void> {
    try {
      console.log(`🧪 Creating test incoming requests for user: ${currentUserName} (${currentUserId})`);
      
      // SIMPLIFIED VERSION: Always create mock requests with proper UUIDs to avoid Supabase UUID errors
      console.log('🧪 Creating simple mock users for test requests (avoiding UUID errors)');
      
      // Create some test requests from mock users with proper UUIDs
      const testRequests: ConnectionRequest[] = [
        {
          id: this.generateUUID(),
          fromUserId: this.generateUUID(), // Generate proper UUID instead of 'test_user_1'
          toUserId: currentUserId,
          fromUserName: 'Test User Alice',
          toUserName: currentUserName || 'Unknown User',
          status: 'pending',
          createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          updatedAt: new Date(Date.now() - 30 * 60 * 1000),
          message: `Hi ${currentUserName || 'there'}! I'd love to practice juggling together. Are you interested?`
        },
        {
          id: this.generateUUID(),
          fromUserId: this.generateUUID(), // Generate proper UUID instead of 'test_user_2'
          toUserId: currentUserId,
          fromUserName: 'Test User Bob',
          toUserName: currentUserName || 'Unknown User',
          status: 'pending',
          createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          updatedAt: new Date(Date.now() - 60 * 60 * 1000),
          message: `Hey ${currentUserName || 'there'}! I saw your profile and think we could learn from each other. Want to connect?`
        }
      ];
      
      console.log(`🧪 Generated test requests:`, testRequests.map(r => ({ 
        id: r.id, 
        from: r.fromUserId,
        to: r.toUserId,
        fromName: r.fromUserName,
        toName: r.toUserName
      })));
      
      if (this.USE_SUPABASE && this.isSupabaseConfigured() && supabase) {
        // Try to add to Supabase with proper error handling
        try {
          const supabaseRequests = testRequests.map(req => ({
            id: req.id,
            from_user_id: req.fromUserId,
            to_user_id: req.toUserId,
            from_user_name: req.fromUserName,
            to_user_name: req.toUserName,
            message: req.message,
            status: req.status,
            created_at: req.createdAt?.toISOString(),
            updated_at: req.updatedAt?.toISOString()
          }));
          
          console.log('🧪 Inserting to Supabase:', supabaseRequests);
          
          const { data, error } = await supabase
            .from('connection_requests')
            .insert(supabaseRequests);
          
          if (error) {
            console.error('Error adding test requests to Supabase:', error);
            // Fallback to local storage
            const existingRequests = await this.getConnectionRequests();
            const allRequests = [...existingRequests, ...testRequests];
            await AsyncStorage.setItem(this.CONNECTION_REQUESTS_KEY, JSON.stringify(allRequests));
            console.log('🧪 Fell back to local storage due to Supabase error');
          } else {
            console.log('🧪 Successfully added test requests to Supabase');
          }
        } catch (supabaseError) {
          console.error('Supabase insertion failed:', supabaseError);
          // Fallback to local storage
          const existingRequests = await this.getConnectionRequests();
          const allRequests = [...existingRequests, ...testRequests];
          await AsyncStorage.setItem(this.CONNECTION_REQUESTS_KEY, JSON.stringify(allRequests));
          console.log('🧪 Fell back to local storage due to Supabase exception');
        }
      } else {
        // Add to local storage
        const existingRequests = await this.getConnectionRequests();
        const allRequests = [...existingRequests, ...testRequests];
        await AsyncStorage.setItem(this.CONNECTION_REQUESTS_KEY, JSON.stringify(allRequests));
        console.log('🧪 Successfully added test requests to local storage');
      }
      
      console.log(`🧪 Created ${testRequests.length} test incoming requests for ${currentUserName}`);
    } catch (error) {
      console.error('Error creating test incoming requests:', error);
    }
  }

  /**
   * Get all connection requests for a specific user (received)
   */
  static async getConnectionRequestsForUser(userId: string): Promise<ConnectionRequest[]> {
    try {
      const allRequests = await this.getConnectionRequests();
      
      console.log(`🔍 DEBUG: Getting requests for user "${userId}" (length: ${userId.length})`);
      console.log(`🔍 DEBUG: Total requests in storage: ${allRequests.length}`);
      
      // Enhanced debug: Log the exact user ID format and comparison
      console.log(`🔍 DEBUG: Looking for incoming requests where toUserId === "${userId}"`);
      
      // First, let's see ALL requests that match the current user (both incoming and outgoing)
      const incomingRequests = allRequests.filter(req => {
        const isMatch = req.toUserId === userId && req.status === 'pending';
        console.log(`🔍 DEBUG: Checking request: "${req.toUserId}" === "${userId}" && status="${req.status}" = ${isMatch}`);
        return isMatch;
      });
      
      const outgoingRequests = allRequests.filter(req => req.fromUserId === userId && req.status === 'pending');
      const acceptedRequests = allRequests.filter(req => (req.toUserId === userId || req.fromUserId === userId) && req.status === 'accepted');
      
      console.log(`🔍 DEBUG: INCOMING requests (to user ${userId}): ${incomingRequests.length}`);
      incomingRequests.forEach((req, index) => {
        console.log(`  INCOMING ${index + 1}: ${req.fromUserName} -> ${req.toUserName} (${req.id})`);
      });
      
      console.log(`🔍 DEBUG: OUTGOING requests (from user ${userId}): ${outgoingRequests.length}`);
      outgoingRequests.forEach((req, index) => {
        console.log(`  OUTGOING ${index + 1}: ${req.fromUserName} -> ${req.toUserName} (${req.id})`);
      });
      
      console.log(`🔍 DEBUG: ACCEPTED requests (involving user ${userId}): ${acceptedRequests.length}`);
      acceptedRequests.forEach((req, index) => {
        console.log(`  ACCEPTED ${index + 1}: ${req.fromUserName} -> ${req.toUserName} (${req.id})`);
      });
      
      // DEBUG: Log all requests to see their structure with detailed comparison
      console.log('🔍 DEBUG: All requests structure:');
      allRequests.forEach((req, index) => {
        console.log(`  Request ${index + 1}:`);
        console.log(`    ID: ${req.id}`);
        console.log(`    fromUserId: "${req.fromUserId}" (length: ${req.fromUserId?.length || 'null'})`);
        console.log(`    toUserId: "${req.toUserId}" (length: ${req.toUserId?.length || 'null'})`);
        console.log(`    fromUserName: ${req.fromUserName}`);
        console.log(`    toUserName: ${req.toUserName}`);
        console.log(`    status: ${req.status}`);
        console.log(`    toUserId === userId? ${req.toUserId === userId} (${typeof req.toUserId} vs ${typeof userId})`);
        console.log(`    toUserId.trim() === userId.trim()? ${req.toUserId?.trim() === userId?.trim()}`);
        console.log('    ---');
      });
      
      // Additional check for case sensitivity and whitespace issues
      const incomingRequestsFallback = allRequests.filter(req => {
        const trimmedTo = req.toUserId?.trim();
        const trimmedCurrent = userId?.trim();
        return trimmedTo === trimmedCurrent && req.status === 'pending';
      });
      
      console.log(`🔍 DEBUG: Fallback search (trimmed): ${incomingRequestsFallback.length} requests`);
      
      // Use the better result
      const finalRequests = incomingRequests.length > 0 ? incomingRequests : incomingRequestsFallback;
      
      console.log(`🔍 DEBUG: Final requests for this user: ${finalRequests.length}`);
      console.log(`🔍 DEBUG: Final user requests:`, finalRequests.map(r => `${r.fromUserName} -> ${r.toUserName}`));
      
      return finalRequests;
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
        id: this.generateUUID(),
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

      // Queue sync operation for when online
      await SyncService.queueOperation({
        service: 'connections',
        action: 'acceptRequest',
        data: { request: requests[requestIndex], connection },
        timestamp: Date.now(),
      });

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
      
      // Queue sync operation for when online
      await SyncService.queueOperation({
        service: 'connections',
        action: 'declineRequest',
        data: { request: requests[requestIndex] },
        timestamp: Date.now(),
      });
      
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
      if (this.USE_SUPABASE && this.isSupabaseConfigured() && supabase) {
        // Try to get connections from Supabase first
        const { data: supabaseConnections, error } = await supabase
          .from('connections')
          .select('*')
          .eq('status', 'active');

        if (!error && supabaseConnections) {
          console.log(`ConnectionService: Loaded ${supabaseConnections.length} connections from Supabase`);
          
          // Convert Supabase format to our format
          const connections: Connection[] = supabaseConnections.map((conn: any) => ({
            id: conn.id,
            userId1: conn.user1_id,
            userId2: conn.user2_id,
            userName1: conn.user1_name,
            userName2: conn.user2_name,
            connectedAt: new Date(conn.created_at),
            status: conn.status as 'active' | 'blocked'
          }));

          // Also store locally for offline access
          await AsyncStorage.setItem(this.CONNECTIONS_KEY, JSON.stringify(connections));
          return connections;
        } else {
          console.log('ConnectionService: Supabase connections query failed, using local storage');
        }
      }

      // Fallback to local storage
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
