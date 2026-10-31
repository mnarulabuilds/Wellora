import { UserProfile } from '../types';

const num = (value: string | undefined, fallback: number, parse = parseFloat) => {
  const parsed = parse(value ?? '');
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** Local, string-based profile -> API payload. */
export function profileToApi(profile: Partial<UserProfile>) {
  return {
    user_id: profile.userId,
    name: (profile.name || '').trim(),
    age: num(profile.age, 0, (v) => parseInt(v, 10)),
    weight: num(profile.weight, 0),
    height: num(profile.height, 0),
    gender: profile.gender || 'male',
    activity_level: profile.activityLevel || 'light',
    dietary_preferences: profile.dietaryPreferences || [],
    health_goals: profile.healthGoals?.length ? profile.healthGoals : ['maintenance'],
    target_calories: num(profile.targetCalories, 2000),
    target_steps: num(profile.targetSteps, 10000, (v) => parseInt(v, 10)),
    target_water: num(profile.targetWater, 2.5),
    target_workout_minutes: num(profile.targetWorkoutMinutes, 30, (v) => parseInt(v, 10)),
  };
}

/** API profile -> local, string-based profile. */
export function profileFromApi(p: Record<string, any>): Partial<UserProfile> {
  return {
    userId: p.user_id,
    name: p.name ?? '',
    age: String(p.age ?? ''),
    weight: String(p.weight ?? ''),
    height: String(p.height ?? ''),
    gender: p.gender ?? 'male',
    activityLevel: p.activity_level ?? 'light',
    dietaryPreferences: p.dietary_preferences ?? [],
    healthGoals: p.health_goals?.length ? p.health_goals : ['maintenance'],
    targetCalories: String(p.target_calories ?? '2000'),
    targetSteps: String(p.target_steps ?? '10000'),
    targetWater: String(p.target_water ?? '2.5'),
    targetWorkoutMinutes: String(p.target_workout_minutes ?? '30'),
  };
}
