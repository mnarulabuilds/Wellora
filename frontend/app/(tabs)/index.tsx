import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { GoalRings, Goals } from '@/components/dashboard/GoalRings';
import { HabitsChecklist } from '@/components/dashboard/HabitsChecklist';
import { HealthScoreCard } from '@/components/dashboard/HealthScoreCard';
import { LogActivitySheet } from '@/components/dashboard/LogActivitySheet';
import { MedsDueCard } from '@/components/dashboard/MedsDueCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecoveryCard } from '@/components/dashboard/RecoveryCard';
import { WeeklyChart } from '@/components/dashboard/WeeklyChart';
import { ChartSkeleton, GoalsSkeleton, ScoreCardSkeleton } from '@/components/SkeletonLoader';
import { useToast } from '@/components/Toast';
import { EmptyState, Screen, SectionHeader } from '@/components/ui';
import { getTimeGreeting, theme } from '@/constants/theme';
import {
  deleteActivityLog,
  drainOfflineQueue,
  fetchDashboard,
  isNetworkError,
  logActivity,
  parseApiError,
  toggleDose,
  toggleHabit,
} from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { formatActivityValue } from '@/lib/format';
import { getOfflineQueue, getUserId, loadProfile } from '@/lib/storage';
import { ActivityLogEntry, ActivityType, Dashboard, Habit, ScheduledDose } from '@/lib/types';

