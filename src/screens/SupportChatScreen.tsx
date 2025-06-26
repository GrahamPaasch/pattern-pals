import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'support';
}

type ChatNavProp = NativeStackNavigationProp<RootStackParamList, 'SupportChat'>;

export default function SupportChatScreen({ navigation }: { navigation: ChatNavProp }) {
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    text: 'Hi! How can we help you today?',
    sender: 'support'
  }]);
  const [input, setInput] = useState('');

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg: Message = { id: Date.now().toString(), text: input.trim(), sender: 'user' };
    setMessages(prev => [...prev, newMsg, {
      id: `${newMsg.id}_reply`,
      text: 'Thanks for reaching out! Our team will get back to you shortly.',
      sender: 'support'
    }]);
    setInput('');
  };

  const renderItem = ({ item }: { item: Message }) => (
    <View style={[styles.message, item.sender === 'user' ? styles.userMsg : styles.supportMsg]}>
      <Text style={styles.msgText}>{item.text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type your message"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: 16 },
  message: { padding: 12, borderRadius: 8, marginBottom: 8, maxWidth: '80%' },
  userMsg: { backgroundColor: '#6366f1', alignSelf: 'flex-end' },
  supportMsg: { backgroundColor: '#e5e7eb', alignSelf: 'flex-start' },
  msgText: { color: '#000' },
  inputRow: { flexDirection: 'row', padding: 8, borderTopWidth: 1, borderColor: '#e5e7eb' },
  input: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, backgroundColor: '#fff' },
  sendBtn: { marginLeft: 8, backgroundColor: '#6366f1', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '600' }
});
