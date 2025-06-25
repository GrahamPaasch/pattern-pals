import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../hooks/useAuth';
import { ScheduleService } from '../services/schedule';
import DateTimePicker from '@react-native-community/datetimepicker';

type SessionSchedulingNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SessionScheduling'
>;

interface Props {
  navigation: SessionSchedulingNavigationProp;
  route: {
    params?: {
      partnerId?: string;
      partnerName?: string;
    };
  };
}

export default function SessionSchedulingScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const [sessionDate, setSessionDate] = useState(new Date());
  const [sessionTime, setSessionTime] = useState(new Date());
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [patterns, setPatterns] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const { partnerId, partnerName } = route.params || {};

  const handleScheduleSession = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to schedule sessions');
      return;
    }

    if (!location.trim()) {
      Alert.alert('Error', 'Please enter a location for the session');
      return;
    }

    setLoading(true);
    try {
      // Combine date and time
      const scheduledDateTime = new Date(
        sessionDate.getFullYear(),
        sessionDate.getMonth(),
        sessionDate.getDate(),
        sessionTime.getHours(),
        sessionTime.getMinutes()
      );

      // Parse patterns
      const patternList = patterns.split(',').map(p => p.trim()).filter(p => p.length > 0);

      // Create session object
      const sessionData = {
        hostId: user.id,
        partnerId: partnerId || undefined,
        partnerName: partnerName || undefined,
        scheduledTime: scheduledDateTime,
        duration: 90, // Default 90 minutes
        location: location.trim(),
        plannedPatterns: patternList,
        status: 'scheduled' as const,
        notes: notes.trim() || undefined,
      };

      // Save to schedule service
      const success = await ScheduleService.addSession(user.id, sessionData);

      if (success) {
        Alert.alert(
          'Session Scheduled!',
          `Your practice session${partnerName ? ` with ${partnerName}` : ''} has been scheduled for ${sessionDate.toLocaleDateString()} at ${sessionTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
          [
            { 
              text: 'OK', 
              onPress: () => navigation.goBack() 
            }
          ]
        );
      } else {
        throw new Error('Failed to save session');
      }
    } catch (error) {
      console.error('Error scheduling session:', error);
      Alert.alert('Error', 'Failed to schedule session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSessionDate(selectedDate);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setSessionTime(selectedTime);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Schedule Practice Session</Text>
          {partnerName && (
            <Text style={styles.subtitle}>With {partnerName}</Text>
          )}
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateTimeText}>
                {sessionDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Time</Text>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.dateTimeText}>
                {sessionTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Location *</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Enter practice location"
              multiline
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Patterns to Practice</Text>
            <TextInput
              style={styles.input}
              value={patterns}
              onChangeText={setPatterns}
              placeholder="e.g., 6 Count, Walking Pass, 645"
              multiline
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional notes or requirements"
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.scheduleButton, loading && styles.buttonDisabled]}
            onPress={handleScheduleSession}
            disabled={loading}
          >
            <Text style={styles.scheduleButtonText}>
              {loading ? 'Scheduling...' : 'Schedule Session'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={sessionDate}
          mode="date"
          display="default"
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={sessionTime}
          mode="time"
          display="default"
          onChange={onTimeChange}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateTimeButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  dateTimeText: {
    fontSize: 16,
    color: '#374151',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  scheduleButton: {
    backgroundColor: '#6366f1',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  scheduleButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