export default function HomeScreen() {
  const router = useRouter();
  const { showToast } = useToast();

  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [goals, setGoals] = useState<Goals>({ calories: 2000, water: 2.5, workoutMinutes: 30 });
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);
  const [sheetType, setSheetType] = useState<ActivityType | null>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' | 'silent' = 'initial') => {
      if (mode === 'refresh') setRefreshing(true);
      try {
        const id = await getUserId();
        setUserId(id);
        const profile = await loadProfile();
        setName(profile.name || 'there');
        setGoals({
          calories: parseFloat(profile.targetCalories) || 2000,
          water: parseFloat(profile.targetWater) || 2.5,
          workoutMinutes: parseInt(profile.targetWorkoutMinutes, 10) || 30,
        });

        const synced = await drainOfflineQueue();
        if (synced > 0) showToast(`Synced ${synced} offline item(s)`, 'success');
        setPendingSync((await getOfflineQueue()).length);

        setData(await fetchDashboard(id));
        setError(null);
      } catch (err) {
        setError(parseApiError(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showToast]
  );

  useFocusEffect(
    useCallback(() => {
      load('initial');
    }, [load])
  );

  const submitActivity = async (type: ActivityType, details: string, value: number) => {
    if (!userId) return;
    try {
      const res = await logActivity(userId, type, details, value);
      showToast(res.message, 'success');
      setSheetType(null);
    } catch (err) {
      if (isNetworkError(err)) {
        showToast("You're offline — saved and will sync automatically.", 'info');
        setSheetType(null);
      } else {
        showToast(parseApiError(err), 'error');
        return;
      }
    }
    load('silent');
  };

  const addWater = (liters: number) => {
    // Optimistic: bump the ring immediately, then reconcile with the server.
    setData((d) => (d ? { ...d, daily: { ...d.daily, water_liters: d.daily.water_liters + liters } } : d));
    submitActivity('water', 'Glass of water', liters);
  };

  const onToggleHabit = async (habit: Habit) => {
    if (!userId || !data) return;
    const flip = (h: Habit) => (h.id === habit.id ? { ...h, completed: !h.completed } : h);
    setData({ ...data, habits: { ...data.habits, habits: data.habits.habits.map(flip) } });
    try {
      await toggleHabit(userId, habit.id);
      load('silent');
    } catch (err) {
      showToast(parseApiError(err), 'error');
      load('silent');
    }
  };

  const onToggleDose = async (dose: ScheduledDose) => {
    if (!userId) return;
    try {
      await toggleDose(userId, dose.medication_id, dose.scheduled_time);
      showToast(`${dose.name} marked as taken 💊`, 'success');
      load('silent');
    } catch (err) {
      showToast(parseApiError(err), 'error');
    }
  };

  const onDeleteLog = async (log: ActivityLogEntry) => {
    if (!userId) return;
    const ok = await confirmAction({
      title: 'Delete entry?',
      message: `Remove "${log.details}" (${formatActivityValue(log.activity_type, log.value)})?`,
      confirmText: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteActivityLog(userId, log.id);
      showToast('Entry deleted', 'info');
      load('silent');
    } catch (err) {
      showToast(parseApiError(err), 'error');
    }
  };

  const completedHabits = data?.habits.habits.filter((h) => h.completed).length ?? 0;

  return (
    <Screen refreshing={refreshing} onRefresh={() => load('refresh')}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.greeting}>{getTimeGreeting()},</Text>
          <Text style={styles.name} numberOfLines={1}>
            {name} ✨
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/settings')} style={styles.iconBtn} accessibilityLabel="Settings">
          <Ionicons name="settings-outline" size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {(error || pendingSync > 0) && (
        <TouchableOpacity style={styles.banner} onPress={() => load('refresh')} accessibilityRole="button">
          <Ionicons name="cloud-offline-outline" size={18} color={theme.colors.warning} />
          <Text style={styles.bannerText}>
            {error ? `${error} Tap to retry.` : `${pendingSync} item(s) waiting to sync. Tap to retry.`}
          </Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <>
          <ScoreCardSkeleton />
          <GoalsSkeleton />
          <ChartSkeleton />
        </>
      ) : !data ? (
        <EmptyState
          tone="error"
          title="Couldn't load your dashboard"
          message="Make sure the Wellora server is running, then pull down to refresh."
          actionLabel="Try again"
          onAction={() => load('refresh')}
        />
      ) : (
        <>
          <HealthScoreCard score={data.health_score} />

          <SectionHeader
            title="Today"
            meta={new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}
          />
          <GoalRings
            summary={data.daily}
            goals={goals}
            onAddWater={addWater}
            onPressCalories={() => router.push('/tracker/nutrition')}
            onPressWorkout={() => setSheetType('workout')}
          />

          <MedsDueCard
            schedule={data.medications}
            onToggle={onToggleDose}
            onOpen={() => router.push('/tracker/medications')}
          />

          <RecoveryCard recovery={data.recovery} onPress={() => router.push('/tracker/sleep')} />

          <SectionHeader title="Quick log" />
          <QuickActions
            actions={[
              {
                key: 'meal',
                label: 'Meal',
                icon: 'nutrition',
                colors: theme.colors.energyGradient,
                onPress: () => router.push('/tracker/nutrition'),
              },
              {
                key: 'workout',
                label: 'Workout',
                icon: 'barbell',
                colors: theme.colors.emeraldGradient,
                onPress: () => setSheetType('workout'),
              },
              {
                key: 'water',
                label: 'Water',
                icon: 'water',
                colors: ['#0284C7', '#38BDF8'],
                onPress: () => setSheetType('water'),
              },
              {
                key: 'sleep',
                label: 'Sleep',
                icon: 'moon',
                colors: ['#6D28D9', '#A78BFA'],
                onPress: () => router.push('/tracker/sleep'),
              },
              {
                key: 'vitals',
                label: 'Vitals',
                icon: 'pulse',
                colors: ['#B91C1C', '#F87171'],
                onPress: () => router.push('/tracker/vitals'),
              },
              {
                key: 'coach',
                label: 'Ask coach',
                icon: 'chatbubbles',
                colors: theme.colors.violetGradient,
                onPress: () => router.push('/assistant'),
              },
            ]}
          />

          <SectionHeader
            title="Daily habits"
            actionLabel={`${completedHabits}/${data.habits.total_habits} · Manage`}
            onAction={() => router.push('/tracker/habits')}
          />
          <HabitsChecklist habits={data.habits.habits} onToggle={onToggleHabit} limit={4} />

          <SectionHeader title="This week" />
          <WeeklyChart history={data.weekly} />

          <SectionHeader title="Logged today" meta={`${data.daily.logs.length} entries`} />
          <ActivityFeed logs={data.daily.logs} onDelete={onDeleteLog} />
        </>
      )}

      <LogActivitySheet
        type={sheetType}
        onClose={() => setSheetType(null)}
        onSubmit={submitActivity}
        onOpenFoodSearch={() => {
          setSheetType(null);
          router.push('/tracker/nutrition');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 18 },
  greeting: { color: theme.colors.textSecondary, fontSize: 14, fontWeight: '500' },
  name: { color: theme.colors.text, fontSize: 26, fontWeight: '800', marginTop: 2 },
  iconBtn: { padding: 6 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: `${theme.colors.warning}18`,
    borderColor: `${theme.colors.warning}55`,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  bannerText: { color: theme.colors.warning, fontSize: 13, fontWeight: '600', flex: 1 },
});
