import { queueOfflineAction } from '../storage';
import { ActivityLogEntry, ActivityType, DailySummary, Streak, WeeklyHistory } from '../types';
import { localISODate, localISODateTime } from '../format';
import { apiClient, isNetworkError, q } from './client';

export interface LoggedResult {
  message: string;
  log: ActivityLogEntry;
}

export async function logActivity(
  userId: string,
  activityType: ActivityType,
  details: string,
  value: number,
  metadata?: Record<string, unknown>
): Promise<LoggedResult> {
  // Send the device's local time so "today" matches the user's day even if the server runs in another timezone.
  const payload = {
    user_id: userId,
    activity_type: activityType,
    details,
    value,
    timestamp: localISODateTime(),
    metadata: metadata || {},
  };
  try {
    const res = await apiClient.post('/log_activity', payload);
    return res.data;
  } catch (err) {
    // Only network failures are worth retrying later; validation errors would fail forever.
    if (isNetworkError(err)) {
      await queueOfflineAction('log_activity', payload);
    }
    throw err;
  }
}

export async function fetchDailySummary(userId: string, date?: string): Promise<DailySummary> {
  const res = await apiClient.get(`/daily_summary?${q({ user_id: userId, date: date ?? localISODate() })}`);
  return res.data;
}

export async function fetchActivityHistory(userId: string): Promise<WeeklyHistory> {
  const res = await apiClient.get(`/activity_history?${q({ user_id: userId })}`);
  return res.data;
}

export async function fetchActivityLogs(userId: string, activityType?: ActivityType, limit = 50) {
  const res = await apiClient.get(`/activity_logs?${q({ user_id: userId, activity_type: activityType, limit })}`);
  return (res.data.logs || []) as ActivityLogEntry[];
}

export async function deleteActivityLog(userId: string, logId: number): Promise<void> {
  await apiClient.delete(`/activity_logs/${logId}?${q({ user_id: userId })}`);
}

export async function fetchStreaks(userId: string): Promise<Streak> {
  const res = await apiClient.get(`/streaks?${q({ user_id: userId })}`);
  return res.data;
}
