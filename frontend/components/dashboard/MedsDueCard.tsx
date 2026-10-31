import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { StatusPill } from '@/components/ui';
import { theme } from '@/constants/theme';
import { formatClock } from '@/lib/format';
import { MedicationSchedule, ScheduledDose } from '@/lib/types';

interface Props {
  schedule: MedicationSchedule;
  onToggle: (dose: ScheduledDose) => void;
  onOpen: () => void;
}

/** Shows doses needing attention now (due/overdue) or the next upcoming one. */
export function MedsDueCard({ schedule, onToggle, onOpen }: Props) {
  if (!schedule.total) return null;
  const attention = schedule.doses.filter((d) => d.status === 'due' || d.status === 'overdue');
  const upcoming = schedule.doses.find((d) => d.status === 'upcoming');
  const shown = attention.length ? attention.slice(0, 3) : upcoming ? [upcoming] : [];

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.header} onPress={onOpen} accessibilityRole="button">
        <Ionicons name="medkit" size={18} color={theme.colors.meds} />
        <Text style={styles.title}>Medications</Text>
        <Text style={styles.count}>
          {schedule.taken}/{schedule.total} taken
        </Text>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
      </TouchableOpacity>
      {shown.length === 0 ? (
        <Text style={styles.done}>✅ All doses for today are done.</Text>
      ) : (
        shown.map((dose) => (
          <View key={`${dose.medication_id}-${dose.scheduled_time}`} style={styles.dose}>
            <View style={styles.flex}>
              <Text style={styles.name}>
                {dose.name} {dose.dosage ? <Text style={styles.dosage}>· {dose.dosage}</Text> : null}
              </Text>
              <Text style={styles.time}>{formatClock(dose.scheduled_time)}</Text>
            </View>
            <StatusPill status={dose.status} />
            <TouchableOpacity
              style={styles.take}
              onPress={() => onToggle(dose)}
              accessibilityLabel={`Mark ${dose.name} at ${dose.scheduled_time} as taken`}
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: `${theme.colors.meds}55`,
    padding: 14,
    marginBottom: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  title: { color: theme.colors.text, fontWeight: '800', fontSize: 15, flex: 1 },
  count: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
  done: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 4 },
  dose: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  flex: { flex: 1 },
  name: { color: theme.colors.text, fontWeight: '700', fontSize: 14 },
  dosage: { color: theme.colors.textSecondary, fontWeight: '500' },
  time: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  take: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
