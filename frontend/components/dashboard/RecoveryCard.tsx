import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ProgressRing } from '@/components/ProgressRing';
import { theme } from '@/constants/theme';
import { RecoveryScore } from '@/lib/types';

export function RecoveryCard({ recovery, onPress }: { recovery: RecoveryScore; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Recovery ${recovery.score}, ${recovery.status}. Log sleep.`}
    >
      <ProgressRing
        progress={recovery.score / 100}
        size={72}
        strokeWidth={7}
        color={recovery.color}
        label={`${recovery.score}`}
        sublabel="recovery"
      />
      <View style={styles.body}>
        <Text style={[styles.status, { color: recovery.color }]}>{recovery.status}</Text>
        {recovery.insights.slice(0, 2).map((insight) => (
          <Text key={insight} style={styles.insight} numberOfLines={2}>
            • {insight}
          </Text>
        ))}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    padding: 14,
    marginBottom: 14,
  },
  body: { flex: 1 },
  status: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  insight: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 17 },
});
