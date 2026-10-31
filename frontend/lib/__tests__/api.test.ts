import AsyncStorage from '@react-native-async-storage/async-storage';
import { AxiosError } from 'axios';

import {
  apiClient,
  fetchDailyNutrition,
  fetchDashboard,
  fetchMedicationSchedule,
  logActivity,
  logFood,
  logSleep,
  recordVital,
  toggleDose,
  toggleHabit,
} from '../api';
import { localISODate } from '../format';
import { getOfflineQueue } from '../storage';

const today = localISODate();
const LOCAL_TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

let get: jest.SpyInstance;
let post: jest.SpyInstance;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
  get = jest.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: {}, latest: [] } } as any);
  post = jest.spyOn(apiClient, 'post').mockResolvedValue({ data: { data: { taken: true } } } as any);
});

describe('API module uses the device-local day', () => {
  it.each([
    ['dashboard', () => fetchDashboard('u1'), '/dashboard'],
    ['nutrition', () => fetchDailyNutrition('u1'), '/nutrition/daily'],
    ['medication schedule', () => fetchMedicationSchedule('u1'), '/medications/schedule'],
  ])('%s requests include ?date=<local today>', async (_name, call, path) => {
    await call();
    const url = get.mock.calls[0][0] as string;
    expect(url.startsWith(path)).toBe(true);
    expect(url).toContain(`date=${today}`);
    expect(url).toContain('user_id=u1');
  });

  it('stamps writes with local time / date', async () => {
    await logActivity('u1', 'water', 'Glass', 0.25);
    await logFood('u1', 3, 1.5, 'lunch');
    await recordVital('u1', { vital_type: 'heart_rate', value: 70 });
    await logSleep('u1', { hours: 7, quality: 4 });
    await toggleHabit('u1', 9);
    await toggleDose('u1', 2, '08:00');

    const bodies = Object.fromEntries(post.mock.calls.map(([url, body]) => [url, body]));
    expect(bodies['/log_activity'].timestamp).toMatch(LOCAL_TS);
    expect(bodies['/nutrition/log']).toMatchObject({ food_id: 3, servings: 1.5, meal_slot: 'lunch' });
    expect(bodies['/nutrition/log'].timestamp).toMatch(LOCAL_TS);
    expect(bodies['/vitals'].measured_at).toMatch(LOCAL_TS);
    expect(bodies['/sleep/log'].date).toBe(today);
    expect(bodies['/habits/toggle']).toEqual({ user_id: 'u1', habit_id: 9, date: today });
    expect(bodies['/medications/2/doses/toggle']).toEqual({ user_id: 'u1', scheduled_time: '08:00', date: today });
  });
});

describe('offline behaviour of logActivity', () => {
  it('queues the entry when the network is down', async () => {
    post.mockRejectedValueOnce(new AxiosError('down', 'ERR_NETWORK'));
    await expect(logActivity('u1', 'water', 'Glass', 0.25)).rejects.toBeTruthy();
    const queue = await getOfflineQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].payload).toMatchObject({ user_id: 'u1', activity_type: 'water', value: 0.25 });
  });

  it('does not queue entries the server rejected', async () => {
    post.mockRejectedValueOnce(new AxiosError('bad', 'ERR_BAD_REQUEST', undefined, undefined, { status: 422 } as any));
    await expect(logActivity('u1', 'water', 'Lake', 99)).rejects.toBeTruthy();
    expect(await getOfflineQueue()).toHaveLength(0);
  });
});
