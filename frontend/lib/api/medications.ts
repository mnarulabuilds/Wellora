import { Medication, MedicationSchedule } from '../types';
import { localISODate } from '../format';
import { apiClient, q } from './client';

export interface MedicationInput {
  name: string;
  dosage: string;
  times: string[];
  instructions: string;
}

export async function fetchMedications(userId: string): Promise<Medication[]> {
  const res = await apiClient.get(`/medications?${q({ user_id: userId })}`);
  return res.data.medications;
}

export async function createMedication(userId: string, input: MedicationInput): Promise<Medication> {
  const res = await apiClient.post('/medications', { user_id: userId, ...input });
  return res.data.medication;
}

export async function updateMedication(
  userId: string,
  id: number,
  updates: Partial<MedicationInput> & { is_active?: boolean }
): Promise<Medication> {
  const res = await apiClient.put(`/medications/${id}?${q({ user_id: userId })}`, updates);
  return res.data.medication;
}

export async function deleteMedication(userId: string, id: number) {
  await apiClient.delete(`/medications/${id}?${q({ user_id: userId })}`);
}

export async function fetchMedicationSchedule(userId: string): Promise<MedicationSchedule> {
  const res = await apiClient.get(`/medications/schedule?${q({ user_id: userId, date: localISODate() })}`);
  return res.data;
}

export async function toggleDose(userId: string, medicationId: number, scheduledTime: string) {
  const res = await apiClient.post(`/medications/${medicationId}/doses/toggle`, {
    user_id: userId,
    scheduled_time: scheduledTime,
    date: localISODate(),
  });
  return res.data.data as { taken: boolean };
}

export async function fetchAdherence(userId: string, days = 7) {
  const res = await apiClient.get(`/medications/adherence?${q({ user_id: userId, days })}`);
  return res.data as { adherence: number | null; scheduled: number; taken: number };
}
