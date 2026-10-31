import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { RecoveryCard } from '@/components/dashboard/RecoveryCard';
import { useToast } from '@/components/Toast';
import { Button, Card, EmptyState, Field, Screen, SectionHeader } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useFocusData } from '@/hooks/useFocusData';
import { deleteSleepLog, fetchRecovery, fetchSleepLogs, logSleep, parseApiError } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { formatRelativeDay, normaliseTime, parsePositive } from '@/lib/format';
import { SleepLog } from '@/lib/types';

const QUALITY = ['😫', '😕', '😐', '🙂', '😴'];
const HOUR_PRESETS = [5, 6, 6.5, 7, 7.5, 8, 9];

async function load(userId: string) {
  const [logs, recovery] = await Promise.all([fetchSleepLogs(userId, 14), fetchRecovery(userId)]);
  return { logs, recovery };
}

export default function SleepScreen() {
  const { showToast } = useToast();
  const { data, userId, refreshing, refresh, reload, error } = useFocusData(load);
  const [hours, setHours] = useState('7.5');
  const [quality, setQuality] = useState(4);
  const [bedTime, setBedTime] = useState('');
  const [wakeTime, setWakeTime] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!userId) return;
    const h = parsePositive(hours);
    if (h === null || h > 24) return setFormError('Hours must be between 0.5 and 24.');
    const bed = bedTime ? normaliseTime(bedTime) : undefined;
    const wake = wakeTime ? normaliseTime(wakeTime) : undefined;
    if (bed === null || wake === null) return setFormError('Times must look like 23:00.');
    setFormError(null);
    setSaving(true);
    try {
      const res = await logSleep(userId, { hours: h, quality, bed_time: bed, wake_time: wake });
      showToast(res.message, 'success');
      reload();
    } catch (err) {
      setFormError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (log: SleepLog) => {
    if (
      !userId ||
      !(await confirmAction({
        title: 'Delete sleep entry?',
        message: `${log.hours}h on ${log.date}`,
        confirmText: 'Delete',
        destructive: true,
      }))
    )
      return;
    try {
      await deleteSleepLog(userId, log.id);
      reload();
    } catch (err) {
      showToast(parseApiError(err), 'error');
    }
  };

  const avg = data?.logs.length ? data.logs.reduce((s, l) => s + l.hours, 0) / data.logs.length : null;

  return (
    <Screen
      title="Sleep"
      subtitle="Log last night to update your recovery score"
      showBack
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {data?.recovery && <RecoveryCard recovery={data.recovery} onPress={refresh} />}

      <Card>
        <Text style={styles.label}>How long did you sleep?</Text>
        <View style={styles.chips}>
          {HOUR_PRESETS.map((h) => (
            <TouchableOpacity
              key={h}
              style={[styles.chip, parseFloat(hours) === h && styles.chipActive]}
              onPress={() => setHours(String(h))}
            >
              <Text style={[styles.chipText, parseFloat(hours) === h && styles.chipTextActive]}>{h}h</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Field label="Hours" keyboardType="decimal-pad" value={hours} onChangeText={setHours} suffix="h" />
        <Text style={styles.label}>Sleep quality</Text>
        <View style={styles.quality}>
          {QUALITY.map((emoji, i) => (
            <TouchableOpacity
              key={emoji}
              onPress={() => setQuality(i + 1)}
              style={[styles.qualityBtn, quality === i + 1 && styles.qualityActive]}
              accessibilityRole="radio"
              accessibilityState={{ selected: quality === i + 1 }}
              accessibilityLabel={`Quality ${i + 1} of 5`}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.twoCol}>
          <Field
            label="Bedtime (optional)"
            placeholder="23:00"
            value={bedTime}
            onChangeText={setBedTime}
            maxLength={5}
          />
          <Field
            label="Wake time (optional)"
            placeholder="06:30"
            value={wakeTime}
            onChangeText={setWakeTime}
            maxLength={5}
          />
        </View>
        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        <Button label="Save sleep" icon="moon" onPress={save} loading={saving} />
      </Card>

      <SectionHeader title="Last 2 weeks" meta={avg ? `avg ${avg.toFixed(1)}h` : undefined} />
      {error && !data ? (
        <EmptyState
          tone="error"
          title="Couldn't load sleep history"
          message={error}
          actionLabel="Retry"
          onAction={refresh}
        />
      ) : data?.logs.length === 0 ? (
        <EmptyState
          icon="moon-outline"
          title="No sleep logged yet"
          message="Adults need 7-9 hours. Start tracking tonight."
        />
      ) : (
        data?.logs.map((log) => (
          <View key={log.id} style={styles.row}>
            <Text style={styles.emoji}>{QUALITY[log.quality - 1]}</Text>
            <View style={styles.flex}>
              <Text style={styles.rowTitle}>{log.hours}h sleep</Text>
              <Text style={styles.muted}>
                {formatRelativeDay(log.date)}
                {log.bed_time ? ` · ${log.bed_time}–${log.wake_time ?? '?'}` : ''}
              </Text>
            </View>
            <View
              style={[
                styles.bar,
                {
                  width: Math.min(log.hours / 9, 1) * 80,
                  backgroundColor: log.hours >= 7 ? theme.colors.success : theme.colors.warning,
                },
              ]}
            />
            <TouchableOpacity onPress={() => onDelete(log)} hitSlop={10} accessibilityLabel="Delete sleep entry">
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
  label: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: theme.colors.surfaceSubtle },
  chipActive: { backgroundColor: theme.colors.sleep },
  chipText: { color: theme.colors.textSecondary, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  quality: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  qualityBtn: { padding: 8, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  qualityActive: { borderColor: theme.colors.sleep, backgroundColor: `${theme.colors.sleep}22` },
  emoji: { fontSize: 26 },
  twoCol: { flexDirection: 'row', gap: 10 },
  error: { color: theme.colors.error, fontWeight: '600', marginBottom: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorder,
  },
  rowTitle: { color: theme.colors.text, fontWeight: '700' },
  muted: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  bar: { height: 6, borderRadius: 3 },
});
