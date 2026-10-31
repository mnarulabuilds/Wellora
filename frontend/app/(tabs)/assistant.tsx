import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import { useToast } from '@/components/Toast';
import { SUGGESTED_PROMPTS, theme } from '@/constants/theme';
import { analyzeQuery } from '@/lib/api';
import { clearChatHistory, getChatHistory, getUserId, saveChatHistory } from '@/lib/storage';
import { confirmAction } from '@/lib/confirm';
import { ChatMessage } from '@/lib/types';

const welcomeMessage = (): ChatMessage => ({
  id: 'welcome-1',
  text: "Hi! I'm Wellora, your personal wellness coach. Ask me about nutrition, workouts, sleep, stress, medications or your vitals — I'll use what you've logged to personalise my answers.\n\nWhat would you like help with today?",
  sender: 'assistant',
  timestamp: new Date().toISOString(),
});

export default function AssistantScreen() {
  const { showToast } = useToast();
  const [userId, setUserId] = useState('default_user');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      const initChat = async () => {
        const id = await getUserId();
        setUserId(id);
        const history = await getChatHistory(id);
        if (history && history.length > 0) {
          setMessages(history);
        } else {
          setMessages([welcomeMessage()]);
        }
      };
      initChat();
    }, [])
  );

  const persistMessages = async (updated: ChatMessage[]) => {
    setMessages(updated);
    if (userId) {
      await saveChatHistory(userId, updated);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    const currentList = [...messages, userMessage];
    await persistMessages(currentList);
    setInput('');
    setLoading(true);

    try {
      const res = await analyzeQuery(userId, text);
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        text: res.response,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        intent: res.intent,
        suggestions: res.suggestions,
      };
      await persistMessages([...currentList, aiMessage]);
    } catch {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        text: "I'm having trouble connecting right now. Please check your connection and tap to retry.",
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        isError: true,
      };
      await persistMessages([...currentList, errorMessage]);
      showToast('Network issue. Could not reach assistant.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = (errorIndex: number) => {
    // Find the previous user query
    for (let i = errorIndex - 1; i >= 0; i--) {
      if (messages[i].sender === 'user') {
        handleSendMessage(messages[i].text);
        break;
      }
    }
  };

  const handleClearChat = async () => {
    const ok = await confirmAction({
      title: 'Clear conversation?',
      message: 'This removes your chat history with Wellora on this device.',
      confirmText: 'Clear',
      destructive: true,
    });
    if (!ok) return;
    await clearChatHistory(userId);
    setMessages([welcomeMessage()]);
    showToast('Conversation reset', 'info');
  };

  // Follow-up chips from the latest coach reply, falling back to starter prompts.
  const lastReply = [...messages].reverse().find((m) => m.sender === 'assistant' && !m.isError);
  const prompts = lastReply?.suggestions?.length ? lastReply.suggestions : SUGGESTED_PROMPTS;

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, loading]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.botAvatar}>
            <Ionicons name="sparkles" size={18} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Wellora AI</Text>
            <Text style={styles.headerSubtitle}>Personal wellness coach · knows your logs</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.clearBtn} onPress={handleClearChat} accessibilityLabel="Clear chat">
          <Ionicons name="trash-outline" size={20} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesContent} ref={scrollViewRef}>
        {messages.map((msg, index) => {
          const isUser = msg.sender === 'user';
          return (
            <View key={msg.id} style={[styles.messageRow, isUser ? styles.userMessageRow : styles.aiMessageRow]}>
              {!isUser && (
                <View style={styles.aiAvatarSmall}>
                  <Ionicons name="sparkles" size={14} color="#ffffff" />
                </View>
              )}
              <View
                style={[
                  styles.messageBubble,
                  isUser ? styles.userBubble : styles.aiBubble,
                  msg.isError && styles.errorBubble,
                ]}
              >
                {msg.intent && (
                  <View style={styles.intentBadge}>
                    <Text style={styles.intentText}>{msg.intent.replace(/_/g, ' ').toUpperCase()}</Text>
                  </View>
                )}
                <Text style={styles.messageText}>{msg.text}</Text>
                <View style={styles.timeRow}>
                  <Text style={styles.timeText}>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  {msg.isError && (
                    <TouchableOpacity onPress={() => handleRetry(index)} style={styles.retryBtn}>
                      <Ionicons name="refresh" size={13} color="#ffffff" />
                      <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        })}

        {loading && (
          <View style={[styles.messageRow, styles.aiMessageRow]}>
            <View style={styles.aiAvatarSmall}>
              <Ionicons name="sparkles" size={14} color="#ffffff" />
            </View>
            <View style={[styles.messageBubble, styles.aiBubble, styles.typingBubble]}>
              <ActivityIndicator color={theme.colors.accent} size="small" />
              <Text style={styles.typingText}>Thinking...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Suggested Prompts (when few messages or at end) */}
      <View style={styles.promptsSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promptsScroll}>
          {prompts.map((prompt, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.promptChip}
              onPress={() => handleSendMessage(prompt)}
              activeOpacity={0.75}
            >
              <Text style={styles.promptText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask about nutrition, workouts, sleep, stress..."
            placeholderTextColor={theme.colors.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => handleSendMessage()}
            onKeyPress={(e) => {
              // Web: Enter sends, Shift+Enter adds a new line (multiline inputs never fire onSubmitEditing).
              const native = e.nativeEvent as unknown as { key: string; shiftKey?: boolean };
              if (Platform.OS === 'web' && native.key === 'Enter' && !native.shiftKey) {
                (e as unknown as { preventDefault: () => void }).preventDefault();
                handleSendMessage();
              }
            }}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity
            onPress={() => handleSendMessage()}
            disabled={loading || !input.trim()}
            style={[styles.sendButtonWrap, (!input.trim() || loading) && styles.sendDisabled]}
          >
            <LinearGradient
              colors={theme.colors.violetGradient}
              style={styles.sendButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="send" size={18} color="#ffffff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorder,
    backgroundColor: theme.colors.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  botAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  clearBtn: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingVertical: 16,
    gap: 14,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  aiMessageRow: {
    justifyContent: 'flex-start',
  },
  aiAvatarSmall: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#8E2DE2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageBubble: {
    padding: 14,
    borderRadius: theme.borderRadius.lg,
    maxWidth: '82%',
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderBottomLeftRadius: 4,
  },
  errorBubble: {
    borderColor: theme.colors.error,
  },
  intentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 8,
  },
  intentText: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: '700',
  },
  messageText: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 22,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  timeText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 10,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  typingText: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  promptsSection: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceBorder,
    backgroundColor: theme.colors.backgroundElevated,
  },
  promptsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  promptChip: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  promptText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceBorder,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background,
    color: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  sendButtonWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
