import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useToast } from '@/components/Toast';
import { Button, Card, EmptyState, Field, ProgressBar, Screen, SectionHeader, Segmented, Sheet } from '@/components/ui';
import { MEAL_SLOTS, defaultMealSlot, theme } from '@/constants/theme';
import { useDebounced } from '@/hooks/useDebounced';
import { useFocusData } from '@/hooks/useFocusData';
import {
  createFood,
  deleteActivityLog,
  fetchDailyNutrition,
  fetchPopularFoods,
  logFood,
  parseApiError,
  searchFoods,
} from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { parsePositive } from '@/lib/format';
import { ActivityLogEntry, FoodItem, MealSlot } from '@/lib/types';

export default function NutritionScreen() {
  const { showToast } = useToast();
  const { data: daily, userId, refreshing, refresh, reload, error } = useFocusData(fetchDailyNutrition);

  const [query, setQuery] = useState('');
  const debounced = useDebounced(query.trim(), 250);
  const [results, setResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [customOpen, setCustomOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setSearching(true);
    (debounced ? searchFoods(debounced) : fetchPopularFoods(12))
      .then((foods) => active && setResults(foods))
      .catch(() => active && setResults([]))
      .finally(() => active && setSearching(false));
    return () => {
      active = false;
    };
  }, [debounced]);

  const onDelete = async (log: ActivityLogEntry) => {
    if (
      !userId ||
      !(await confirmAction({ title: 'Remove food?', message: log.details, confirmText: 'Remove', destructive: true }))
    )
      return;
    try {
      await deleteActivityLog(userId, log.id);
      reload();
    } catch (err) {
      showToast(parseApiError(err), 'error');
    }
  };

  return (
    <Screen
      title="Nutrition"
      subtitle="Search foods, track calories & macros"
      showBack
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {error && !daily ? (
        <EmptyState
          tone="error"
          title="Couldn't load nutrition"
          message={error}
          actionLabel="Retry"
          onAction={refresh}
        />
      ) : daily ? (
        <Card>
          <View style={styles.kcalRow}>
            <View>
              <Text style={styles.kcalBig}>{Math.round(daily.remaining_calories)}</Text>
              <Text style={styles.kcalLabel}>kcal remaining</Text>
            </View>
            <View style={styles.kcalSide}>
              <Text style={styles.kcalSmall}>
                {Math.round(daily.consumed.calories)} eaten · {Math.round(daily.targets.calories)} goal
              </Text>
              <Text style={styles.kcalSmall}>{daily.consumed.fiber_g}g fibre</Text>
            </View>
          </View>
          <ProgressBar
            label="Protein"
            value={daily.consumed.protein_g}
            target={daily.targets.protein}
            unit="g"
            color={theme.colors.protein}
          />
          <ProgressBar
            label="Carbs"
            value={daily.consumed.carbs_g}
            target={daily.targets.carbs}
            unit="g"
            color={theme.colors.carbs}
          />
          <ProgressBar
            label="Fats"
            value={daily.consumed.fats_g}
            target={daily.targets.fats}
            unit="g"
            color={theme.colors.fats}
          />
        </Card>
      ) : (
        <ActivityIndicator color={theme.colors.accent} style={styles.loader} />
      )}

      <SectionHeader title="Add food" />
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search e.g. roti, paneer, oats…"
          placeholderTextColor={theme.colors.textMuted}
          value={query}
          onChangeText={setQuery}
          accessibilityLabel="Search foods"
          returnKeyType="search"
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {searching && !results.length ? (
        <ActivityIndicator color={theme.colors.accent} style={styles.loader} />
      ) : results.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title={`No match for "${query}"`}
          message="Add it as a custom food so you can log it any time."
          actionLabel="Add custom food"
          onAction={() => setCustomOpen(true)}
        />
      ) : (
        <View style={styles.results}>
          {!debounced && <Text style={styles.hint}>Popular foods</Text>}
          {results.map((food) => (
            <TouchableOpacity
              key={food.id}
              style={styles.food}
              onPress={() => setSelected(food)}
              accessibilityLabel={`Add ${food.name}`}
            >
              <View style={styles.flex}>
                <Text style={styles.foodName}>{food.name}</Text>
                <Text style={styles.foodMeta}>
                  {food.serving_size} {food.serving_unit} · P {food.protein_g}g · C {food.carbs_g}g · F {food.fats_g}g
                </Text>
              </View>
              <Text style={styles.foodKcal}>{Math.round(food.calories)} kcal</Text>
              <Ionicons name="add-circle" size={24} color={theme.colors.accent} />
            </TouchableOpacity>
          ))}
          <Button
            label="Can't find it? Add a custom food"
            variant="ghost"
            icon="create-outline"
            onPress={() => setCustomOpen(true)}
          />
        </View>
      )}

      {daily && (
        <>
          <SectionHeader title="Today's meals" />
          {MEAL_SLOTS.map((slot) => {
            const logs = daily.meals[slot.value] ?? [];
            if (!logs.length) return null;
            const total = logs.reduce((sum, l) => sum + l.value, 0);
            return (
              <Card key={slot.value}>
                <View style={styles.slotHeader}>
                  <Ionicons name={slot.icon} size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.slotTitle}>{slot.label}</Text>
                  <Text style={styles.slotTotal}>{Math.round(total)} kcal</Text>
                </View>
                {logs.map((log) => (
                  <View key={log.id} style={styles.mealRow}>
                    <View style={styles.flex}>
                      <Text style={styles.mealName}>{log.details}</Text>
                      {log.metadata?.serving_label ? (
                        <Text style={styles.foodMeta}>{log.metadata.serving_label}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.mealKcal}>{Math.round(log.value)}</Text>
                    <TouchableOpacity
                      onPress={() => onDelete(log)}
                      hitSlop={10}
                      accessibilityLabel={`Remove ${log.details}`}
                    >
                      <Ionicons name="trash-outline" size={17} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </Card>
            );
          })}
          {Object.values(daily.meals).every((l) => !l.length) && (
            <EmptyState
              icon="restaurant-outline"
              title="No meals logged yet"
              message="Search above and tap a food to add it."
            />
          )}
        </>
      )}

      <LogFoodSheet
        food={selected}
        onClose={() => setSelected(null)}
        onLogged={(msg) => {
          setSelected(null);
          showToast(msg, 'success');
          reload();
        }}
        userId={userId}
      />
      <CustomFoodSheet
        visible={customOpen}
        initialName={query}
        onClose={() => setCustomOpen(false)}
        onCreated={(food) => {
          setCustomOpen(false);
          setResults((r) => [food, ...r]);
          setSelected(food);
        }}
      />
    </Screen>
  );
}

function LogFoodSheet({
  food,
  userId,
  onClose,
  onLogged,
}: {
  food: FoodItem | null;
  userId: string | null;
  onClose: () => void;
  onLogged: (message: string) => void;
}) {
  const { showToast } = useToast();
  const [servings, setServings] = useState(1);
  const [slot, setSlot] = useState<MealSlot>(defaultMealSlot());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setServings(1);
    setSlot(defaultMealSlot());
  }, [food]);

  const totals = useMemo(() => {
    if (!food) return null;
    const s = (n: number) => Math.round(n * servings * 10) / 10;
    return { kcal: s(food.calories), p: s(food.protein_g), c: s(food.carbs_g), f: s(food.fats_g) };
  }, [food, servings]);

  if (!food || !totals) return null;

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const res = await logFood(userId, food.id, servings, slot);
      onLogged(res.message);
    } catch (err) {
      showToast(parseApiError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible
      title={food.name}
      onClose={onClose}
      footer={
        <Button label={`Add ${totals.kcal} kcal`} icon="add" onPress={save} loading={saving} style={styles.flex} />
      }
    >
      <Text style={styles.sheetLabel}>
        Servings ({food.serving_size} {food.serving_unit} each)
      </Text>
      <View style={styles.stepper}>
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => setServings((s) => Math.max(0.5, s - 0.5))}
          accessibilityLabel="Fewer servings"
        >
          <Ionicons name="remove" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.stepValue} accessibilityLiveRegion="polite">
          {servings}
        </Text>
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => setServings((s) => Math.min(20, s + 0.5))}
          accessibilityLabel="More servings"
        >
          <Ionicons name="add" size={22} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
      <Text style={styles.sheetLabel}>Meal</Text>
      <Segmented options={MEAL_SLOTS} value={slot} onChange={setSlot} />
      <View style={styles.macroRow}>
        {[
          ['Protein', totals.p, theme.colors.protein],
          ['Carbs', totals.c, theme.colors.carbs],
          ['Fats', totals.f, theme.colors.fats],
        ].map(([label, value, color]) => (
          <View key={label as string} style={styles.macroBox}>
            <Text style={[styles.macroValue, { color: color as string }]}>{value as number}g</Text>
            <Text style={styles.macroLabel}>{label as string}</Text>
          </View>
        ))}
      </View>
    </Sheet>
  );
}

