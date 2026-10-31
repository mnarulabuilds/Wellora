import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { STATUS_COLORS, theme } from '@/constants/theme';

export function StatusPill({ status, label }: { status: string; label?: string }) {
  const color = STATUS_COLORS[status] ?? theme.colors.textMuted;
  return (
    <View style={[styles.pill, { backgroundColor: `${color}22`, borderColor: `${color}55` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{label ?? status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  text: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
});
