import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage, OfflineAction, UnitSystem, UserProfile } from './types';

const KEYS = {
  userId: 'wellora_user_id',
  userName: 'userName',
  userAge: 'userAge',
  userWeight: 'userWeight',
  userHeight: 'userHeight',
  userGender: 'userGender',
  activityLevel: 'activityLevel',
  dietaryPreferences: 'dietaryPreferences',
  healthGoals: 'healthGoals',
  targetCalories: 'targetCalories',
  targetSteps: 'targetSteps',
  targetWater: 'targetWater',
  targetWorkoutMinutes: 'targetWorkoutMinutes',
  onboardingComplete: 'onboardingComplete',
  chatHistory: 'chatHistory',
  unitSystem: 'unitSystem',
  offlineQueue: 'offlineQueue',
};

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getUserId(): Promise<string> {
  try {
    let userId = await AsyncStorage.getItem(KEYS.userId);
    if (!userId) {
      // Check legacy key if any
      const legacyId = await AsyncStorage.getItem('userId');
      if (legacyId) {
        userId = legacyId;
      } else {
        userId = generateUUID();
      }
      await AsyncStorage.setItem(KEYS.userId, userId);
    }
    return userId;
  } catch {
    return 'default_user';
  }
}

export async function loadProfile(): Promise<UserProfile> {
  const [
    userId,
    name,
    age,
    weight,
    height,
    gender,
    activityLevel,
    dietaryPreferences,
    healthGoals,
    targetCalories,
    targetSteps,
    targetWater,
    targetWorkoutMinutes,
  ] = await Promise.all([
    getUserId(),
    AsyncStorage.getItem(KEYS.userName),
    AsyncStorage.getItem(KEYS.userAge),
    AsyncStorage.getItem(KEYS.userWeight),
    AsyncStorage.getItem(KEYS.userHeight),
    AsyncStorage.getItem(KEYS.userGender),
    AsyncStorage.getItem(KEYS.activityLevel),
    AsyncStorage.getItem(KEYS.dietaryPreferences),
    AsyncStorage.getItem(KEYS.healthGoals),
    AsyncStorage.getItem(KEYS.targetCalories),
    AsyncStorage.getItem(KEYS.targetSteps),
    AsyncStorage.getItem(KEYS.targetWater),
    AsyncStorage.getItem(KEYS.targetWorkoutMinutes),
  ]);

  let parsedDiet: string[] = [];
  try {
    if (dietaryPreferences) parsedDiet = JSON.parse(dietaryPreferences);
  } catch {
    parsedDiet = [];
  }

  let parsedGoals: string[] = ['maintenance'];
  try {
    if (healthGoals) parsedGoals = JSON.parse(healthGoals);
  } catch {
    parsedGoals = ['maintenance'];
  }

  return {
    userId,
    name: name || '',
    age: age || '',
    weight: weight || '',
    height: height || '',
    gender: gender || 'male',
    activityLevel: activityLevel || 'light',
    dietaryPreferences: parsedDiet,
    healthGoals: parsedGoals.length > 0 ? parsedGoals : ['maintenance'],
    targetCalories: targetCalories || '2000',
    targetSteps: targetSteps || '10000',
    targetWater: targetWater || '2.5',
    targetWorkoutMinutes: targetWorkoutMinutes || '30',
  };
}

export async function saveProfileLocal(profile: Partial<UserProfile>): Promise<void> {
  const ops: [string, string][] = [];
  if (profile.userId) ops.push([KEYS.userId, profile.userId]);
  if (profile.name !== undefined) ops.push([KEYS.userName, profile.name]);
  if (profile.age !== undefined) ops.push([KEYS.userAge, String(profile.age)]);
  if (profile.weight !== undefined) ops.push([KEYS.userWeight, String(profile.weight)]);
  if (profile.height !== undefined) ops.push([KEYS.userHeight, String(profile.height)]);
  if (profile.gender !== undefined) ops.push([KEYS.userGender, profile.gender]);
  if (profile.activityLevel !== undefined) ops.push([KEYS.activityLevel, profile.activityLevel]);
  if (profile.dietaryPreferences !== undefined) {
    ops.push([KEYS.dietaryPreferences, JSON.stringify(profile.dietaryPreferences)]);
  }
  if (profile.healthGoals !== undefined) {
    ops.push([KEYS.healthGoals, JSON.stringify(profile.healthGoals)]);
  }
  if (profile.targetCalories !== undefined) ops.push([KEYS.targetCalories, String(profile.targetCalories)]);
  if (profile.targetSteps !== undefined) ops.push([KEYS.targetSteps, String(profile.targetSteps)]);
  if (profile.targetWater !== undefined) ops.push([KEYS.targetWater, String(profile.targetWater)]);
  if (profile.targetWorkoutMinutes !== undefined) {
    ops.push([KEYS.targetWorkoutMinutes, String(profile.targetWorkoutMinutes)]);
  }
  await AsyncStorage.multiSet(ops);
}

export async function isProfileComplete(): Promise<boolean> {
  const profile = await loadProfile();
  return !!(profile.name && profile.age && profile.weight && profile.height);
}

export async function isOnboardingComplete(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(KEYS.onboardingComplete);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function setOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(KEYS.onboardingComplete, 'true');
}

export async function getChatHistory(userId: string): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(`${KEYS.chatHistory}_${userId}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveChatHistory(userId: string, messages: ChatMessage[]): Promise<void> {
  try {
    await AsyncStorage.setItem(`${KEYS.chatHistory}_${userId}`, JSON.stringify(messages));
  } catch (err) {
    console.error('Failed to save chat history', err);
  }
}

export async function clearChatHistory(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${KEYS.chatHistory}_${userId}`);
  } catch (err) {
    console.error('Failed to clear chat history', err);
  }
}

export async function getUnitSystem(): Promise<UnitSystem> {
  try {
    const val = await AsyncStorage.getItem(KEYS.unitSystem);
    return val === 'imperial' ? 'imperial' : 'metric';
  } catch {
    return 'metric';
  }
}

export async function setUnitSystem(system: UnitSystem): Promise<void> {
  await AsyncStorage.setItem(KEYS.unitSystem, system);
}

export async function queueOfflineAction(type: OfflineAction['type'], payload: Record<string, unknown>): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(KEYS.offlineQueue);
    const queue: OfflineAction[] = existing ? JSON.parse(existing) : [];
    queue.push({
      id: generateUUID(),
      type,
      payload,
      queuedAt: new Date().toISOString(),
    });
    await AsyncStorage.setItem(KEYS.offlineQueue, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to queue offline action', err);
  }
}

export async function getOfflineQueue(): Promise<OfflineAction[]> {
  try {
    const existing = await AsyncStorage.getItem(KEYS.offlineQueue);
    return existing ? JSON.parse(existing) : [];
  } catch {
    return [];
  }
}

export async function removeOfflineAction(actionId: string): Promise<void> {
  try {
    const queue = await getOfflineQueue();
    const filtered = queue.filter((a) => a.id !== actionId);
    await AsyncStorage.setItem(KEYS.offlineQueue, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to remove offline action', err);
  }
}

export async function clearOfflineQueue(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.offlineQueue);
}

export async function clearLocalData(): Promise<void> {
  await AsyncStorage.clear();
}

// Unit helpers live in ./format; re-exported here for backwards compatibility.
export { cmToInches, inchesToCm, kgToLbs, lbsToKg } from './format';

export { KEYS };
