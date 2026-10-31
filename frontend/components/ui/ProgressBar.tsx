import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import { clamp } from '@/lib/format';

interface Props {
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
}

export function ProgressBar({ label, value, target, unit, color }: Props) {
  const ratio = target > 0 ? value / target : 0;
  const over = ratio > 1.05;
  return (
    <View style={styles.wrap} accessibilityLabel={`${label}: ${Math.round(value)} of ${Math.round(target)} ${unit}`}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, over && { color: theme.colors.warning }]}>
          {Math.round(value)} / {Math.round(target)} {unit}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamp(ratio) * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { color: theme.colors.text, fontSize: 13, fontWeight: '700' },
  value: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
  track: { height: 8, borderRadius: 4, backgroundColor: theme.colors.surfaceSubtle, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});
