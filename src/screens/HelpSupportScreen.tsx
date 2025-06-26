import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type HelpScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'HelpSupport'
>;

interface Props {
  navigation: HelpScreenNavigationProp;
}

const FAQ_DATA = [
  {
    id: '1',
    question: 'How does the matching algorithm work?',
    answer: 'Our algorithm matches users based on skill level, location, availability, and pattern preferences. We consider factors like compatible experience levels and mutual learning opportunities.',
  },
  {
    id: '2',
    question: 'How do I update my availability?',
    answer: 'Go to your Profile → Manage Availability. You can set specific days and times when you\'re available for juggling sessions.',
  },
  {
    id: '3',
    question: 'Can I practice with multiple partners?',
    answer: 'Absolutely! PatternPals encourages practicing with different partners to improve your skills and learn diverse techniques.',
  },
  {
    id: '4',
    question: 'How do I report inappropriate behavior?',
    answer: 'If you encounter any inappropriate behavior, please report it immediately through the app or contact our support team. We take safety seriously.',
  },
  {
    id: '5',
    question: 'How do I add new patterns to the library?',
    answer: 'You can contribute new patterns through the Patterns screen. All submissions are reviewed by our community for accuracy.',
  },
];

export default function HelpSupportScreen({ navigation }: Props) {
  const [expandedFAQ, setExpandedFAQ] = React.useState<string | null>(null);

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Choose how you\'d like to contact our support team:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Email',
          onPress: () => Linking.openURL('mailto:support@patternpals.com'),
        },
        {
          text: 'In-App Chat',
          onPress: () => navigation.navigate('SupportChat'),
        },
      ]
    );
  };

  const handleFeedback = () => {
    Alert.alert(
      'Send Feedback',
      'We\'d love to hear your thoughts! How would you like to share feedback?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rate on App Store',
          onPress: () => Linking.openURL('https://example.com/app-store-patternpals'),
        },
        {
          text: 'Send Email',
          onPress: () => Linking.openURL('mailto:feedback@patternpals.com'),
        },
      ]
    );
  };

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Help & Support</Text>
          <Text style={styles.subtitle}>
            Get help and find answers to common questions
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity style={styles.actionCard} onPress={handleContactSupport}>
            <Text style={styles.actionIcon}>💬</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Contact Support</Text>
              <Text style={styles.actionSubtitle}>Get help from our team</Text>
            </View>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleFeedback}>
            <Text style={styles.actionIcon}>📝</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Send Feedback</Text>
              <Text style={styles.actionSubtitle}>Help us improve the app</Text>
            </View>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => Linking.openURL('https://patternpals.com/community')}
          >
            <Text style={styles.actionIcon}>👥</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Community Forum</Text>
              <Text style={styles.actionSubtitle}>Connect with other jugglers</Text>
            </View>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          
          {FAQ_DATA.map((faq) => (
            <TouchableOpacity
              key={faq.id}
              style={styles.faqItem}
              onPress={() => toggleFAQ(faq.id)}
            >
              <View style={styles.faqQuestion}>
                <Text style={styles.faqQuestionText}>{faq.question}</Text>
                <Text style={styles.faqToggle}>
                  {expandedFAQ === faq.id ? '−' : '+'}
                </Text>
              </View>
              {expandedFAQ === faq.id && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resources</Text>
          
          <TouchableOpacity 
            style={styles.resourceItem}
            onPress={() => Linking.openURL('https://patternpals.com/getting-started')}
          >
            <Text style={styles.resourceTitle}>Getting Started Guide</Text>
            <Text style={styles.resourceChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.resourceItem}
            onPress={() => Linking.openURL('https://patternpals.com/safety')}
          >
            <Text style={styles.resourceTitle}>Safety Guidelines</Text>
            <Text style={styles.resourceChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.resourceItem}
            onPress={() => Linking.openURL('https://patternpals.com/patterns')}
          >
            <Text style={styles.resourceTitle}>Pattern Library Help</Text>
            <Text style={styles.resourceChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.resourceItem}
            onPress={() => Linking.openURL('https://patternpals.com/privacy')}
          >
            <Text style={styles.resourceTitle}>Privacy Policy</Text>
            <Text style={styles.resourceChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.resourceItem}
            onPress={() => Linking.openURL('https://patternpals.com/terms')}
          >
            <Text style={styles.resourceTitle}>Terms of Service</Text>
            <Text style={styles.resourceChevron}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            PatternPals v1.0.0{'\n'}
            Need more help? Email us at support@patternpals.com
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
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 16,
    width: 32,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  actionChevron: {
    fontSize: 20,
    color: '#9ca3af',
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  faqQuestionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    flex: 1,
  },
  faqToggle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6366f1',
    marginLeft: 16,
  },
  faqAnswer: {
    padding: 16,
    paddingTop: 0,
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  resourceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  resourceTitle: {
    fontSize: 16,
    color: '#374151',
  },
  resourceChevron: {
    fontSize: 20,
    color: '#9ca3af',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
