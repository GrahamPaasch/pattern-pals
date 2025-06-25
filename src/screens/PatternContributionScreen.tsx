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

type PatternContributionNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'PatternContribution'
>;

interface Props {
  navigation: PatternContributionNavigationProp;
}

const DIFFICULTY_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const PROP_TYPES = ['clubs', 'balls', 'scarves', 'rings'];

export default function PatternContributionScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('Beginner');
  const [requiredJugglers, setRequiredJugglers] = useState('2');
  const [selectedProps, setSelectedProps] = useState<string[]>(['clubs']);
  const [notation, setNotation] = useState('');
  const [tips, setTips] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleProp = (prop: string) => {
    setSelectedProps(prev => 
      prev.includes(prop)
        ? prev.filter(p => p !== prop)
        : [...prev, prop]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in the pattern name and description');
      return;
    }

    if (selectedProps.length === 0) {
      Alert.alert('Error', 'Please select at least one prop type');
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement pattern submission to backend
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      Alert.alert(
        'Pattern Submitted!',
        'Thank you for contributing to the pattern library. Your pattern will be reviewed by our community moderators and added to the library once approved.',
        [
          { 
            text: 'Great!', 
            onPress: () => navigation.goBack() 
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit pattern. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Contribute a Pattern</Text>
          <Text style={styles.subtitle}>
            Share your knowledge with the juggling community
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Pattern Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Triple Threat, Flying Clubs"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the pattern, how it works, and what makes it special..."
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Difficulty Level</Text>
            <View style={styles.optionsContainer}>
              {DIFFICULTY_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.option,
                    difficulty === level && styles.optionSelected,
                  ]}
                  onPress={() => setDifficulty(level)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      difficulty === level && styles.optionTextSelected,
                    ]}
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Required Jugglers</Text>
            <TextInput
              style={styles.input}
              value={requiredJugglers}
              onChangeText={setRequiredJugglers}
              placeholder="2"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Props Used *</Text>
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

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Notation (Optional)</Text>
            <TextInput
              style={styles.input}
              value={notation}
              onChangeText={setNotation}
              placeholder="Siteswap or other notation"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Tips & Tricks (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={tips}
              onChangeText={setTips}
              placeholder="Share helpful tips for learning this pattern..."
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📝 Review Process</Text>
          <Text style={styles.infoText}>
            Your contributed pattern will be reviewed by community moderators to ensure accuracy and quality. 
            This usually takes 1-3 days. Once approved, it will be available to all users with attribution to you.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.submitButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Submitting...' : 'Submit Pattern'}
            </Text>
          </TouchableOpacity>
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
    marginBottom: 24,
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  optionSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  optionText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#ffffff',
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderColor: '#dbeafe',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
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
  submitButton: {
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
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
