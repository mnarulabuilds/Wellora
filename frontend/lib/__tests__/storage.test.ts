import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getOfflineQueue,
  getUserId,
  isOnboardingComplete,
  isProfileComplete,
  loadProfile,
  queueOfflineAction,
  removeOfflineAction,
  saveProfileLocal,
  setOnboardingComplete,
} from '../storage';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('storage', () => {
  it('generates and persists a stable user id', async () => {
    const first = await getUserId();
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(await getUserId()).toBe(first);
  });

  it('saves and loads a profile with defaults', async () => {
    await saveProfileLocal({ name: 'Asha', age: '30', weight: '70', height: '170', dietaryPreferences: ['vegan'] });
    const profile = await loadProfile();
    expect(profile.name).toBe('Asha');
    expect(profile.dietaryPreferences).toEqual(['vegan']);
    expect(profile.healthGoals).toEqual(['maintenance']);
    expect(profile.targetWater).toBe('2.5');
    expect(await isProfileComplete()).toBe(true);
  });

  it('tracks onboarding completion', async () => {
    expect(await isOnboardingComplete()).toBe(false);
    await setOnboardingComplete();
    expect(await isOnboardingComplete()).toBe(true);
  });

  it('queues and removes offline actions', async () => {
    await queueOfflineAction('log_activity', { value: 1 });
    await queueOfflineAction('log_activity', { value: 2 });
    const queue = await getOfflineQueue();
    expect(queue).toHaveLength(2);
    await removeOfflineAction(queue[0].id);
    expect((await getOfflineQueue()).map((a) => a.payload.value)).toEqual([2]);
  });
});
