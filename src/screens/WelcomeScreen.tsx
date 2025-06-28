import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import type { PropType, ExperienceLevel } from '../types';

interface Props {
  navigation: any;
}

const experienceLevels: ExperienceLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
const propTypes: PropType[] = ['clubs', 'balls', 'rings'];

export default function OnboardingScreen({ navigation }: Props) {
  const { createUser } = useAuth();
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
      Alert.alert('Name Required', 'Please enter your name to get started');
      return;
    }

    if (selectedProps.length === 0) {
      Alert.alert('Props Required', 'Please select at least one prop type you practice with');
      return;
    }

    setLoading(true);
    try {
      await createUser({
        name: name.trim(),
        experience,
        preferredProps: selectedProps,
      });
      
      // Navigation will be handled automatically by auth state change
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to PatternPals! 🤹‍♂️</Text>
          <Text style={styles.subtitle}>
            Let's set up your juggling profile. We only need the basics to get you started!
          </Text>
        </View>

        <View style={styles.form}>
          {/* Name Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>What should we call you?</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name or nickname"
              autoCapitalize="words"
              autoFocus
            />
            <Text style={styles.helperText}>
              This is how other jugglers will see you in the app
            </Text>
          </View>

          {/* Experience Level */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>What's your juggling experience?</Text>
            <View style={styles.optionsGrid}>
              {experienceLevels.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.optionButton,
                    experience === level && styles.selectedOption,
                  ]}
                  onPress={() => setExperience(level)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      experience === level && styles.selectedOptionText,
                    ]}
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Preferred Props */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>What do you like to juggle with?</Text>
            <Text style={styles.helperText}>
              Select all that you practice with or want to learn
            </Text>
            <View style={styles.optionsGrid}>
              {propTypes.map((prop) => (
                <TouchableOpacity
                  key={prop}
                  style={[
                    styles.optionButton,
                    selectedProps.includes(prop) && styles.selectedOption,
                  ]}
                  onPress={() => toggleProp(prop)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedProps.includes(prop) && styles.selectedOptionText,
                    ]}
                  >
                    {prop.charAt(0).toUpperCase() + prop.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Create Profile Button */}
          <TouchableOpacity
            style={[styles.createButton, loading && styles.buttonDisabled]}
            onPress={handleCreateProfile}
            disabled={loading}
          >
            <Text style={styles.createButtonText}>
              {loading ? 'Setting up your profile...' : 'Start Juggling Together! 🎪'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🔒 No email or password required! We keep things simple and focused on juggling.
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
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 32,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  helperText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    lineHeight: 20,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    fontWeight: '500',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    minWidth: 100,
    alignItems: 'center',
  },
  selectedOption: {
    borderColor: '#6366f1',
    backgroundColor: '#6366f1',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  selectedOptionText: {
    color: '#ffffff',
  },
  createButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
