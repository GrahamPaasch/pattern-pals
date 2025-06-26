import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../hooks/useAuth';
import { ScheduleService, ScheduledSession } from '../services';

type ScheduleScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface DayGroup {
  date: string;
  sessions: ScheduledSession[];
}

export default function ScheduleScreen() {
  const navigation = useNavigation<ScheduleScreenNavigationProp>();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ScheduledSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [markedDates, setMarkedDates] = useState<{[key: string]: any}>({});

  useEffect(() => {
    loadSessions();
  }, [user, selectedFilter]);

  useEffect(() => {
    // Update marked dates when sessions change
    updateMarkedDates();
  }, [sessions]);

  // Reload sessions when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadSessions();
      }
    }, [user, selectedFilter])
  );

  const updateMarkedDates = () => {
    const marked: {[key: string]: any} = {};
    
    sessions.forEach(session => {
      const dateKey = session.scheduledTime.toISOString().split('T')[0];
      if (!marked[dateKey]) {
        marked[dateKey] = {
          dots: [],
          selected: dateKey === selectedDate,
          selectedColor: dateKey === selectedDate ? '#6366f1' : undefined,
        };
      }
      
      // Add colored dots based on session status
      const dotColor = getStatusColor(session.status);
      marked[dateKey].dots.push({
        key: session.id,
        color: dotColor,
      });
    });

    // Mark selected date
    if (selectedDate && !marked[selectedDate]) {
      marked[selectedDate] = {
        selected: true,
        selectedColor: '#6366f1',
        dots: [],
      };
    }

    setMarkedDates(marked);
  };

  const loadSessions = async () => {
    if (!user?.id) return;
    
    try {
      console.log('ScheduleScreen.loadSessions - userId:', user.id, 'filter:', selectedFilter);
      let userSessions: ScheduledSession[] = [];
      
      switch (selectedFilter) {
        case 'upcoming':
          userSessions = await ScheduleService.getUpcomingSessions(user.id);
          break;
        case 'past':
          userSessions = await ScheduleService.getPastSessions(user.id);
          break;
        default:
          userSessions = await ScheduleService.getAllSessions(user.id);
      }
      
      console.log('ScheduleScreen.loadSessions - loaded sessions:', userSessions);
      setSessions(userSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  };

  const groupSessionsByDate = (sessions: ScheduledSession[]): DayGroup[] => {
    const groups: { [key: string]: ScheduledSession[] } = {};
    
    sessions.forEach(session => {
      const dateKey = session.scheduledTime.toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(session);
    });

    return Object.entries(groups)
      .map(([date, sessions]) => ({
        date,
        sessions: sessions.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime())
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString([], { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'scheduled':
        return '#6366f1';
      case 'active':
        return '#10b981';
      case 'completed':
        return '#6b7280';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'scheduled':
        return '📅';
      case 'active':
        return '🟢';
      case 'completed':
        return '✅';
      case 'cancelled':
        return '❌';
      default:
        return '📅';
    }
  };

  const handleSessionPress = (session: ScheduledSession) => {
    Alert.alert(
      'Session Details',
      `${session.partnerName || 'Practice Session'}\n${formatTime(session.scheduledTime)} - ${session.duration} minutes\n${session.location || 'Location TBD'}\n\nPatterns: ${session.plannedPatterns.join(', ') || 'None specified'}`,
      [
        { text: 'Close', style: 'cancel' },
        {
          text: 'Edit',
          onPress: () => {
            // Navigate to edit session
            navigation.navigate('SessionScheduling', {
              sessionId: session.id,
              partnerId: session.partnerId,
              partnerName: session.partnerName,
            });
          },
        },
      ]
    );
  };

  const handleNewSession = () => {
    navigation.navigate('SessionScheduling', {});
  };

  const onDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
    updateMarkedDates();
  };

  const getSessionsForSelectedDate = (): ScheduledSession[] => {
    if (!selectedDate) return [];
    
    return sessions.filter(session => {
      const sessionDate = session.scheduledTime.toISOString().split('T')[0];
      return sessionDate === selectedDate;
    });
  };

  const renderSessionItem = ({ item }: { item: ScheduledSession }) => (
    <TouchableOpacity
      style={[
        styles.sessionCard,
        { borderLeftColor: getStatusColor(item.status) }
      ]}
      onPress={() => handleSessionPress(item)}
    >
      <View style={styles.sessionHeader}>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionTitle}>
            {item.partnerName || 'Solo Practice'}
          </Text>
          <Text style={styles.sessionTime}>
            {formatTime(item.scheduledTime)} ({item.duration} min)
          </Text>
        </View>
        <View style={styles.statusContainer}>
          <Text style={styles.statusIcon}>{getStatusIcon(item.status)}</Text>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>
      
      {item.location && (
        <Text style={styles.sessionLocation}>📍 {item.location}</Text>
      )}
      
      {item.plannedPatterns.length > 0 && (
        <View style={styles.patternsContainer}>
          <Text style={styles.patternsLabel}>Patterns:</Text>
          <Text style={styles.patternsText}>
            {item.plannedPatterns.slice(0, 3).join(', ')}
            {item.plannedPatterns.length > 3 && ` +${item.plannedPatterns.length - 3} more`}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderDayGroup = ({ item }: { item: DayGroup }) => (
    <View style={styles.dayGroup}>
      <Text style={styles.dayHeader}>{formatDate(item.date)}</Text>
      {item.sessions.map(session => (
        <View key={session.id} style={styles.sessionWrapper}>
          {renderSessionItem({ item: session })}
        </View>
      ))}
    </View>
  );

  const groupedSessions = groupSessionsByDate(sessions);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Schedule</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.viewToggle, viewMode === 'calendar' && styles.viewToggleActive]}
            onPress={() => setViewMode('calendar')}
          >
            <Text style={[styles.viewToggleText, viewMode === 'calendar' && styles.viewToggleTextActive]}>
              📅
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggle, viewMode === 'list' && styles.viewToggleActive]}
            onPress={() => setViewMode('list')}
          >
            <Text style={[styles.viewToggleText, viewMode === 'list' && styles.viewToggleTextActive]}>
              📋
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.newSessionButton}
            onPress={handleNewSession}
          >
            <Text style={styles.newSessionButtonText}>+ New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'calendar' ? (
        <>
          {/* Calendar View */}
          <Calendar
            current={selectedDate}
            onDayPress={onDayPress}
            markedDates={markedDates}
            markingType="multi-dot"
            theme={{
              backgroundColor: '#ffffff',
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#6366f1',
              selectedDayBackgroundColor: '#6366f1',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#6366f1',
              dayTextColor: '#1f2937',
              textDisabledColor: '#d1d5db',
              dotColor: '#6366f1',
              selectedDotColor: '#ffffff',
              arrowColor: '#6366f1',
              monthTextColor: '#1f2937',
              indicatorColor: '#6366f1',
              textDayFontFamily: 'System',
              textMonthFontFamily: 'System',
              textDayHeaderFontFamily: 'System',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
            }}
            firstDay={1}
            enableSwipeMonths={true}
          />
          
          {/* Sessions for Selected Date */}
          <View style={styles.selectedDateSection}>
            <Text style={styles.selectedDateTitle}>
              {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long', 
                day: 'numeric'
              }) : 'Select a date'}
            </Text>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : getSessionsForSelectedDate().length > 0 ? (
              <ScrollView style={styles.selectedDateSessions} showsVerticalScrollIndicator={false}>
                {getSessionsForSelectedDate().map(session => (
                  <View key={session.id} style={styles.sessionWrapper}>
                    {renderSessionItem({ item: session })}
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.noSessionsContainer}>
                <Text style={styles.noSessionsText}>No sessions scheduled for this date</Text>
                <TouchableOpacity
                  style={styles.addSessionButton}
                  onPress={handleNewSession}
                >
                  <Text style={styles.addSessionButtonText}>+ Schedule Session</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </>
      ) : (
        <>
          {/* List View (Original) */}
          <View style={styles.filterContainer}>
            {(['upcoming', 'all', 'past'] as const).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButton,
                  selectedFilter === filter && styles.filterButtonActive
                ]}
                onPress={() => setSelectedFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    selectedFilter === filter && styles.filterButtonTextActive
                  ]}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading your schedule...</Text>
            </View>
          ) : groupedSessions.length > 0 ? (
            <FlatList
              data={groupedSessions}
              renderItem={renderDayGroup}
              keyExtractor={(item) => item.date}
              contentContainerStyle={styles.listContainer}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📅</Text>
              <Text style={styles.emptyStateTitle}>
                {selectedFilter === 'upcoming' 
                  ? 'No Upcoming Sessions' 
                  : selectedFilter === 'past'
                  ? 'No Past Sessions'
                  : 'No Sessions Scheduled'
                }
              </Text>
              <Text style={styles.emptyStateText}>
                {selectedFilter === 'upcoming' 
                  ? 'Schedule a practice session to get started!'
                  : selectedFilter === 'past'
                  ? 'Your completed sessions will appear here.'
                  : 'Start scheduling sessions with your juggling partners!'
                }
              </Text>
              <TouchableOpacity
                style={styles.emptyActionButton}
                onPress={handleNewSession}
              >
                <Text style={styles.emptyActionButtonText}>Schedule Session</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewToggle: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    marginRight: 4,
  },
  viewToggleActive: {
    backgroundColor: '#6366f1',
  },
  viewToggleText: {
    fontSize: 16,
    color: '#6b7280',
  },
  viewToggleTextActive: {
    color: '#ffffff',
  },
  newSessionButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  newSessionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedDateSection: {
    flex: 1,
    backgroundColor: '#ffffff',
    marginTop: 1,
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
  },
  selectedDateSessions: {
    flex: 1,
    padding: 16,
  },
  noSessionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noSessionsText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  addSessionButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addSessionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f3f4f6',
  },
  filterButtonActive: {
    backgroundColor: '#6366f1',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  listContainer: {
    padding: 16,
  },
  dayGroup: {
    marginBottom: 24,
  },
  dayHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  sessionWrapper: {
    marginBottom: 8,
  },
  sessionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  sessionTime: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sessionLocation: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  patternsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patternsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginRight: 8,
  },
  patternsText: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyActionButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyActionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
