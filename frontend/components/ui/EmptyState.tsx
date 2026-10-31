import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '@/constants/theme';
import { Button } from './Button';

interface Props {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'neutral' | 'error';
}

export function EmptyState({ icon = 'leaf-outline', title, message, actionLabel, onAction, tone = 'neutral' }: Props) {
  const color = tone === 'error' ? theme.colors.error : theme.colors.textMuted;
  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <Ionicons name={tone === 'error' ? 'cloud-offline-outline' : icon} size={34} color={color} />
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" compact style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.surfaceBorder,
    marginBottom: 14,
  },
  title: { color: theme.colors.text, fontSize: 15, fontWeight: '700', marginTop: 10, textAlign: 'center' },
  message: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 4, textAlign: 'center', lineHeight: 19 },
  action: { marginTop: 14 },
});
