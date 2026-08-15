import axios, { AxiosError } from 'axios';
import {
  ActivityLogEntry,
  DailySummary,
  HealthReport,
  HealthScore,
  UserProfile,
  WeeklyHistory,
} from './types';
import { getOfflineQueue, queueOfflineAction, removeOfflineAction } from './storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

export function parseApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; detail?: string | string[] | { msg: string }[] }>;
    const data = axiosError.response?.data;
    if (data?.message && typeof data.message === 'string') return data.message;
    if (typeof data?.detail === 'string') return data.detail;
    if (Array.isArray(data?.detail)) {
      return data.detail
        .map((d) => (typeof d === 'string' ? d : d.msg || JSON.stringify(d)))
        .join(', ');
    }
    if (axiosError.message === 'Network Error' || axiosError.code === 'ERR_NETWORK') {
      return 'Unable to reach Wellora server. Check your network or local server.';
    }
    if (axiosError.code === 'ECONNABORTED') {
      return 'Request timed out. Please try again.';
    }
    return axiosError.message || 'An unexpected server error occurred.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await apiClient.get('/health');
    return res.data?.status === 'healthy';
  } catch {
    return false;
  }
}

export async function syncProfileToBackend(profile: Partial<UserProfile>): Promise<void> {
  if (!profile.userId) return;
  try {
    await apiClient.post('/users/profile', {
      user_id: profile.userId,
      name: profile.name || '',
      age: parseInt(profile.age || '0', 10),
      weight: parseFloat(profile.weight || '0'),
      height: parseFloat(profile.height || '0'),
      gender: profile.gender || 'male',
      activity_level: profile.activityLevel || 'light',
      dietary_preferences: profile.dietaryPreferences || [],
      health_goals: profile.healthGoals && profile.healthGoals.length > 0 ? profile.healthGoals : ['maintenance'],
      target_calories: parseFloat(profile.targetCalories || '2000'),
      target_steps: parseInt(profile.targetSteps || '10000', 10),
      target_water: parseFloat(profile.targetWater || '2.5'),
      target_workout_minutes: parseInt(profile.targetWorkoutMinutes || '30', 10),
    });
  } catch (err) {
    // Queue offline action if network error
    await queueOfflineAction('save_profile', { profile });
    throw err;
  }
}

export async function fetchProfileFromBackend(userId: string): Promise<Partial<UserProfile> | null> {
  try {
    const res = await apiClient.get(`/users/profile?user_id=${encodeURIComponent(userId)}`);
    const p = res.data;
    if (!p) return null;
    return {
      userId: p.user_id,
      name: p.name,
      age: String(p.age ?? ''),
      weight: String(p.weight ?? ''),
      height: String(p.height ?? ''),
      gender: p.gender ?? 'male',
      activityLevel: p.activity_level ?? 'light',
      dietaryPreferences: p.dietary_preferences ?? [],
      healthGoals: p.health_goals ?? ['maintenance'],
      targetCalories: String(p.target_calories ?? '2000'),
      targetSteps: String(p.target_steps ?? '10000'),
      targetWater: String(p.target_water ?? '2.5'),
      targetWorkoutMinutes: String(p.target_workout_minutes ?? '30'),
    };
  } catch {
    return null;
  }
}

export async function calculateHealthScore(
  userId: string,
  age?: string,
  weight?: string,
  height?: string
): Promise<HealthScore> {
  const res = await apiClient.post('/calculate_health_score', {
    user_id: userId,
    age: age && !isNaN(parseInt(age, 10)) ? parseInt(age, 10) : null,
    weight: weight && !isNaN(parseFloat(weight)) ? parseFloat(weight) : null,
    height: height && !isNaN(parseFloat(height)) ? parseFloat(height) : null,
  });
  return res.data;
}

export async function fetchActivityHistory(userId: string): Promise<WeeklyHistory> {
  const res = await apiClient.get(`/activity_history?user_id=${encodeURIComponent(userId)}`);
  return res.data;
}

