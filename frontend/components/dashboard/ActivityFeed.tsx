import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { EmptyState } from '@/components/ui';
import { theme } from '@/constants/theme';
import { formatActivityValue, formatTime } from '@/lib/format';
import { ActivityLogEntry } from '@/lib/types';

const META = {
  meal: { icon: 'nutrition', color: theme.colors.calories },
  workout: { icon: 'barbell', color: theme.colors.workout },
  water: { icon: 'water', color: theme.colors.water },
} as const;

interface Props {
  logs: ActivityLogEntry[];
  onDelete: (log: ActivityLogEntry) => void;
}

export function ActivityFeed({ logs, onDelete }: Props) {
  if (!logs.length) {
    return (
      <EmptyState
        icon="clipboard-outline"
        title="Nothing logged yet today"
        message="Use the quick actions above to log a meal, workout or water."
      />
    );
  }
  return (
    <View style={styles.list}>
      {logs.map((log) => {
        const meta = META[log.activity_type] ?? META.meal;
        const sub = [
          formatTime(log.timestamp),
          log.metadata?.serving_label,
          log.metadata?.protein_g ? `${log.metadata.protein_g}g protein` : null,
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <View key={log.id} style={styles.item}>
            <View style={[styles.icon, { backgroundColor: `${meta.color}20` }]}>
              <Ionicons name={meta.icon} size={20} color={meta.color} />
            </View>
            <View style={styles.info}>
              <Text style={styles.title} numberOfLines={1}>
                {log.details}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {sub}
              </Text>
            </View>
            <Text style={[styles.value, { color: meta.color }]}>
              {formatActivityValue(log.activity_type, log.value)}
            </Text>
            <TouchableOpacity onPress={() => onDelete(log)} hitSlop={10} accessibilityLabel={`Delete ${log.details}`}>
              <Ionicons name="trash-outline" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    padding: 12,
  },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: 14 },
  sub: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  value: { fontWeight: '800', fontSize: 14 },
});