function CustomFoodSheet({
  visible,
  initialName,
  onClose,
  onCreated,
}: {
  visible: boolean;
  initialName: string;
  onClose: () => void;
  onCreated: (food: FoodItem) => void;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: '', serving: '1', unit: 'serving', kcal: '', p: '', c: '', f: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm({ name: initialName, serving: '1', unit: 'serving', kcal: '', p: '', c: '', f: '' });
      setError(null);
    }
  }, [visible, initialName]);

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const num = (v: string) => (v.trim() ? parseFloat(v.replace(',', '.')) || 0 : 0);

  const save = async () => {
    const kcal = parsePositive(form.kcal);
    if (!form.name.trim() || kcal === null || !parsePositive(form.serving)) {
      setError('Name, serving size and calories are required.');
      return;
    }
    setSaving(true);
    try {
      const food = await createFood({
        name: form.name.trim(),
        category: 'Custom',
        serving_size: parsePositive(form.serving)!,
        serving_unit: form.unit.trim() || 'serving',
        calories: kcal,
        protein_g: num(form.p),
        carbs_g: num(form.c),
        fats_g: num(form.f),
        fiber_g: 0,
      });
      showToast(`${food.name} added to your foods`, 'success');
      onCreated(food);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      title="Custom food"
      onClose={onClose}
      footer={<Button label="Save food" onPress={save} loading={saving} style={styles.flex} />}
    >
      <Field
        label="Name"
        value={form.name}
        onChangeText={set('name')}
        placeholder="e.g. Mom's rajma chawal"
        error={error}
      />
      <View style={styles.twoCol}>
        <Field label="Serving size" value={form.serving} onChangeText={set('serving')} keyboardType="decimal-pad" />
        <Field label="Unit" value={form.unit} onChangeText={set('unit')} placeholder="bowl, g, piece" />
      </View>
      <Field label="Calories" value={form.kcal} onChangeText={set('kcal')} keyboardType="decimal-pad" suffix="kcal" />
      <View style={styles.twoCol}>
        <Field label="Protein" value={form.p} onChangeText={set('p')} keyboardType="decimal-pad" suffix="g" />
        <Field label="Carbs" value={form.c} onChangeText={set('c')} keyboardType="decimal-pad" suffix="g" />
        <Field label="Fats" value={form.f} onChangeText={set('f')} keyboardType="decimal-pad" suffix="g" />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginVertical: 20 },
  kcalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  kcalBig: { color: theme.colors.text, fontSize: 36, fontWeight: '900' },
  kcalLabel: { color: theme.colors.textSecondary, fontSize: 13 },
  kcalSide: { alignItems: 'flex-end' },
  kcalSmall: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: theme.colors.text, fontSize: 16, paddingVertical: 12 },
  results: { gap: 8, marginBottom: 8 },
  hint: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' },
  food: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  foodName: { color: theme.colors.text, fontWeight: '700', fontSize: 14 },
  foodMeta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  foodKcal: { color: theme.colors.calories, fontWeight: '800', fontSize: 13 },
  slotHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  slotTitle: { color: theme.colors.text, fontWeight: '800', flex: 1 },
  slotTotal: { color: theme.colors.calories, fontWeight: '700', fontSize: 13 },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceBorder,
  },
  mealName: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  mealKcal: { color: theme.colors.textSecondary, fontWeight: '700' },
  sheetLabel: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 18 },
  stepBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { color: theme.colors.text, fontSize: 30, fontWeight: '900', minWidth: 60, textAlign: 'center' },
  macroRow: { flexDirection: 'row', gap: 10 },
  macroBox: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 12, padding: 12, alignItems: 'center' },
  macroValue: { fontSize: 18, fontWeight: '800' },
  macroLabel: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  twoCol: { flexDirection: 'row', gap: 10 },
});
