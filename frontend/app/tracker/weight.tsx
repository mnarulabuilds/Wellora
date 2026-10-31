import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';

import { useToast } from '@/components/Toast';
import { Button, Card, EmptyState, Field, Screen, SectionHeader } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useFocusData } from '@/hooks/useFocusData';
import { deleteWeightLog, fetchWeightHistory, logWeight, parseApiError } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { formatDelta, formatRelativeDay, formatWeight, kgToLbs, lbsToKg, parsePositive } from '@/lib/format';
import { getUnitSystem, saveProfileLocal } from '@/lib/storage';
import { UnitSystem, WeightLog } from '@/lib/types';

export default function WeightScreen() {
  const { showToast } = useToast();
  const { width } = useWindowDimensions();
  const {
    data: history,
    userId,
    refreshing,
    refresh,
    reload,
    error,
  } = useFocusData((uid) => fetchWeightHistory(uid, 60));
  const [units, setUnits] = useState<UnitSystem>('metric');
  const [value, setValue] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getUnitSystem().then(setUnits);
  }, []);

  const save = async () => {
    if (!userId) return;
    const entered = parsePositive(value);
    if (entered === null) return setFormError('Enter your weight.');
    const kg = units === 'imperial' ? lbsToKg(entered) : entered;
    if (kg < 20 || kg > 400) return setFormError('That weight looks out of range.');
    setSaving(true);
    try {
      await logWeight(userId, kg);
      await saveProfileLocal({ weight: String(kg) });
      showToast(`Weigh-in saved: ${formatWeight(kg, units)}`, 'success');
      setValue('');
      setFormError(null);
      reload();
    } catch (err) {
      setFormError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (log: WeightLog) => {
    if (
      !userId ||
      !(await confirmAction({
        title: 'Delete weigh-in?',
        message: formatWeight(log.weight, units),
        confirmText: 'Delete',
        destructive: true,
      }))
    )
      return;
    try {
      await deleteWeightLog(userId, log.id);
      reload();
    } catch (err) {
      showToast(parseApiError(err), 'error');
    }
  };

  const points = [...(history ?? [])].reverse();
  const display = (kg: number) => (units === 'imperial' ? kgToLbs(kg) : kg);
  const latest = history?.[0];
  const oldest = history?.[history.length - 1];
  const change = latest && oldest && history!.length > 1 ? display(latest.weight) - display(oldest.weight) : null;

  return (
    <Screen
      title="Weight"
      subtitle="Weekly weigh-ins show the real trend"
      showBack
      refreshing={refreshing}
      onRefresh={refresh}
    >
      <Card>
        <View style={styles.summary}>
          <View>
            <Text style={styles.big}>{latest ? formatWeight(latest.weight, units) : '—'}</Text>
            <Text style={styles.muted}>{latest?.bmi ? `BMI ${latest.bmi}` : 'Latest weigh-in'}</Text>
          </View>
          <View style={styles.right}>
            <Text
              style={[
                styles.delta,
                { color: change && change < 0 ? theme.colors.success : theme.colors.textSecondary },
              ]}
            >
              {formatDelta(change)} {units === 'imperial' ? 'lbs' : 'kg'}
            </Text>
            <Text style={styles.muted}>since first entry</Text>
          </View>
        </View>
        <View style={styles.inputRow}>
          <Field
            label="New weigh-in"
            placeholder={units === 'imperial' ? '154' : '70'}
            keyboardType="decimal-pad"
            value={value}
            onChangeText={setValue}
            suffix={units === 'imperial' ? 'lbs' : 'kg'}
            error={formError}
            onSubmitEditing={save}
          />
          <Button label="Save" onPress={save} loading={saving} style={styles.saveBtn} />
        </View>
      </Card>

      {points.length >= 2 && (
        <View style={styles.chart}>
          <LineChart
            data={{
              labels: points.map((p, i) => (i % Math.ceil(points.length / 6) === 0 ? p.date.slice(5) : '')),
              datasets: [{ data: points.map((p) => display(p.weight)) }],
            }}
            width={Math.min(width, 760) - 48}
            height={190}
            chartConfig={{
              backgroundGradientFrom: theme.colors.surface,
              backgroundGradientTo: theme.colors.surfaceSubtle,
              decimalPlaces: 1,
              color: (o = 1) => `rgba(244, 114, 182, ${o})`,
              labelColor: (o = 1) => `rgba(165, 163, 194, ${o})`,
            }}
            bezier
            style={styles.chartInner}
          />
        </View>
      )}

      <SectionHeader title="History" />
      {error && !history ? (
        <EmptyState
          tone="error"
          title="Couldn't load weight history"
          message={error}
          actionLabel="Retry"
          onAction={refresh}
        />
      ) : history?.length === 0 ? (
        <EmptyState
          icon="scale-outline"
          title="No weigh-ins yet"
          message="Weigh yourself at the same time each week (e.g. Monday morning) for consistent data."
        />
      ) : (
        history?.map((log) => (
          <View key={log.id} style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.rowTitle}>{formatWeight(log.weight, units)}</Text>
              <Text style={styles.muted}>
                {formatRelativeDay(log.date)}
                {log.bmi ? ` · BMI ${log.bmi}` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={() => onDelete(log)} hitSlop={10} accessibilityLabel="Delete weigh-in">
              <Ionicons name="trash-outline" size={17} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summary: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  big: { color: theme.colors.text, fontSize: 30, fontWeight: '900' },
  right: { alignItems: 'flex-end' },
  delta: { fontSize: 18, fontWeight: '800' },
  muted: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  saveBtn: { marginTop: 25 },
  chart: { marginBottom: 12, borderRadius: theme.borderRadius.lg, overflow: 'hidden' },
  chartInner: { borderRadius: theme.borderRadius.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorder,
  },
  rowTitle: { color: theme.colors.text, fontWeight: '700' },
});
