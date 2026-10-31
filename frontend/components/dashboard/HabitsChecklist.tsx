import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '@/constants/theme';
import { Habit } from '@/lib/types';

interface Props {
  habits: Habit[];
  onToggle: (habit: Habit) => void;
  limit?: number;
}

export function HabitsChecklist({ habits, onToggle, limit }: Props) {
  const shown = limit ? habits.slice(0, limit) : habits;
  return (
    <View style={styles.list}>
      {shown.map((habit) => (
        <TouchableOpacity
          key={habit.id}
          style={[styles.item, habit.completed && styles.itemDone]}
          onPress={() => onToggle(habit)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: !!habit.completed }}
          accessibilityLabel={habit.title}
        >
          <Ionicons
            name={habit.completed ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={habit.completed ? theme.colors.habits : theme.colors.textMuted}
          />
          <Text style={[styles.text, habit.completed && styles.textDone]} numberOfLines={2}>
            {habit.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8, marginBottom: 14 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  itemDone: { borderColor: `${theme.colors.habits}66`, backgroundColor: `${theme.colors.habits}12` },
  text: { color: theme.colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
  textDone: { color: theme.colors.textSecondary, textDecorationLine: 'line-through' },
});