export async function fetchDailySummary(userId: string, date?: string): Promise<DailySummary> {
  const params = new URLSearchParams({ user_id: userId });
  if (date) params.append('date', date);
  const res = await apiClient.get(`/daily_summary?${params}`);
  return res.data;
}

export async function logActivity(
  userId: string,
  activityType: 'meal' | 'workout' | 'water',
  details: string,
  value: number,
  metadata?: Record<string, unknown>
): Promise<{ message: string; log: ActivityLogEntry }> {
  try {
    const res = await apiClient.post('/log_activity', {
      user_id: userId,
      activity_type: activityType,
      details,
      value,
      metadata: metadata || {},
    });
    return res.data;
  } catch (err) {
    await queueOfflineAction('log_activity', { userId, activityType, details, value, metadata });
    throw err;
  }
}

export async function fetchActivityLogs(
  userId: string,
  activityType?: string,
  limit = 50
): Promise<ActivityLogEntry[]> {
  const params = new URLSearchParams({ user_id: userId, limit: String(limit) });
  if (activityType) params.append('activity_type', activityType);
  const res = await apiClient.get(`/activity_logs?${params}`);
  return res.data.logs || [];
}

export async function deleteActivityLog(userId: string, logId: number): Promise<void> {
  await apiClient.delete(`/activity_logs/${logId}?user_id=${encodeURIComponent(userId)}`);
}

export async function generateReport(profile: Partial<UserProfile>): Promise<HealthReport> {
  const res = await apiClient.post('/generate_report', {
    age: parseInt(profile.age || '25', 10),
    weight: parseFloat(profile.weight || '70'),
    height: parseFloat(profile.height || '175'),
    gender: profile.gender || 'male',
    activity_level: profile.activityLevel || 'light',
    dietary_preferences: profile.dietaryPreferences || [],
    health_goals: profile.healthGoals && profile.healthGoals.length > 0 ? profile.healthGoals : ['maintenance'],
  });
  return res.data;
}

export async function analyzeQuery(
  userId: string,
  text: string
): Promise<{ intent: string; response: string; entities: unknown[] }> {
  const res = await apiClient.post('/analyze_query', { text, user_id: userId });
  return res.data;
}

export async function fetchStreaks(
  userId: string
): Promise<{ current_streak: number; longest_streak: number; total_active_days?: number }> {
  const res = await apiClient.get(`/streaks?user_id=${encodeURIComponent(userId)}`);
  return res.data;
}

export async function drainOfflineQueue(): Promise<number> {
  const queue = await getOfflineQueue();
  if (queue.length === 0) return 0;

  let processedCount = 0;
  for (const item of queue) {
    try {
      if (item.type === 'log_activity') {
        const { userId, activityType, details, value, metadata } = item.payload as any;
        await apiClient.post('/log_activity', {
          user_id: userId,
          activity_type: activityType,
          details,
          value,
          metadata: metadata || {},
        });
        await removeOfflineAction(item.id);
        processedCount++;
      } else if (item.type === 'save_profile') {
        const { profile } = item.payload as any;
        await apiClient.post('/users/profile', {
          user_id: profile.userId,
          name: profile.name || '',
          age: parseInt(profile.age || '0', 10),
          weight: parseFloat(profile.weight || '0'),
          height: parseFloat(profile.height || '0'),
          gender: profile.gender || 'male',
          activity_level: profile.activityLevel || 'light',
          dietary_preferences: profile.dietaryPreferences || [],
          health_goals: profile.healthGoals || ['maintenance'],
          target_calories: parseFloat(profile.targetCalories || '2000'),
          target_steps: parseInt(profile.targetSteps || '10000', 10),
          target_water: parseFloat(profile.targetWater || '2.5'),
          target_workout_minutes: parseInt(profile.targetWorkoutMinutes || '30', 10),
        });
        await removeOfflineAction(item.id);
        processedCount++;
      }
    } catch {
      // Still offline or failed, stop draining
      break;
    }
  }
  return processedCount;
}
