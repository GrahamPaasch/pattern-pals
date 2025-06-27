import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export type OfflineService = 'connections' | 'sessions' | 'patterns';

export interface OfflineOperation {
  service: OfflineService;
  action: string;
  data: any;
  timestamp: number;
}

const QUEUE_KEY = 'offline_queue';

export class SyncService {
  static async isOnline(): Promise<boolean> {
    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  }

  private static async getQueue(): Promise<OfflineOperation[]> {
    const stored = await AsyncStorage.getItem(QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private static async saveQueue(queue: OfflineOperation[]): Promise<void> {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  static async queueOperation(op: OfflineOperation): Promise<void> {
    const queue = await this.getQueue();
    queue.push(op);
    await this.saveQueue(queue);
  }

  static async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
  }

  static async sync(): Promise<void> {
    if (!(await this.isOnline())) return;
    const queue = await this.getQueue();
    for (const op of queue) {
      try {
        switch (op.service) {
          case 'connections':
            await supabase.from('connections').upsert(op.data);
            break;
          case 'sessions':
            await supabase.from('sessions').upsert(op.data);
            break;
          case 'patterns':
            await supabase.from('user_patterns').upsert(op.data);
            break;
          default:
            break;
        }
      } catch (err) {
        console.error('Sync error:', err);
        // keep operation in queue if failed
      }
    }
    await this.clearQueue();
  }
}
