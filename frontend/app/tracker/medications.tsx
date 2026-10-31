import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useToast } from '@/components/Toast';
import { Button, Card, EmptyState, Field, Screen, SectionHeader, Sheet, StatusPill } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useFocusData } from '@/hooks/useFocusData';
import {
  createMedication,
  deleteMedication,
  fetchAdherence,
  fetchMedicationSchedule,
  fetchMedications,
  MedicationInput,
  parseApiError,
  toggleDose,
  updateMedication,
} from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { formatClock, normaliseTime } from '@/lib/format';
import { remindersSupported, syncMedicationReminders } from '@/lib/notifications';
import { Medication, ScheduledDose } from '@/lib/types';

const TIME_PRESETS = [
  { label: 'Morning', time: '08:00' },
  { label: 'Afternoon', time: '14:00' },
  { label: 'Evening', time: '19:00' },
  { label: 'Bedtime', time: '22:00' },
];
const INSTRUCTION_PRESETS = ['Before food', 'After food', 'With water', 'Empty stomach'];

async function load(userId: string) {
  const [schedule, medications, adherence] = await Promise.all([
    fetchMedicationSchedule(userId),
    fetchMedications(userId),
    fetchAdherence(userId, 7),
  ]);
  return { schedule, medications, adherence };
}

export default function MedicationsScreen() {
  const { showToast } = useToast();
  const { data, userId, refreshing, refresh, reload, error } = useFocusData(load);
  const [editing, setEditing] = useState<Medication | 'new' | null>(null);

  // Keep device reminders in sync with the medication list (native only).
  useEffect(() => {
    if (data?.medications) syncMedicationReminders(data.medications).catch(() => undefined);
  }, [data?.medications]);

  const onToggle = async (dose: ScheduledDose) => {
    if (!userId) return;
    try {
      const res = await toggleDose(userId, dose.medication_id, dose.scheduled_time);
      showToast(res.taken ? `${dose.name} taken ✓` : `${dose.name} unmarked`, res.taken ? 'success' : 'info');
      reload();
    } catch (err) {
      showToast(parseApiError(err), 'error');
    }
  };

  const onDelete = async (med: Medication) => {
    if (!userId) return;
    const ok = await confirmAction({
      title: `Delete ${med.name}?`,
      message: 'Its reminders and dose history will be removed.',
      confirmText: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteMedication(userId, med.id);
      showToast(`${med.name} deleted`, 'info');
      setEditing(null);
      reload();
    } catch (err) {
      showToast(parseApiError(err), 'error');
    }
  };

  const schedule = data?.schedule;
  const adherence = data?.adherence.adherence;

  return (
    <Screen
      title="Medications"
      subtitle={
        remindersSupported ? 'Daily reminders are on for every dose' : 'Doses due now appear on your Home screen'
      }
      showBack
      refreshing={refreshing}
      onRefresh={refresh}
      right={<Button label="Add" icon="add" compact onPress={() => setEditing('new')} />}
    >
      {error && !data ? (
        <EmptyState
          tone="error"
          title="Couldn't load medications"
          message={error}
          actionLabel="Retry"
          onAction={refresh}
        />
      ) : data && data.medications.length === 0 ? (
        <EmptyState
          icon="medkit-outline"
          title="No medications yet"
          message="Add your medicines or supplements to get reminders and track every dose."
          actionLabel="Add medication"
          onAction={() => setEditing('new')}
        />
      ) : (
        schedule && (
          <>
            <View style={styles.stats}>
              <Card style={styles.stat}>
                <Text style={styles.statValue}>
                  {schedule.taken}/{schedule.total}
                </Text>
                <Text style={styles.statLabel}>Doses today</Text>
              </Card>
              <Card style={styles.stat}>
                <Text style={[styles.statValue, { color: adherenceColor(adherence) }]}>
                  {adherence == null ? '—' : `${Math.round(adherence)}%`}
                </Text>
                <Text style={styles.statLabel}>7-day adherence</Text>
              </Card>
            </View>

            <SectionHeader title="Today's schedule" />
            {schedule.doses.map((dose) => (
              <TouchableOpacity
                key={`${dose.medication_id}-${dose.scheduled_time}`}
                style={[styles.dose, dose.taken && styles.doseTaken]}
                onPress={() => onToggle(dose)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: dose.taken }}
                accessibilityLabel={`${dose.name} at ${formatClock(dose.scheduled_time)}, ${dose.status}`}
              >
                <Ionicons
                  name={dose.taken ? 'checkmark-circle' : 'ellipse-outline'}
                  size={26}
                  color={dose.taken ? theme.colors.success : theme.colors.textMuted}
                />
                <View style={styles.flex}>
                  <Text style={styles.doseName}>
                    {dose.name}
                    {dose.dosage ? <Text style={styles.muted}> · {dose.dosage}</Text> : null}
                  </Text>
                  <Text style={styles.muted}>
                    {formatClock(dose.scheduled_time)}
                    {dose.instructions ? ` · ${dose.instructions}` : ''}
                  </Text>
                </View>
                <StatusPill status={dose.status} />
              </TouchableOpacity>
            ))}

            <SectionHeader title="Your medications" />
            {data!.medications.map((med) => (
              <TouchableOpacity
                key={med.id}
                style={styles.med}
                onPress={() => setEditing(med)}
                accessibilityLabel={`Edit ${med.name}`}
              >
                <View style={styles.medIcon}>
                  <Ionicons name="medical" size={18} color={theme.colors.meds} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.doseName}>{med.name}</Text>
                  <Text style={styles.muted}>
                    {[med.dosage, med.times.map(formatClock).join(', ')].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Ionicons name="create-outline" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
            ))}
            <Text style={styles.disclaimer}>
              Wellora helps you remember — it does not replace advice from your doctor or pharmacist.
            </Text>
          </>
        )
      )}

      <MedicationSheet
        medication={editing}
        userId={userId}
        onClose={() => setEditing(null)}
        onDelete={onDelete}
        onSaved={(msg) => {
          setEditing(null);
          showToast(msg, 'success');
          reload();
        }}
      />
    </Screen>
  );
}

