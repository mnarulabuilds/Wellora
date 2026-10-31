import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ProgressRing } from '@/components/ProgressRing';
import { theme } from '@/constants/theme';
import { DailySummary } from '@/lib/types';

export interface Goals {
  calories: number;
  water: number;
  workoutMinutes: number;
}

interface Props {
  summary: DailySummary;
  goals: Goals;
  onAddWater: (liters: number) => void;
  onPressCalories: () => void;
  onPressWorkout: () => void;
}

export function GoalRings({ summary, goals, onAddWater, onPressCalories, onPressWorkout }: Props) {
  const remaining = Math.max(0, Math.round(goals.calories - summary.calories_logged));
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPressCalories}
        accessibilityLabel={`Calories ${Math.round(summary.calories_logged)} of ${goals.calories}`}
      >
        <ProgressRing
          progress={summary.calories_logged / goals.calories}
          size={74}
          strokeWidth={7}
          color={theme.colors.calories}
          icon={<Ionicons name="flame" size={18} color={theme.colors.calories} />}
          label={`${Math.round(summary.calories_logged)}`}
          sublabel="kcal"
        />
        <Text style={styles.title}>Calories</Text>
        <Text style={styles.meta}>{remaining > 0 ? `${remaining} left` : 'Target met!'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={onPressWorkout}
        accessibilityLabel={`Exercise ${Math.round(summary.workout_minutes)} of ${goals.workoutMinutes} minutes`}
      >
        <ProgressRing
          progress={summary.workout_minutes / goals.workoutMinutes}
          size={74}
          strokeWidth={7}
          color={theme.colors.workout}
          icon={<Ionicons name="barbell" size={18} color={theme.colors.workout} />}
          label={`${Math.round(summary.workout_minutes)}`}
          sublabel="min"
        />
        <Text style={styles.title}>Exercise</Text>
        <Text style={styles.meta}>Goal {goals.workoutMinutes}m</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <ProgressRing
          progress={summary.water_liters / goals.water}
          size={74}
          strokeWidth={7}
          color={theme.colors.water}
          icon={<Ionicons name="water" size={18} color={theme.colors.water} />}
          label={summary.water_liters.toFixed(1)}
          sublabel={`of ${goals.water}L`}
        />
        <Text style={styles.title}>Water</Text>
        <TouchableOpacity
          style={styles.waterBtn}
          onPress={() => onAddWater(0.25)}
          accessibilityLabel="Add 250 millilitres of water"
          hitSlop={6}
        >
          <Text style={styles.waterBtnText}>+250ml</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  card: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: 13, marginTop: 8 },
  meta: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
  waterBtn: {
    marginTop: 4,
    backgroundColor: `${theme.colors.water}22`,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  waterBtnText: { color: theme.colors.water, fontSize: 11, fontWeight: '800' },
});
