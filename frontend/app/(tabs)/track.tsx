import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Screen, SectionHeader } from '@/components/ui';
import { TRACKERS, theme } from '@/constants/theme';
import { useFocusData } from '@/hooks/useFocusData';
import { fetchDashboard, fetchLatestVitals, fetchWeightHistory } from '@/lib/api';

async function loadOverview(userId: string) {
  const [dashboard, vitals, weights] = await Promise.allSettled([
    fetchDashboard(userId),
    fetchLatestVitals(userId),
    fetchWeightHistory(userId, 1),
  ]);
  return {
    dashboard: dashboard.status === 'fulfilled' ? dashboard.value : null,
    vitals: vitals.status === 'fulfilled' ? vitals.value : [],
    weight: weights.status === 'fulfilled' ? weights.value[0] : undefined,
  };
}

export default function TrackHub() {
  const router = useRouter();
  const { data, refreshing, refresh } = useFocusData(loadOverview);
  const d = data?.dashboard;

  const status: Record<string, string> = {
    '/tracker/nutrition': d ? `${Math.round(d.daily.calories_logged)} kcal today` : '—',
    '/tracker/medications': d?.medications.total
      ? `${d.medications.taken}/${d.medications.total} doses today`
      : 'Add your medicines',
    '/tracker/vitals': data?.vitals.length
      ? data.vitals
          .slice(0, 2)
          .map((v) => `${v.display_value} ${v.unit}`)
          .join(' · ')
      : 'No readings yet',
    '/tracker/sleep': d?.recovery.metrics.sleep_hours
      ? `${d.recovery.metrics.sleep_hours}h last night`
      : 'Log last night',
    '/tracker/weight': data?.weight ? `${data.weight.weight} kg` : 'Add a weigh-in',
    '/tracker/habits': d ? `${d.habits.completed_habits}/${d.habits.total_habits} done` : '—',
  };

  return (
    <Screen title="Track" subtitle="Everything you log, in one place" refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.grid}>
        {TRACKERS.map((t) => (
          <TouchableOpacity
            key={t.route}
            style={styles.tile}
            onPress={() => router.push(t.route)}
            accessibilityRole="button"
            accessibilityLabel={`${t.title}: ${status[t.route]}`}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${t.color}22` }]}>
              <Ionicons name={t.icon} size={24} color={t.color} />
            </View>
            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.subtitle}>{t.subtitle}</Text>
            <Text style={[styles.status, { color: t.color }]} numberOfLines={1}>
              {status[t.route]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionHeader title="Your data" />
      <TouchableOpacity style={styles.row} onPress={() => router.push('/settings')}>
        <Ionicons name="download-outline" size={20} color={theme.colors.accent} />
        <Text style={styles.rowText}>Export all data (CSV / JSON)</Text>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  tile: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    padding: 16,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { color: theme.colors.text, fontSize: 16, fontWeight: '800' },
  subtitle: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  status: { fontSize: 13, fontWeight: '700', marginTop: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    padding: 14,
  },
  rowText: { color: theme.colors.text, fontWeight: '600', flex: 1 },
});
