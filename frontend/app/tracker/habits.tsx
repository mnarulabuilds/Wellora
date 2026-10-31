import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HabitsChecklist } from '@/components/dashboard/HabitsChecklist';
import { useToast } from '@/components/Toast';
import { Button, Card, EmptyState, Field, ProgressBar, Screen, SectionHeader, Segmented } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useFocusData } from '@/hooks/useFocusData';
import { archiveHabit, createHabit, fetchHabitsStatus, parseApiError, toggleHabit } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { Habit } from '@/lib/types';

const CATEGORIES = [
  { value: 'fitness', label: '🏃 Fitness' },
  { value: 'nutrition', label: '🥗 Nutrition' },
  { value: 'mindfulness', label: '🧘 Mind' },
  { value: 'recovery', label: '😴 Recovery' },
];

export default function HabitsScreen() {
  const { showToast } = useToast();
  const { data, userId, refreshing, refresh, reload, error } = useFocusData((uid) => fetchHabitsStatus(uid));
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('fitness');
  const [saving, setSaving] = useState(false);

  const onToggle = async (habit: Habit) => {
    if (!userId) return;
    try {
      await toggleHabit(userId, habit.id);
      reload();
    } catch (err) {
      showToast(parseApiError(err), 'error');
    }
  };

  const onAdd = async () => {
    if (!userId) return;
    if (title.trim().length < 2) return showToast('Give your habit a short name.', 'error');
    setSaving(true);
    try {
      await createHabit(userId, title.trim(), category);
      setTitle('');
      showToast('Habit added', 'success');
      reload();
    } catch (err) {
      showToast(parseApiError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const onRemove = async (habit: Habit) => {
    if (
      !userId ||
      !(await confirmAction({ title: 'Remove habit?', message: habit.title, confirmText: 'Remove', destructive: true }))
    )
      return;
    try {
      await archiveHabit(userId, habit.id);
      reload();
    } catch (err) {
      showToast(parseApiError(err), 'error');
    }
  };

  return (
    <Screen title="Habits" subtitle="Small daily wins compound" showBack refreshing={refreshing} onRefresh={refresh}>
      {error && !data ? (
        <EmptyState tone="error" title="Couldn't load habits" message={error} actionLabel="Retry" onAction={refresh} />
      ) : data ? (
        <>
          <Card>
            <ProgressBar
              label="Today"
              value={data.completed_habits}
              target={data.total_habits}
              unit="done"
              color={theme.colors.habits}
            />
            <Text style={styles.muted}>
              {data.completion_rate >= 100
                ? '🎉 Perfect day!'
                : `${Math.round(data.completion_rate)}% complete — tap a habit to check it off.`}
            </Text>
          </Card>
          <HabitsChecklist habits={data.habits} onToggle={onToggle} />

          <SectionHeader title="Add a habit" />
          <Card>
            <Field
              label="Habit"
              placeholder="e.g. Read 10 pages"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
              onSubmitEditing={onAdd}
            />
            <Segmented options={CATEGORIES} value={category} onChange={setCategory} color={theme.colors.habits} />
            <Button label="Add habit" icon="add" onPress={onAdd} loading={saving} />
          </Card>

          <SectionHeader title="Manage" />
          {data.habits.map((habit) => (
            <View key={habit.id} style={styles.row}>
              <Text style={styles.rowText} numberOfLines={1}>
                {habit.title}
              </Text>
              <Text style={styles.cat}>{habit.category}</Text>
              <TouchableOpacity
                onPress={() => onRemove(habit)}
                hitSlop={10}
                accessibilityLabel={`Remove ${habit.title}`}
              >
                <Ionicons name="remove-circle-outline" size={20} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: theme.colors.textSecondary, fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorder,
  },
  rowText: { color: theme.colors.text, flex: 1, fontWeight: '600' },
  cat: { color: theme.colors.textMuted, fontSize: 12, textTransform: 'capitalize' },
});
