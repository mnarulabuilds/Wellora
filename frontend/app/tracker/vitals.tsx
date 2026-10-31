import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';

import { useToast } from '@/components/Toast';
import { Button, Card, EmptyState, Field, Screen, SectionHeader, Segmented, Sheet, StatusPill } from '@/components/ui';
import { GLUCOSE_CONTEXTS, STATUS_COLORS, VITAL_TYPES, theme } from '@/constants/theme';
import { useFocusData } from '@/hooks/useFocusData';
import { deleteVital, fetchLatestVitals, fetchVitals, parseApiError, recordVital } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { formatRelativeDay, formatTime, parsePositive } from '@/lib/format';
import { VitalReading, VitalType } from '@/lib/types';

export default function VitalsScreen() {
  const { showToast } = useToast();
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState<VitalType>('blood_pressure');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [lastResult, setLastResult] = useState<VitalReading | null>(null);

  const { data, userId, refreshing, refresh, reload, error } = useFocusData(async (uid) => {
    const [latest, history] = await Promise.all([fetchLatestVitals(uid), fetchVitals(uid, selected, 30)]);
    return { latest, history };
  });

  useEffect(() => {
    reload();
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const meta = VITAL_TYPES.find((v) => v.value === selected)!;
  const chartPoints = [...(data?.history ?? [])].reverse().slice(-10);

  const onDelete = async (reading: VitalReading) => {
    if (!userId) return;
    if (
      !(await confirmAction({
        title: 'Delete reading?',
        message: `${reading.display_value} ${reading.unit}`,
        confirmText: 'Delete',
        destructive: true,
      }))
    )
      return;
    try {
      await deleteVital(userId, reading.id);
      reload();
    } catch (err) {
      showToast(parseApiError(err), 'error');
    }
  };

  return (
    <Screen
      title="Vitals"
      subtitle="Blood pressure, glucose, heart rate & more"
      showBack
      refreshing={refreshing}
      onRefresh={refresh}
      right={<Button label="Add" icon="add" compact onPress={() => setSheetOpen(true)} />}
    >
      {lastResult && (
        <Card style={{ borderColor: STATUS_COLORS[lastResult.classification.status] }}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>
              {lastResult.label}: {lastResult.display_value} {lastResult.unit}
            </Text>
            <TouchableOpacity onPress={() => setLastResult(null)} accessibilityLabel="Dismiss">
              <Ionicons name="close" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
          <StatusPill status={lastResult.classification.status} label={lastResult.classification.label} />
          <Text style={styles.advice}>{lastResult.classification.advice}</Text>
        </Card>
      )}

      {error && !data ? (
        <EmptyState tone="error" title="Couldn't load vitals" message={error} actionLabel="Retry" onAction={refresh} />
      ) : data && data.latest.length === 0 ? (
        <EmptyState
          icon="pulse-outline"
          title="No readings yet"
          message="Log your blood pressure, sugar or heart rate to see trends and healthy-range checks."
          actionLabel="Add first reading"
          onAction={() => setSheetOpen(true)}
        />
      ) : (
        <View style={styles.grid}>
          {data?.latest.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={styles.tile}
              onPress={() => setSelected(r.vital_type)}
              accessibilityLabel={`${r.label} ${r.display_value} ${r.unit}, ${r.classification.label}`}
            >
              <Text style={styles.tileLabel}>{r.label}</Text>
              <Text style={styles.tileValue}>
                {r.display_value} <Text style={styles.tileUnit}>{r.unit}</Text>
              </Text>
              <StatusPill status={r.classification.status} label={r.classification.label} />
              <Text style={styles.tileTime}>{formatRelativeDay(r.measured_at)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <SectionHeader title="History" />
      <Segmented
        options={VITAL_TYPES.map((v) => ({ value: v.value, label: v.short }))}
        value={selected}
        onChange={setSelected}
        color={theme.colors.vitals}
      />

      {chartPoints.length >= 2 && (
        <View style={styles.chart}>
          <LineChart
            data={{
              labels: chartPoints.map(() => ''),
              datasets: [
                { data: chartPoints.map((p) => p.value), color: () => theme.colors.vitals },
                ...(selected === 'blood_pressure'
                  ? [{ data: chartPoints.map((p) => p.value_secondary ?? 0), color: () => theme.colors.accent }]
                  : []),
              ],
              legend: selected === 'blood_pressure' ? ['Systolic', 'Diastolic'] : [meta.label],
            }}
            width={Math.min(width, 760) - 48}
            height={180}
            chartConfig={{
              backgroundGradientFrom: theme.colors.surface,
              backgroundGradientTo: theme.colors.surfaceSubtle,
              decimalPlaces: selected === 'temperature' ? 1 : 0,
              color: (o = 1) => `rgba(248, 113, 113, ${o})`,
              labelColor: (o = 1) => `rgba(165, 163, 194, ${o})`,
            }}
            bezier
            style={styles.chartInner}
          />
        </View>
      )}

      {data && data.history.length === 0 ? (
        <Text style={styles.muted}>No {meta.label.toLowerCase()} readings yet.</Text>
      ) : (
        data?.history.map((r) => (
          <View key={r.id} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: STATUS_COLORS[r.classification.status] }]} />
            <View style={styles.flex}>
              <Text style={styles.rowValue}>
                {r.display_value} {r.unit}
                {r.context ? <Text style={styles.muted}> · {r.context.replace('_', ' ')}</Text> : null}
              </Text>
              <Text style={styles.muted}>
                {formatRelativeDay(r.measured_at)} {formatTime(r.measured_at)} · {r.classification.label}
              </Text>
            </View>
            <TouchableOpacity onPress={() => onDelete(r)} hitSlop={10} accessibilityLabel="Delete reading">
              <Ionicons name="trash-outline" size={17} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        ))
      )}

      <Text style={styles.disclaimer}>
        Ranges are general adult guidelines, not a diagnosis. Talk to your doctor about readings that concern you.
      </Text>

      <AddVitalSheet
        visible={sheetOpen}
        initialType={selected}
        userId={userId}
        onClose={() => setSheetOpen(false)}
        onSaved={(reading) => {
          setSheetOpen(false);
          setLastResult(reading);
          setSelected(reading.vital_type);
          const critical = reading.classification.status === 'critical';
          showToast(`${reading.label} saved — ${reading.classification.label}`, critical ? 'error' : 'success');
          reload();
        }}
      />
    </Screen>
  );
}

function AddVitalSheet({
  visible,
  initialType,
  userId,
  onClose,
  onSaved,
}: {
  visible: boolean;
  initialType: VitalType;
  userId: string | null;
  onClose: () => void;
  onSaved: (reading: VitalReading) => void;
}) {
  const [type, setType] = useState<VitalType>(initialType);
  const [value, setValue] = useState('');
  const [secondary, setSecondary] = useState('');
  const [context, setContext] = useState<string>('fasting');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setType(initialType);
      setValue('');
      setSecondary('');
      setNotes('');
      setError(null);
    }
  }, [visible, initialType]);

  const meta = VITAL_TYPES.find((v) => v.value === type)!;
  const isBP = type === 'blood_pressure';

  const save = async () => {
    if (!userId) return;
    const primary = parsePositive(value);
    const dia = parsePositive(secondary);
    if (primary === null || (isBP && dia === null)) {
      setError(isBP ? 'Enter both systolic and diastolic values.' : 'Enter a valid reading.');
      return;
    }
    setSaving(true);
    try {
      const res = await recordVital(userId, {
        vital_type: type,
        value: primary,
        value_secondary: isBP ? dia! : undefined,
        context: type === 'blood_glucose' ? context : undefined,
        notes: notes.trim(),
      });
      onSaved(res.reading);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      title="New reading"
      onClose={onClose}
      footer={<Button label="Save reading" icon="checkmark" onPress={save} loading={saving} style={styles.flex} />}
    >
      <Segmented
        options={VITAL_TYPES.map((v) => ({ value: v.value, label: v.label }))}
        value={type}
        onChange={(t) => {
          setType(t);
          setError(null);
        }}
        color={theme.colors.vitals}
      />
      <View style={styles.twoCol}>
        <Field
          label={isBP ? 'Systolic (top)' : meta.label}
          placeholder={meta.placeholder}
          keyboardType="decimal-pad"
          value={value}
          onChangeText={setValue}
          suffix={meta.unit}
        />
        {isBP && (
          <Field
            label="Diastolic (bottom)"
            placeholder="80"
            keyboardType="decimal-pad"
            value={secondary}
            onChangeText={setSecondary}
            suffix="mmHg"
          />
        )}
      </View>
      {type === 'blood_glucose' && (
        <>
          <Text style={styles.label}>When was this measured?</Text>
          <Segmented options={GLUCOSE_CONTEXTS} value={context} onChange={setContext} color={theme.colors.vitals} />
        </>
      )}
      <Field
        label="Notes (optional)"
        placeholder="e.g. after morning walk"
        value={notes}
        onChangeText={setNotes}
        maxLength={300}
        error={error}
      />
      {isBP && (
        <Text style={styles.muted}>
          Tip: sit quietly for 5 minutes with your arm supported at heart level before measuring.
        </Text>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 6 },
  tile: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    padding: 14,
    gap: 6,
  },
  tileLabel: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' },
  tileValue: { color: theme.colors.text, fontSize: 24, fontWeight: '900' },
  tileUnit: { fontSize: 13, color: theme.colors.textMuted, fontWeight: '600' },
  tileTime: { color: theme.colors.textMuted, fontSize: 11 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  resultTitle: { color: theme.colors.text, fontWeight: '800', fontSize: 15 },
  advice: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 8, lineHeight: 19 },
  chart: { marginBottom: 12, borderRadius: theme.borderRadius.lg, overflow: 'hidden' },
  chartInner: { borderRadius: theme.borderRadius.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorder,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowValue: { color: theme.colors.text, fontWeight: '700', fontSize: 15 },
  muted: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2, fontWeight: '500' },
  disclaimer: { color: theme.colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 18 },
  twoCol: { flexDirection: 'row', gap: 10 },
  label: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 },
});
