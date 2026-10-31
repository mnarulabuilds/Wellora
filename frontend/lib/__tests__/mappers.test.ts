import { profileFromApi, profileToApi } from '../api/mappers';

describe('profile mappers', () => {
  it('converts the local string profile into a typed API payload', () => {
    const payload = profileToApi({
      userId: 'u1',
      name: '  Asha ',
      age: '30',
      weight: '70.5',
      height: '170',
      healthGoals: [],
      targetCalories: 'abc',
    });
    expect(payload).toMatchObject({
      user_id: 'u1',
      name: 'Asha',
      age: 30,
      weight: 70.5,
      height: 170,
      health_goals: ['maintenance'],
      target_calories: 2000,
      target_steps: 10000,
      target_water: 2.5,
    });
  });

  it('round-trips through the API shape', () => {
    const api = {
      user_id: 'u2',
      name: 'Ravi',
      age: 41,
      weight: 82,
      height: 176,
      gender: 'male',
      activity_level: 'moderate',
      dietary_preferences: ['vegetarian'],
      health_goals: ['weight_loss'],
      target_calories: 2100,
      target_steps: 8000,
      target_water: 3,
      target_workout_minutes: 45,
    };
    const local = profileFromApi(api);
    expect(local.age).toBe('41');
    expect(profileToApi(local)).toEqual(api);
  });
});
