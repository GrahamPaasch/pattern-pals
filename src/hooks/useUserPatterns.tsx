import { useState, useEffect, useCallback } from 'react';
import { PatternStatus, UserPattern } from '../types';
import { UserPatternService } from '../services';
import { useAuth } from './useAuth';

export interface UseUserPatternsReturn {
  userPatterns: Map<string, PatternStatus>;
  loading: boolean;
  error: string | null;
  setPatternStatus: (patternId: string, status: PatternStatus) => Promise<void>;
  removePatternStatus: (patternId: string) => Promise<void>;
  getPatternStatus: (patternId: string) => PatternStatus | null;
  refreshUserPatterns: () => Promise<void>;
  stats: {
    known: number;
    wantToLearn: number;
    wantToAvoid: number;
  };
}

export const useUserPatterns = (): UseUserPatternsReturn => {
  const { user } = useAuth();
  const [userPatterns, setUserPatterns] = useState<Map<string, PatternStatus>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    known: 0,
    wantToLearn: 0,
    wantToAvoid: 0
  });

  const loadUserPatterns = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const patterns = await UserPatternService.getUserPatterns(user.id);
      const patternMap = new Map<string, PatternStatus>();
      
      patterns.forEach(pattern => {
        patternMap.set(pattern.patternId, pattern.status);
      });

      setUserPatterns(patternMap);

      // Calculate stats
      const newStats = {
        known: 0,
        wantToLearn: 0,
        wantToAvoid: 0
      };

      patterns.forEach(pattern => {
        switch (pattern.status) {
          case 'known':
            newStats.known++;
            break;
          case 'want_to_learn':
            newStats.wantToLearn++;
            break;
          case 'want_to_avoid':
            newStats.wantToAvoid++;
            break;
        }
      });

      setStats(newStats);
    } catch (err) {
      setError('Failed to load user patterns');
      console.error('Error loading user patterns:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const setPatternStatus = useCallback(async (patternId: string, status: PatternStatus) => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    try {
      const success = await UserPatternService.setPatternStatus(user.id, patternId, status);
      
      if (success) {
        // Update local state
        setUserPatterns(prev => {
          const newMap = new Map(prev);
          const oldStatus = newMap.get(patternId);
          newMap.set(patternId, status);
          
          // Update stats
          setStats(prevStats => {
            const newStats = { ...prevStats };
            
            // Decrement old status
            if (oldStatus) {
              switch (oldStatus) {
                case 'known':
                  newStats.known--;
                  break;
                case 'want_to_learn':
                  newStats.wantToLearn--;
                  break;
                case 'want_to_avoid':
                  newStats.wantToAvoid--;
                  break;
              }
            }
            
            // Increment new status
            switch (status) {
              case 'known':
                newStats.known++;
                break;
              case 'want_to_learn':
                newStats.wantToLearn++;
                break;
              case 'want_to_avoid':
                newStats.wantToAvoid++;
                break;
            }
            
            return newStats;
          });
          
          return newMap;
        });
        
        setError(null);
      } else {
        setError('Failed to update pattern status');
      }
    } catch (err) {
      setError('Failed to update pattern status');
      console.error('Error setting pattern status:', err);
    }
  }, [user?.id]);

  const removePatternStatus = useCallback(async (patternId: string) => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    try {
      const success = await UserPatternService.removePatternStatus(user.id, patternId);
      
      if (success) {
        // Update local state
        setUserPatterns(prev => {
          const newMap = new Map(prev);
          const oldStatus = newMap.get(patternId);
          newMap.delete(patternId);
          
          // Update stats
          if (oldStatus) {
            setStats(prevStats => {
              const newStats = { ...prevStats };
              switch (oldStatus) {
                case 'known':
                  newStats.known--;
                  break;
                case 'want_to_learn':
                  newStats.wantToLearn--;
                  break;
                case 'want_to_avoid':
                  newStats.wantToAvoid--;
                  break;
              }
              return newStats;
            });
          }
          
          return newMap;
        });
        
        setError(null);
      } else {
        setError('Failed to remove pattern status');
      }
    } catch (err) {
      setError('Failed to remove pattern status');
      console.error('Error removing pattern status:', err);
    }
  }, [user?.id]);

  const getPatternStatus = useCallback((patternId: string): PatternStatus | null => {
    return userPatterns.get(patternId) || null;
  }, [userPatterns]);

  const refreshUserPatterns = useCallback(async () => {
    await loadUserPatterns();
  }, [loadUserPatterns]);

  // Load user patterns when user changes
  useEffect(() => {
    if (user?.id) {
      loadUserPatterns();
    } else {
      setUserPatterns(new Map());
      setStats({ known: 0, wantToLearn: 0, wantToAvoid: 0 });
    }
  }, [user?.id, loadUserPatterns]);

  return {
    userPatterns,
    loading,
    error,
    setPatternStatus,
    removePatternStatus,
    getPatternStatus,
    refreshUserPatterns,
    stats
  };
};
