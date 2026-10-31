import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { Button, Field, Sheet } from '@/components/ui';
import { MEAL_PRESETS, WATER_PRESETS, WORKOUT_PRESETS, theme } from '@/constants/theme';
import { parsePositive } from '@/lib/format';
import { ActivityType } from '@/lib/types';

const COPY: Record<
  ActivityType,
  { title: string; detailLabel: string; detailPh: string; valueLabel: string; unit: string; max: number }
> = {
  meal: {
    title: '🥣 Log a meal',
    detailLabel: 'What did you eat?',
    detailPh: 'e.g. Dal, rice & salad',
    valueLabel: 'Calories',
    unit: 'kcal',
    max: 10000,
  },
  workout: {
    title: '🏋️ Log a workout',
    detailLabel: 'Activity',
    detailPh: 'e.g. Morning jog',
    valueLabel: 'Duration',
    unit: 'min',
    max: 720,
  },
  water: {
    title: '💧 Log water',
    detailLabel: 'Drink',
    detailPh: 'e.g. Water bottle',
    valueLabel: 'Amount',
    unit: 'L',
    max: 15,
  },
};

const PRESETS = { meal: MEAL_PRESETS, workout: WORKOUT_PRESETS, water: WATER_PRESETS };

interface Props {
  type: ActivityType | null;
  onClose: () => void;
  onSubmit: (type: ActivityType, details: string, value: number) => Promise<void>;
  onOpenFoodSearch?: () => void;
}

export function LogActivitySheet({ type, onClose, onSubmit, onOpenFoodSearch }: Props) {
  const [details, setDetails] = useState('');
  const [value, setValue] = useState('');
  const [errors, setErrors] = useState<{ details?: string; value?: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDetails('');
    setValue('');
    setErrors({});
  }, [type]);

  if (!type) return null;
  const copy = COPY[type];

  const submit = async () => {
    const amount = parsePositive(value);
    const next: typeof errors = {};
    if (!details.trim()) next.details = 'Please describe it.';
    if (amount === null) next.value = 'Enter a number greater than 0.';
    else if (amount > copy.max) next.value = `Must be under ${copy.max} ${copy.unit}.`;
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await onSubmit(type, details.trim(), amount!);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible
      title={copy.title}
      onClose={onClose}
      footer={<Button label="Save entry" icon="checkmark" onPress={submit} loading={saving} style={styles.flex} />}
    >
      {type === 'meal' && onOpenFoodSearch && (
        <TouchableOpacity style={styles.searchCta} onPress={onOpenFoodSearch} accessibilityRole="button">
          <Text style={styles.searchCtaText}>🔎 Search the food library for exact calories & macros →</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.presetLabel}>Quick presets</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presets}>
        {PRESETS[type].map((preset) => (
          <TouchableOpacity
            key={preset.label}
            style={styles.preset}
            onPress={() => {
              setDetails(preset.details);
              setValue(String(preset.value));
              setErrors({});
            }}
          >
            <Text style={styles.presetText}>{preset.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Field
        label={copy.detailLabel}
        placeholder={copy.detailPh}
        value={details}
        onChangeText={setDetails}
        error={errors.details}
        maxLength={120}
      />
      <Field
        label={copy.valueLabel}
        placeholder={type === 'water' ? '0.5' : '300'}
        keyboardType="decimal-pad"
        value={value}
        onChangeText={setValue}
        error={errors.value}
        suffix={copy.unit}
        returnKeyType="done"
        onSubmitEditing={submit}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  searchCta: { backgroundColor: `${theme.colors.accent}18`, borderRadius: 12, padding: 12, marginBottom: 14 },
  searchCtaText: { color: theme.colors.accent, fontWeight: '700', fontSize: 13 },
  presetLabel: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  presets: { gap: 8, paddingBottom: 16 },
  preset: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  presetText: { color: theme.colors.text, fontSize: 13, fontWeight: '600' },
});
