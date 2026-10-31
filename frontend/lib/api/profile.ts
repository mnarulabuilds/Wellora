import { queueOfflineAction } from '../storage';
import { Dashboard, HealthReport, HealthScore, UserProfile, WeeklyReport } from '../types';
import { localISODate } from '../format';
import { API_BASE_URL, apiClient, isNetworkError, q } from './client';
import { profileFromApi, profileToApi } from './mappers';

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await apiClient.get('/health', { timeout: 4000 });
    return res.data?.status === 'healthy';
  } catch {
    return false;
  }
}

export async function syncProfileToBackend(profile: Partial<UserProfile>): Promise<void> {
  if (!profile.userId) return;
  try {
    await apiClient.post('/users/profile', profileToApi(profile));
  } catch (err) {
    if (isNetworkError(err)) await queueOfflineAction('save_profile', { profile });
    throw err;
  }
}

export async function fetchProfileFromBackend(userId: string): Promise<Partial<UserProfile> | null> {
  try {
    const res = await apiClient.get(`/users/profile?${q({ user_id: userId })}`);
    return res.data ? profileFromApi(res.data) : null;
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
  const toNum = (v?: string) => (v && Number.isFinite(parseFloat(v)) ? parseFloat(v) : null);
  const res = await apiClient.post('/calculate_health_score', {
    user_id: userId,
    age: toNum(age) !== null ? Math.round(toNum(age)!) : null,
    weight: toNum(weight),
    height: toNum(height),
  });
  return res.data;
}

export async function generateReport(profile: Partial<UserProfile>): Promise<HealthReport> {
  const p = profileToApi(profile);
  const res = await apiClient.post('/generate_report', {
    age: p.age || 25,
    weight: p.weight || 70,
    height: p.height || 175,
    gender: p.gender,
    activity_level: p.activity_level,
    dietary_preferences: p.dietary_preferences,
    health_goals: p.health_goals,
  });
  return res.data;
}

export async function fetchDashboard(userId: string): Promise<Dashboard> {
  const res = await apiClient.get(`/dashboard?${q({ user_id: userId, date: localISODate() })}`);
  return res.data;
}

export async function fetchWeeklyReport(userId: string): Promise<WeeklyReport> {
  const res = await apiClient.get(`/reports/weekly?${q({ user_id: userId })}`);
  return res.data;
}

export function exportUrl(userId: string, format: 'json' | 'csv'): string {
  return `${API_BASE_URL}/users/export?${q({ user_id: userId, format })}`;
}

export async function deleteRemoteData(userId: string): Promise<void> {
  await apiClient.delete(`/users/data?${q({ user_id: userId })}`);
}
