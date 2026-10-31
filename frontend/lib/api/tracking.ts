import { HabitsStatus, RecoveryScore, SleepLog, WeightLog } from '../types';
import { localISODate } from '../format';
import { apiClient, q } from './client';

// ----- Sleep -----
export interface SleepInput {
  hours: number;
  quality: number;
  deep_sleep_hours?: number;
  bed_time?: string;
  wake_time?: string;
  notes?: string;
  date?: string;
}

export async function logSleep(userId: string, input: SleepInput) {
  const res = await apiClient.post('/sleep/log', { user_id: userId, date: localISODate(), ...input });
  return res.data as { message: string; log: SleepLog };
}

export async function fetchSleepLogs(userId: string, limit = 14): Promise<SleepLog[]> {
  const res = await apiClient.get(`/sleep/logs?${q({ user_id: userId, limit })}`);
  return res.data.logs;
}

export async function deleteSleepLog(userId: string, id: number) {
  await apiClient.delete(`/sleep/${id}?${q({ user_id: userId })}`);
}

export async function fetchRecovery(userId: string): Promise<RecoveryScore> {
  const res = await apiClient.get(`/recovery/score?${q({ user_id: userId, date: localISODate() })}`);
  return res.data;
}

// ----- Habits -----
export async function fetchHabitsStatus(userId: string, date?: string): Promise<HabitsStatus> {
  const res = await apiClient.get(`/habits/daily?${q({ user_id: userId, date: date ?? localISODate() })}`);
  return res.data.data;
}

export async function toggleHabit(userId: string, habitId: number, date?: string) {
  const res = await apiClient.post('/habits/toggle', {
    user_id: userId,
    habit_id: habitId,
    date: date ?? localISODate(),
  });
  return res.data.data as { habit_id: number; completed: boolean };
}

export async function createHabit(userId: string, title: string, category: string) {
  const res = await apiClient.post('/habits', { user_id: userId, title, category });
  return res.data.habit;
}

export async function archiveHabit(userId: string, habitId: number) {
  await apiClient.delete(`/habits/${habitId}?${q({ user_id: userId })}`);
}

// ----- Weight -----
export async function logWeight(userId: string, weightKg: number, notes = '') {
  const res = await apiClient.post('/weight/log', { user_id: userId, weight: weightKg, notes, date: localISODate() });
  return res.data as { message: string; log: WeightLog };
}

export async function fetchWeightHistory(userId: string, limit = 60): Promise<WeightLog[]> {
  const res = await apiClient.get(`/weight/history?${q({ user_id: userId, limit })}`);
  return res.data.history;
}

export async function deleteWeightLog(userId: string, id: number) {
  await apiClient.delete(`/weight/${id}?${q({ user_id: userId })}`);
}
