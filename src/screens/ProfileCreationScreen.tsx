import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../hooks/useAuth';
import { ExperienceLevel, PropType, TimeBlock, WeekDay } from '../types';

type ProfileCreationScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ProfileCreation'
>;

type ProfileCreationScreenRouteProp = RouteProp<RootStackParamList, 'ProfileCreation'>;

interface Props {
  navigation: ProfileCreationScreenNavigationProp;
  route: ProfileCreationScreenRouteProp;
}

const EXPERIENCE_LEVELS: ExperienceLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
const PROP_TYPES: PropType[] = ['clubs', 'balls', 'rings'];
const WEEK_DAYS: WeekDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function ProfileCreationScreen({ navigation, route }: Props) {
  const { email, password } = route.params;
  const { signUp } = useAuth();
  
  const [name, setName] = useState('');
  const [experience, setExperience] = useState<ExperienceLevel>('Beginner');
  const [selectedProps, setSelectedProps] = useState<PropType[]>(['clubs']);
  const [loading, setLoading] = useState(false);

  const toggleProp = (prop: PropType) => {
    setSelectedProps(prev => 
      prev.includes(prop) 
        ? prev.filter(p => p !== prop)
        : [...prev, prop]
    );
  };

  const handleCreateProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (selectedProps.length === 0) {
      Alert.alert('Error', 'Please select at least one prop type');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, {
        name: name.trim(),
        experience,
        preferredProps: selectedProps,
        availability: [], // Will be set up later
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Your Profile</Text>
          <Text style={styles.subtitle}>Tell us about your juggling experience</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Experience Level</Text>
            <View style={styles.optionsContainer}>
              {EXPERIENCE_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.option,
                    experience === level && styles.optionSelected,
                  ]}
                  onPress={() => setExperience(level)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      experience === level && styles.optionTextSelected,
                    ]}
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Preferred Props</Text>
            <Text style={styles.helperText}>Select all that apply</Text>
            <View style={styles.optionsContainer}>
              {PROP_TYPES.map((prop) => (
                <TouchableOpacity
                  key={prop}
                  style={[
                    styles.option,
                    selectedProps.includes(prop) && styles.optionSelected,
                  ]}
                  onPress={() => toggleProp(prop)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedProps.includes(prop) && styles.optionTextSelected,
                    ]}
                  >
                    {prop.charAt(0).toUpperCase() + prop.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCreateProfile}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating Profile...' : 'Create Profile'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            You can always update your preferences later in your profile settings.
          </Text>
        </View>
      </ScrollView>
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
    marginTop: 20,
    marginBottom: 40,
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
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
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
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  optionSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  optionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#ffffff',
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
