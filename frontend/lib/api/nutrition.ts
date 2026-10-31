import { DailyNutrition, FoodItem, MealSlot } from '../types';
import { localISODate, localISODateTime } from '../format';
import { apiClient, q } from './client';

export async function searchFoods(query: string, limit = 25): Promise<FoodItem[]> {
  const res = await apiClient.get(`/foods/search?${q({ q: query, limit })}`);
  return res.data.results;
}

export async function fetchPopularFoods(limit = 30): Promise<FoodItem[]> {
  const res = await apiClient.get(`/foods/popular?${q({ limit })}`);
  return res.data.results;
}

export type NewFood = Omit<FoodItem, 'id'>;

export async function createFood(food: NewFood): Promise<FoodItem> {
  const res = await apiClient.post('/foods', food);
  return res.data.food;
}

export async function logFood(userId: string, foodId: number, servings: number, mealSlot: MealSlot) {
  const res = await apiClient.post('/nutrition/log', {
    user_id: userId,
    food_id: foodId,
    servings,
    meal_slot: mealSlot,
    timestamp: localISODateTime(),
  });
  return res.data as { message: string };
}

export async function fetchDailyNutrition(userId: string, date?: string): Promise<DailyNutrition> {
  const res = await apiClient.get(`/nutrition/daily?${q({ user_id: userId, date: date ?? localISODate() })}`);
  return res.data;
}
