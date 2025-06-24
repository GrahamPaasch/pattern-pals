import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../hooks/useAuth';
import { TimeBlock, WeekDay } from '../types';
import DateTimePicker from '@react-native-community/datetimepicker';

type AvailabilityScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AvailabilityManagement'
>;

interface Props {
  navigation: AvailabilityScreenNavigationProp;
}

const WEEK_DAYS: { key: WeekDay; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export default function AvailabilityManagementScreen({ navigation }: Props) {
  const { userProfile, updateProfile } = useAuth();
  const [availability, setAvailability] = useState<TimeBlock[]>(userProfile?.availability || []);
  const [showModal, setShowModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<WeekDay>('monday');
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userProfile?.availability) {
      setAvailability(userProfile.availability);
    }
  }, [userProfile]);

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const addTimeSlot = () => {
    const startTimeStr = formatTime(startTime);
    const endTimeStr = formatTime(endTime);

    if (startTime >= endTime) {
      Alert.alert('Error', 'Start time must be before end time');
      return;
    }

    const newSlot: TimeBlock = {
      day: selectedDay,
      startTime: startTimeStr,
      endTime: endTimeStr,
    };

    // Check for overlapping time slots on the same day
    const overlapping = availability.some(slot => 
      slot.day === selectedDay &&
      ((startTimeStr >= slot.startTime && startTimeStr < slot.endTime) ||
       (endTimeStr > slot.startTime && endTimeStr <= slot.endTime) ||
       (startTimeStr <= slot.startTime && endTimeStr >= slot.endTime))
    );

    if (overlapping) {
      Alert.alert('Error', 'This time slot overlaps with an existing one');
      return;
    }

    setAvailability(prev => [...prev, newSlot]);
    setShowModal(false);
  };

  const removeTimeSlot = (index: number) => {
    Alert.alert(
      'Remove Time Slot',
      'Are you sure you want to remove this availability slot?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setAvailability(prev => prev.filter((_, i) => i !== index));
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateProfile({ availability });
      Alert.alert('Success', 'Availability updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update availability');
    } finally {
      setLoading(false);
    }
  };

  const onStartTimeChange = (event: any, selectedTime?: Date) => {
    setShowStartTimePicker(false);
    if (selectedTime) {
      setStartTime(selectedTime);
    }
  };

  const onEndTimeChange = (event: any, selectedTime?: Date) => {
    setShowEndTimePicker(false);
    if (selectedTime) {
      setEndTime(selectedTime);
    }
  };

  const getAvailabilityForDay = (day: WeekDay) => {
    return availability.filter(slot => slot.day === day);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Manage Availability</Text>
          <Text style={styles.subtitle}>
            Set your weekly juggling availability to find practice partners
          </Text>
        </View>

        <View style={styles.weekContainer}>
          {WEEK_DAYS.map(({ key, label }) => (
            <View key={key} style={styles.daySection}>
              <Text style={styles.dayLabel}>{label}</Text>
              <View style={styles.timeSlotsContainer}>
                {getAvailabilityForDay(key).length > 0 ? (
                  getAvailabilityForDay(key).map((slot, index) => {
                    const globalIndex = availability.findIndex(
                      s => s.day === slot.day && s.startTime === slot.startTime && s.endTime === slot.endTime
                    );
                    return (
                      <TouchableOpacity
                        key={`${slot.startTime}-${slot.endTime}`}
                        style={styles.timeSlot}
                        onPress={() => removeTimeSlot(globalIndex)}
                      >
                        <Text style={styles.timeSlotText}>
                          {slot.startTime} - {slot.endTime}
                        </Text>
                        <Text style={styles.removeText}>×</Text>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={styles.noTimeSlots}>No availability set</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add Time Slot</Text>
        </TouchableOpacity>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.saveButton, loading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add Time Slot Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Time Slot</Text>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Day</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.daySelector}>
                  {WEEK_DAYS.map(({ key, label }) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.dayOption,
                        selectedDay === key && styles.dayOptionSelected,
                      ]}
                      onPress={() => setSelectedDay(key)}
                    >
                      <Text
                        style={[
                          styles.dayOptionText,
                          selectedDay === key && styles.dayOptionTextSelected,
                        ]}
                      >
                        {label.substring(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Start Time</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowStartTimePicker(true)}
              >
                <Text style={styles.timeButtonText}>{formatTime(startTime)}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>End Time</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowEndTimePicker(true)}
              >
                <Text style={styles.timeButtonText}>{formatTime(endTime)}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalAddButton]}
                onPress={addTimeSlot}
              >
                <Text style={styles.modalAddButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Time Pickers */}
      {showStartTimePicker && (
        <DateTimePicker
          value={startTime}
          mode="time"
          is24Hour={false}
          onChange={onStartTimeChange}
        />
      )}

      {showEndTimePicker && (
        <DateTimePicker
          value={endTime}
          mode="time"
          is24Hour={false}
          onChange={onEndTimeChange}
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
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  weekContainer: {
    marginBottom: 32,
  },
  daySection: {
    marginBottom: 24,
  },
  dayLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  timeSlotsContainer: {
    gap: 8,
  },
  timeSlot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  timeSlotText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  removeText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  noTimeSlots: {
    color: '#9ca3af',
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  addButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#6366f1',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  addButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
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
  saveButton: {
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
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  daySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  dayOption: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  dayOptionSelected: {
    backgroundColor: '#6366f1',
  },
  dayOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  dayOptionTextSelected: {
    color: '#ffffff',
  },
  timeButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeButtonText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#f3f4f6',
  },
  modalAddButton: {
    backgroundColor: '#6366f1',
  },
  modalCancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  modalAddButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