function adherenceColor(value: number | null | undefined) {
  if (value == null) return theme.colors.text;
  if (value >= 90) return theme.colors.success;
  if (value >= 70) return theme.colors.warning;
  return theme.colors.error;
}

function MedicationSheet({
  medication,
  userId,
  onClose,
  onSaved,
  onDelete,
}: {
  medication: Medication | 'new' | null;
  userId: string | null;
  onClose: () => void;
  onSaved: (message: string) => void;
  onDelete: (med: Medication) => void;
}) {
  const existing = medication && medication !== 'new' ? medication : null;
  const [form, setForm] = useState<MedicationInput>({ name: '', dosage: '', times: ['08:00'], instructions: '' });
  const [timeInput, setTimeInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!medication) return;
    setForm(
      existing
        ? { name: existing.name, dosage: existing.dosage, times: existing.times, instructions: existing.instructions }
        : { name: '', dosage: '', times: ['08:00'], instructions: '' }
    );
    setTimeInput('');
    setError(null);
  }, [medication]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!medication) return null;

  const toggleTime = (time: string) =>
    setForm((f) => ({
      ...f,
      times: f.times.includes(time) ? f.times.filter((t) => t !== time) : [...f.times, time].sort(),
    }));

  const addCustomTime = () => {
    const time = normaliseTime(timeInput);
    if (!time) {
      setError('Enter a time like 07:30 or 21:00.');
      return;
    }
    setError(null);
    if (!form.times.includes(time)) toggleTime(time);
    setTimeInput('');
  };

  const save = async () => {
    if (!userId) return;
    if (!form.name.trim()) return setError('Medication name is required.');
    if (!form.times.length) return setError('Pick at least one reminder time.');
    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        dosage: form.dosage.trim(),
        instructions: form.instructions.trim(),
      };
      if (existing) {
        await updateMedication(userId, existing.id, payload);
        onSaved(`${payload.name} updated`);
      } else {
        await createMedication(userId, payload);
        onSaved(`${payload.name} added — reminders set`);
      }
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible
      title={existing ? `Edit ${existing.name}` : 'Add medication'}
      onClose={onClose}
      footer={
        <>
          {existing && (
            <Button label="Delete" variant="danger" icon="trash-outline" onPress={() => onDelete(existing)} />
          )}
          <Button label="Save" icon="checkmark" onPress={save} loading={saving} style={styles.flex} />
        </>
      }
    >
      <Field
        label="Name"
        placeholder="e.g. Metformin, Vitamin D3"
        value={form.name}
        onChangeText={(name) => setForm((f) => ({ ...f, name }))}
        maxLength={100}
      />
      <Field
        label="Dosage (optional)"
        placeholder="e.g. 500 mg, 1 tablet"
        value={form.dosage}
        onChangeText={(dosage) => setForm((f) => ({ ...f, dosage }))}
        maxLength={60}
      />

      <Text style={styles.label}>Reminder times</Text>
      <View style={styles.chips}>
        {TIME_PRESETS.map((p) => (
          <Chip
            key={p.time}
            label={`${p.label} ${formatClock(p.time)}`}
            active={form.times.includes(p.time)}
            onPress={() => toggleTime(p.time)}
          />
        ))}
        {form.times
          .filter((t) => !TIME_PRESETS.some((p) => p.time === t))
          .map((t) => (
            <Chip key={t} label={`${formatClock(t)} ✕`} active onPress={() => toggleTime(t)} />
          ))}
      </View>
      <View style={styles.row}>
        <Field
          label="Custom time"
          placeholder="HH:MM"
          value={timeInput}
          onChangeText={setTimeInput}
          onSubmitEditing={addCustomTime}
          maxLength={5}
        />
        <Button label="Add time" variant="secondary" compact onPress={addCustomTime} style={styles.addTime} />
      </View>

      <Text style={styles.label}>Instructions</Text>
      <View style={styles.chips}>
        {INSTRUCTION_PRESETS.map((p) => (
          <Chip
            key={p}
            label={p}
            active={form.instructions === p}
            onPress={() => setForm((f) => ({ ...f, instructions: f.instructions === p ? '' : p }))}
          />
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Sheet>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: theme.colors.text, fontSize: 26, fontWeight: '900' },
  statLabel: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  dose: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    padding: 14,
    marginBottom: 8,
  },
  doseTaken: { opacity: 0.7 },
  doseName: { color: theme.colors.text, fontWeight: '700', fontSize: 15 },
  muted: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2, fontWeight: '500' },
  med: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  medIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${theme.colors.meds}22`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimer: { color: theme.colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 12 },
  label: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    backgroundColor: theme.colors.surface,
  },
  chipActive: { backgroundColor: theme.colors.meds, borderColor: theme.colors.meds },
  chipText: { color: theme.colors.textSecondary, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#1a1300' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  addTime: { marginTop: 26 },
  error: { color: theme.colors.error, fontWeight: '600', marginBottom: 8 },
});
