import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { Medication } from './types';

/**
 * Daily local reminders for each medication time. Native only — web has no
 * reliable background notifications, so there we rely on the in-app "due now" cards.
 */
export const remindersSupported = Platform.OS !== 'web';

if (remindersSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!remindersSupported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Replace all scheduled reminders with one daily reminder per active medication time. */
export async function syncMedicationReminders(medications: Medication[]): Promise<number> {
  if (!remindersSupported) return 0;
  if (!(await ensureNotificationPermission())) return 0;
  await Notifications.cancelAllScheduledNotificationsAsync();
  let count = 0;
  for (const med of medications.filter((m) => m.is_active)) {
    for (const time of med.times) {
      const [hour, minute] = time.split(':').map(Number);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `💊 Time for ${med.name}`,
          body: [med.dosage, med.instructions].filter(Boolean).join(' · ') || 'Tap to mark it as taken.',
          data: { medicationId: med.id, time },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
      });
      count++;
    }
  }
  return count;
}
