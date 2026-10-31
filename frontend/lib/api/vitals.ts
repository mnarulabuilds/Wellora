import { VitalReading, VitalType } from '../types';
import { localISODateTime } from '../format';
import { apiClient, q } from './client';

export interface VitalInput {
  vital_type: VitalType;
  value: number;
  value_secondary?: number;
  context?: string;
  notes?: string;
}

export async function recordVital(userId: string, input: VitalInput) {
  const res = await apiClient.post('/vitals', { user_id: userId, measured_at: localISODateTime(), ...input });
  return res.data as { message: string; reading: VitalReading };
}

export async function fetchLatestVitals(userId: string): Promise<VitalReading[]> {
  const res = await apiClient.get(`/vitals/latest?${q({ user_id: userId })}`);
  return res.data.latest;
}

export async function fetchVitals(userId: string, vitalType?: VitalType, limit = 30): Promise<VitalReading[]> {
  const res = await apiClient.get(`/vitals?${q({ user_id: userId, vital_type: vitalType, limit })}`);
  return res.data.readings;
}

export async function deleteVital(userId: string, id: number) {
  await apiClient.delete(`/vitals/${id}?${q({ user_id: userId })}`);
}
