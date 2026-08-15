import React, { useCallback, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useFocusEffect, useRouter } from 'expo-router';

import { ProgressRing } from '@/components/ProgressRing';
import { ChartSkeleton, GoalsSkeleton, ScoreCardSkeleton } from '@/components/SkeletonLoader';
import { useToast } from '@/components/Toast';
import {
  MEAL_PRESETS,
  theme,
  WATER_PRESETS,
  WORKOUT_PRESETS,
  getTimeGreeting,
} from '@/constants/theme';
import {
  calculateHealthScore,
  deleteActivityLog,
  drainOfflineQueue,
  fetchActivityHistory,
  fetchDailySummary,
  logActivity,
} from '@/lib/api';
import { getUserId, loadProfile } from '@/lib/storage';
import { ActivityLogEntry, DailySummary, HealthScore, WeeklyHistory } from '@/lib/types';

export default function Dashboard() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offlinePending, setOfflinePending] = useState(0);

  const [userId, setUserId] = useState('default_user');
  const [userName, setUserName] = useState('Guest');
  const [goals, setGoals] = useState({
    calories: 2000,
    steps: 10000,
    water: 2.5,
    workoutMinutes: 30,
  });

  const [healthScore, setHealthScore] = useState<HealthScore>({
    score: 0,
    label: 'Calculating...',
    color: theme.colors.primary,
    feedback: [],
    streak: { current_streak: 0, longest_streak: 0 },
  });

  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);

  const [dailySummary, setDailySummary] = useState<DailySummary>({
    date: new Date().toISOString(),
    calories_logged: 0,
    workout_minutes: 0,
    water_liters: 0,
    meal_count: 0,
    logs: [],
  });

  const [activityHistory, setActivityHistory] = useState<WeeklyHistory>({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    workout_data: [0, 0, 0, 0, 0, 0, 0],
    meal_data: [0, 0, 0, 0, 0, 0, 0],
    water_data: [0, 0, 0, 0, 0, 0, 0],
    data: [0, 0, 0, 0, 0, 0, 0],
  });
  const [chartMetric, setChartMetric] = useState<'workout' | 'meal'>('workout');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'meal' | 'workout' | 'water'>('meal');
  const [details, setDetails] = useState('');
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadDashboardData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const activeUserId = await getUserId();
      setUserId(activeUserId);

      // Attempt draining offline queue if any
      const drained = await drainOfflineQueue();
      if (drained > 0) {
        showToast(`Synced ${drained} offline item(s)`, 'success');
      }

      const profile = await loadProfile();
      if (profile.name) {
        setUserName(profile.name);
      } else {
        setUserName('Friend');
      }

      setGoals({
        calories: parseFloat(profile.targetCalories || '2000'),
        steps: parseInt(profile.targetSteps || '10000', 10),
        water: parseFloat(profile.targetWater || '2.5'),
        workoutMinutes: parseInt(profile.targetWorkoutMinutes || '30', 10),
      });

      // Parallel API fetches with safe fallbacks
      const [scoreRes, dailyRes, historyRes] = await Promise.allSettled([
        calculateHealthScore(activeUserId, profile.age, profile.weight, profile.height),
        fetchDailySummary(activeUserId),
        fetchActivityHistory(activeUserId),
      ]);

      if (scoreRes.status === 'fulfilled') {
        setHealthScore(scoreRes.value);
      }
      if (dailyRes.status === 'fulfilled') {
        setDailySummary(dailyRes.value);
      }
      if (historyRes.status === 'fulfilled') {
        setActivityHistory(historyRes.value);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData(true);
  };

  const handleOpenModal = (type: 'meal' | 'workout' | 'water') => {
    setModalType(type);
    setDetails('');
    setValue('');
    setModalVisible(true);
  };

  const handleSelectPreset = (preset: { label: string; details: string; value: number }) => {
    setDetails(preset.details);
    setValue(String(preset.value));
  };

  const handleQuickAddWater = async (liters: number) => {
    try {
      const activeUserId = userId || (await getUserId());
      await logActivity(activeUserId, 'water', 'Quick Water', liters);
      showToast(`+${liters * 1000}ml water logged! 💧`, 'success');
      loadDashboardData(true);
    } catch {
      showToast('Saved offline. Will sync when online.', 'info');
      loadDashboardData(true);
    }
  };

  const submitActivity = async () => {
    const trimmedDetails = details.trim();
    const numValue = parseFloat(value);

    if (!trimmedDetails) {
      showToast('Please enter details/name.', 'error');
      return;
    }
    if (isNaN(numValue) || numValue <= 0) {
      showToast('Please enter a valid positive number.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const activeUserId = userId || (await getUserId());
      const res = await logActivity(activeUserId, modalType, trimmedDetails, numValue);
      setModalVisible(false);
      showToast(res.message || 'Activity logged successfully! 🎉', 'success');
      loadDashboardData(true);
    } catch {
      setModalVisible(false);
      showToast('Logged offline. Will sync automatically.', 'info');
      loadDashboardData(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLog = (log: ActivityLogEntry) => {
    Alert.alert(
      'Delete Activity',
      `Are you sure you want to remove "${log.details}" (${log.value} ${
        log.activity_type === 'meal' ? 'kcal' : log.activity_type === 'water' ? 'L' : 'min'
      })?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteActivityLog(userId, log.id);
              showToast('Activity deleted', 'info');
              loadDashboardData(true);
            } catch {
              showToast('Failed to delete activity.', 'error');
            }
          },
        },
      ]
    );
  };

  const calorieProgress = goals.calories > 0 ? dailySummary.calories_logged / goals.calories : 0;
  const workoutProgress = goals.workoutMinutes > 0 ? dailySummary.workout_minutes / goals.workoutMinutes : 0;
  const waterProgress = goals.water > 0 ? dailySummary.water_liters / goals.water : 0;
  const remainingCalories = Math.max(0, Math.round(goals.calories - dailySummary.calories_logged));

  const chartDataValues =
    chartMetric === 'workout'
      ? activityHistory.workout_data.length === 7
        ? activityHistory.workout_data
        : [0, 0, 0, 0, 0, 0, 0]
      : activityHistory.meal_data.length === 7
      ? activityHistory.meal_data
      : [0, 0, 0, 0, 0, 0, 0];

  const chartMax = Math.max(...chartDataValues, 10);
  const chartSuffix = chartMetric === 'workout' ? 'm' : 'k';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getTimeGreeting()},</Text>
            <Text style={styles.username}>{userName} ✨</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push('/settings')}
              accessibilityLabel="Settings"
            >
              <Ionicons name="settings-outline" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push('/profile')}
              accessibilityLabel="Profile"
            >
              <Ionicons name="person-circle-outline" size={32} color={theme.colors.accent} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Health Score Hero Card */}
        {loading ? (
          <ScoreCardSkeleton />
        ) : (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setShowScoreBreakdown(!showScoreBreakdown)}
          >
            <LinearGradient
              colors={[healthScore.color || theme.colors.primary, '#1d1145']}
              style={styles.scoreCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.scoreInfo}>
                <View style={styles.scoreHeaderRow}>
                  <Text style={styles.scoreLabel}>Health Score</Text>
                  {healthScore.streak && healthScore.streak.current_streak > 0 && (
                    <View style={styles.streakBadge}>
                      <Ionicons name="flame" size={14} color="#FFA114" />
                      <Text style={styles.streakText}>
                        {healthScore.streak.current_streak}d streak
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.scoreValue}>{healthScore.score}</Text>
                <View style={styles.scoreSubBadge}>
                  <Text style={styles.scoreSubText}>{healthScore.label}</Text>
                </View>
              </View>

              <View style={styles.scoreCircle}>
                <Ionicons name="heart-circle" size={44} color="#ffffff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Score Breakdown (Accordion) */}
        {showScoreBreakdown && healthScore.breakdown && (
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>Score Breakdown</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Profile Completeness</Text>
              <Text style={styles.breakdownVal}>{healthScore.breakdown.profile} / 20</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>BMI Category</Text>
              <Text style={styles.breakdownVal}>{healthScore.breakdown.bmi} / 30</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Activity Logging</Text>
              <Text style={styles.breakdownVal}>{healthScore.breakdown.activity} / 30</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Habit Consistency</Text>
              <Text style={styles.breakdownVal}>{healthScore.breakdown.consistency} / 20</Text>
            </View>
          </View>
        )}

        {/* Feedback Tips */}
        {healthScore.feedback.length > 0 && (
          <View style={styles.feedbackContainer}>
            {healthScore.feedback.map((item, index) => (
              <View key={index} style={styles.feedbackItem}>
                <Ionicons name="sparkles" size={15} color={theme.colors.accent} />
                <Text style={styles.feedbackText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Today's Goal Progress Rings */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Today's Progress</Text>
          <Text style={styles.sectionSub}>Live Tracked</Text>
        </View>

        {loading ? (
          <GoalsSkeleton />
        ) : (
          <View style={styles.goalsRow}>
            {/* Calories Ring */}
            <View style={styles.goalCard}>
              <ProgressRing
                progress={calorieProgress}
                size={74}
                strokeWidth={7}
                color={theme.colors.calories}
                icon={<Ionicons name="flame" size={18} color={theme.colors.calories} />}
                label={`${Math.round(dailySummary.calories_logged)}`}
                sublabel="kcal"
              />
              <Text style={styles.goalTitle}>Calories</Text>
              <Text style={styles.goalMeta}>
                {remainingCalories > 0 ? `${remainingCalories} left` : 'Target met!'}
              </Text>
            </View>

            {/* Workout Ring */}
            <View style={styles.goalCard}>
              <ProgressRing
                progress={workoutProgress}
                size={74}
                strokeWidth={7}
                color={theme.colors.workout}
                icon={<Ionicons name="barbell" size={18} color={theme.colors.workout} />}
                label={`${Math.round(dailySummary.workout_minutes)}`}
                sublabel="min"
              />
              <Text style={styles.goalTitle}>Exercise</Text>
              <Text style={styles.goalMeta}>Goal: {goals.workoutMinutes}m</Text>
            </View>

            {/* Hydration Ring */}
            <View style={styles.goalCard}>
              <ProgressRing
                progress={waterProgress}
                size={74}
                strokeWidth={7}
                color={theme.colors.water}
                icon={<Ionicons name="water" size={18} color={theme.colors.water} />}
                label={`${dailySummary.water_liters.toFixed(1)}`}
                sublabel="L"
              />
              <Text style={styles.goalTitle}>Water</Text>
              <View style={styles.quickWaterRow}>
                <TouchableOpacity
                  style={styles.waterBtn}
                  onPress={() => handleQuickAddWater(0.25)}
                  accessibilityLabel="Add 250ml water"
                >
                  <Text style={styles.waterBtnText}>+250ml</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Weekly Activity Trends */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Weekly Insights</Text>
          <View style={styles.chartToggle}>
            <TouchableOpacity
              style={[styles.toggleTab, chartMetric === 'workout' && styles.toggleTabActive]}
              onPress={() => setChartMetric('workout')}
            >
              <Text style={[styles.toggleText, chartMetric === 'workout' && styles.toggleTextActive]}>
                Workouts
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleTab, chartMetric === 'meal' && styles.toggleTabActive]}
              onPress={() => setChartMetric('meal')}
            >
              <Text style={[styles.toggleText, chartMetric === 'meal' && styles.toggleTextActive]}>
                Calories
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ChartSkeleton />
        ) : (
          <View style={styles.chartCard}>
            <LineChart
              data={{
                labels: activityHistory.labels,
                datasets: [{ data: chartDataValues }],
              }}
              width={Dimensions.get('window').width - 48}
              height={200}
              yAxisLabel=""
              yAxisSuffix={chartSuffix}
              chartConfig={{
                backgroundColor: theme.colors.surface,
                backgroundGradientFrom: theme.colors.surface,
                backgroundGradientTo: theme.colors.surfaceSubtle,
                decimalPlaces: 0,
                color: (opacity = 1) =>
                  chartMetric === 'workout'
                    ? `rgba(52, 211, 153, ${opacity})`
                    : `rgba(255, 107, 107, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(165, 163, 194, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: {
                  r: '5',
                  strokeWidth: '2',
                  stroke: chartMetric === 'workout' ? '#10B981' : '#FF6B6B',
                },
              }}
              bezier
              style={{ borderRadius: 16, paddingRight: 40 }}
            />
          </View>
        )}

        {/* Quick Action Tray */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => handleOpenModal('meal')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={theme.colors.energyGradient}
              style={styles.actionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="nutrition" size={24} color="#ffffff" style={{ marginRight: 12 }} />
              <View>
                <Text style={styles.actionTitle}>Log Meal</Text>
                <Text style={styles.actionSub}>Track food & calories</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => handleOpenModal('workout')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={theme.colors.emeraldGradient}
              style={styles.actionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="barbell" size={24} color="#ffffff" style={{ marginRight: 12 }} />
              <View>
                <Text style={styles.actionTitle}>Log Workout</Text>
                <Text style={styles.actionSub}>Record active minutes</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => handleOpenModal('water')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#0284C7', '#38BDF8']}
              style={styles.actionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="water" size={24} color="#ffffff" style={{ marginRight: 12 }} />
              <View>
                <Text style={styles.actionTitle}>Log Water</Text>
                <Text style={styles.actionSub}>Keep hydration optimal</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/assistant')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={theme.colors.violetGradient}
              style={styles.actionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="chatbubbles" size={24} color="#ffffff" style={{ marginRight: 12 }} />
              <View>
                <Text style={styles.actionTitle}>AI Assistant</Text>
                <Text style={styles.actionSub}>Ask diet & wellness tips</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Today's Activity Feed */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Today's Logged Items</Text>
          <Text style={styles.sectionSub}>{dailySummary.logs.length} logged</Text>
        </View>

        {dailySummary.logs.length === 0 ? (
          <View style={styles.emptyFeed}>
            <Ionicons name="clipboard-outline" size={32} color={theme.colors.textMuted} />
            <Text style={styles.emptyFeedText}>No activities logged yet today.</Text>
            <Text style={styles.emptyFeedSub}>Use the quick actions above to track meals or workouts!</Text>
          </View>
        ) : (
          <View style={styles.feedList}>
            {dailySummary.logs.map((log) => {
              const isMeal = log.activity_type === 'meal';
              const isWorkout = log.activity_type === 'workout';
              const iconName = isMeal ? 'nutrition' : isWorkout ? 'barbell' : 'water';
              const iconColor = isMeal
                ? theme.colors.calories
                : isWorkout
                ? theme.colors.workout
                : theme.colors.water;
              const unit = isMeal ? 'kcal' : isWorkout ? 'min' : 'L';

              return (
                <View key={log.id} style={styles.feedItem}>
                  <View style={[styles.feedIconWrap, { backgroundColor: `${iconColor}20` }]}>
                    <Ionicons name={iconName} size={20} color={iconColor} />
                  </View>
                  <View style={styles.feedItemInfo}>
                    <Text style={styles.feedItemTitle}>{log.details}</Text>
                    <Text style={styles.feedItemTime}>
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <Text style={[styles.feedItemValue, { color: iconColor }]}>
                    {log.value} {unit}
                  </Text>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteLog(log)}
                    accessibilityLabel="Delete item"
                  >
                    <Ionicons name="trash-outline" size={18} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Modal for Logging */}
        <Modal
          animationType="fade"
          transparent
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {modalType === 'meal'
                    ? '🥣 Log Meal'
                    : modalType === 'workout'
                    ? '🏋️ Log Workout'
                    : '💧 Log Water'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close-circle" size={24} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Preset Chips */}
              <Text style={styles.presetHeading}>Quick Presets</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsRow}>
                {(modalType === 'meal'
                  ? MEAL_PRESETS
                  : modalType === 'workout'
                  ? WORKOUT_PRESETS
                  : WATER_PRESETS
                ).map((preset, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.presetChip}
                    onPress={() => handleSelectPreset(preset)}
                  >
                    <Text style={styles.presetChipText}>{preset.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>
                {modalType === 'meal'
                  ? 'What did you eat?'
                  : modalType === 'workout'
                  ? 'Workout Activity'
                  : 'Water Type / Container'}
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder={
                  modalType === 'meal'
                    ? 'e.g. Avocado Toast & Eggs'
                    : modalType === 'workout'
                    ? 'e.g. Morning Jog'
                    : 'e.g. Filtered Water'
                }
                placeholderTextColor={theme.colors.textMuted}
                value={details}
                onChangeText={setDetails}
              />

              <Text style={styles.inputLabel}>
                {modalType === 'meal'
                  ? 'Calories (kcal)'
                  : modalType === 'workout'
                  ? 'Duration (minutes)'
                  : 'Amount (Liters, e.g. 0.5)'}
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder={modalType === 'water' ? '0.5' : '300'}
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                value={value}
                onChangeText={setValue}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.submitBtn]}
                  onPress={submitActivity}
                  disabled={submitting}
                >
                  <Text style={styles.submitBtnText}>
                    {submitting ? 'Saving...' : 'Save Entry'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  greeting: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  username: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: 2,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    padding: 4,
  },
  scoreCard: {
    borderRadius: theme.borderRadius.xl,
    padding: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  scoreLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  streakText: {
    color: '#FFA114',
    fontSize: 12,
    fontWeight: '700',
  },
  scoreValue: {
    color: '#ffffff',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
  },
  scoreSubBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  scoreSubText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  scoreCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  breakdownCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  breakdownTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  breakdownLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  breakdownVal: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  feedbackContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    gap: 8,
  },
  feedbackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  feedbackText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  sectionSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  goalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  goalCard: {
    width: '31%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  goalTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  goalMeta: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  quickWaterRow: {
    marginTop: 4,
  },
  waterBtn: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 2,
  },
  waterBtnText: {
    color: theme.colors.water,
    fontSize: 10,
    fontWeight: '700',
  },
  chartToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  toggleTab: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 11,
  },
  toggleTabActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#ffffff',
  },
  chartCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    alignItems: 'center',
  },
  actionsGrid: {
    flexDirection: 'column',
    gap: 12,
    marginBottom: 24,
    marginTop: 10,
  },
  actionCard: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    height: 64,
  },
  actionGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  actionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  actionSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  emptyFeed: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    gap: 8,
    marginBottom: 20,
  },
  emptyFeedText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  emptyFeedSub: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  feedList: {
    gap: 10,
    marginBottom: 20,
  },
  feedItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  feedIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  feedItemInfo: {
    flex: 1,
  },
  feedItemTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  feedItemTime: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  feedItemValue: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 10,
  },
  deleteBtn: {
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    width: '100%',
    maxWidth: 420,
    borderRadius: theme.borderRadius.xl,
    padding: 22,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  presetHeading: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  presetsRow: {
    flexDirection: 'row',
    marginBottom: 16,
    maxHeight: 40,
  },
  presetChip: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  presetChipText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  inputLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    padding: 13,
    borderRadius: theme.borderRadius.md,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    fontSize: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: theme.colors.surfaceSubtle,
  },
  cancelBtnText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },
  submitBtn: {
    backgroundColor: theme.colors.primary,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});
