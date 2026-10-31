import React, { useState } from 'react';
import { LayoutAnimation, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '@/constants/theme';
import { HealthScore } from '@/lib/types';

const BREAKDOWN = [
  { key: 'profile', label: 'Profile completeness', max: 20 },
  { key: 'bmi', label: 'BMI balance', max: 30 },
  { key: 'activity', label: 'Activity logging', max: 30 },
  { key: 'consistency', label: 'Daily consistency', max: 20 },
] as const;

export function HealthScoreCard({ score }: { score: HealthScore }) {
  const [open, setOpen] = useState(false);
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };
  const streak = score.streak?.current_streak ?? 0;

  return (
    <View>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={`Health score ${score.score} out of 100, ${score.label}. Tap for breakdown.`}
        accessibilityState={{ expanded: open }}
      >
        <LinearGradient
          colors={[score.color || theme.colors.primary, '#1d1145']}
          style={styles.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.info}>
            <View style={styles.headerRow}>
              <Text style={styles.label}>Health Score</Text>
              {streak > 0 && (
                <View style={styles.streak}>
                  <Ionicons name="flame" size={14} color="#FFA114" />
                  <Text style={styles.streakText}>{streak}-day streak</Text>
                </View>
              )}
            </View>
            <Text style={styles.value}>
              {score.score}
              <Text style={styles.outOf}> / 100</Text>
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{score.label}</Text>
            </View>
          </View>
          <Ionicons name={open ? 'chevron-up-circle' : 'heart-circle'} size={44} color="#ffffff" />
        </LinearGradient>
      </TouchableOpacity>

      {open && score.breakdown && (
        <View style={styles.breakdown}>
          {BREAKDOWN.map((row) => {
            const value = score.breakdown![row.key];
            return (
              <View key={row.key} style={styles.row}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <View style={styles.bar}>
                  <View style={[styles.barFill, { width: `${(value / row.max) * 100}%` }]} />
                </View>
                <Text style={styles.rowValue}>
                  {value}/{row.max}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {score.feedback.slice(0, open ? 4 : 2).map((tip) => (
        <View key={tip} style={styles.tip}>
          <Ionicons name="sparkles" size={14} color={theme.colors.accent} />
          <Text style={styles.tipText}>{tip}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.borderRadius.xl,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  info: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  label: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  streakText: { color: '#FFA114', fontSize: 12, fontWeight: '700' },
  value: { color: '#fff', fontSize: 48, fontWeight: '900' },
  outOf: { fontSize: 18, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 4,
  },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  breakdown: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  rowLabel: { color: theme.colors.textSecondary, fontSize: 13, width: 140 },
  bar: { flex: 1, height: 6, backgroundColor: theme.colors.surfaceSubtle, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: theme.colors.accent },
  rowValue: { color: theme.colors.text, fontWeight: '700', fontSize: 12, width: 44, textAlign: 'right' },
  tip: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 8, paddingHorizontal: 4 },
  tipText: { color: theme.colors.textSecondary, fontSize: 13, flex: 1, lineHeight: 18 },
});
