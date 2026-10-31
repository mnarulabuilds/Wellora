import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { theme } from '@/constants/theme';
import { formatDelta } from '@/lib/format';
import { WeeklyReport, WeeklyWindow } from '@/lib/types';

type MetricKey = keyof WeeklyWindow;

const METRICS: { key: MetricKey; label: string; unit: string; higherIsBetter: boolean | null; digits?: number }[] = [
  { key: 'total_workout_minutes', label: 'Active minutes', unit: 'min', higherIsBetter: true, digits: 0 },
  { key: 'active_days', label: 'Days logged', unit: '/7', higherIsBetter: true, digits: 0 },
  { key: 'avg_sleep_hours', label: 'Avg sleep', unit: 'h', higherIsBetter: true },
  { key: 'avg_water_liters', label: 'Avg water', unit: 'L', higherIsBetter: true },
  { key: 'avg_calories', label: 'Avg calories', unit: 'kcal', higherIsBetter: null, digits: 0 },
  { key: 'habit_completion_rate', label: 'Habits', unit: '%', higherIsBetter: true, digits: 0 },
  { key: 'medication_adherence', label: 'Med adherence', unit: '%', higherIsBetter: true, digits: 0 },
  { key: 'weight_change', label: 'Weight change', unit: 'kg', higherIsBetter: null },
];

function deltaColor(delta: number | null | undefined, higherIsBetter: boolean | null) {
  if (!delta || higherIsBetter === null) return theme.colors.textMuted;
  return delta > 0 === higherIsBetter ? theme.colors.success : theme.colors.error;
}

export function WeeklyReportCard({ report }: { report: WeeklyReport }) {
  const shown = METRICS.filter((m) => report.current[m.key] !== null || report.previous[m.key] !== null);
  return (
    <Card>
      <Text style={styles.title}>Your week in review</Text>
      <Text style={styles.range}>
        {report.current.start} → {report.current.end} · compared with the previous 7 days
      </Text>
      <View style={styles.grid}>
        {shown.map((m) => {
          const value = report.current[m.key] as number | null;
          const delta = report.changes[m.key] ?? null;
          return (
            <View key={m.key} style={styles.cell} accessibilityLabel={`${m.label}: ${value ?? 'no data'} ${m.unit}`}>
              <Text style={styles.cellLabel}>{m.label}</Text>
              <Text style={styles.cellValue}>
                {value === null ? '—' : m.key === 'weight_change' ? formatDelta(value) : +value.toFixed(m.digits ?? 1)}
                <Text style={styles.unit}> {m.unit}</Text>
              </Text>
              {m.key !== 'weight_change' && (
                <Text style={[styles.delta, { color: deltaColor(delta, m.higherIsBetter) }]}>
                  {formatDelta(delta, m.digits ?? 1)} vs last wk
                </Text>
              )}
            </View>
          );
        })}
      </View>
      {report.highlights.map((h) => (
        <Text key={h} style={styles.highlight}>
          {h}
        </Text>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { color: theme.colors.text, fontSize: 17, fontWeight: '800' },
  range: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  cell: { width: '48%', flexGrow: 1, backgroundColor: theme.colors.surfaceSubtle, borderRadius: 12, padding: 10 },
  cellLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  cellValue: { color: theme.colors.text, fontSize: 18, fontWeight: '800', marginTop: 2 },
  unit: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '600' },
  delta: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  highlight: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 4 },
});
