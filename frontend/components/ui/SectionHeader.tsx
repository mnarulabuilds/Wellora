import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '@/constants/theme';

interface Props {
  title: string;
  meta?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, meta, actionLabel, onAction }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} hitSlop={10} accessibilityRole="button">
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : meta ? (
        <Text style={styles.meta}>{meta}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
  meta: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' },
  action: { color: theme.colors.accent, fontSize: 13, fontWeight: '700' },
});
