export interface UserProfile {
  userId: string;
  name: string;
  age: string;
  weight: string;
  height: string;
  gender: 'male' | 'female' | string;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | string;
  dietaryPreferences: string[];
  healthGoals: string[];
  targetCalories: string;
  targetSteps: string;
  targetWater: string;
  targetWorkoutMinutes: string;
}

export interface HealthScore {
  score: number;
  label: string;
  color: string;
  feedback: string[];
  breakdown?: {
    profile: number;
    bmi: number;
    activity: number;
    consistency: number;
  };
  streak?: {
    current_streak: number;
    longest_streak: number;
    total_active_days?: number;
  };
}

export interface DailySummary {
  date: string;
  calories_logged: number;
  workout_minutes: number;
  water_liters: number;
  meal_count: number;
  workout_count?: number;
  logs: ActivityLogEntry[];
}

export interface ActivityLogEntry {
  id: number;
  user_id: string;
  activity_type: 'meal' | 'workout' | 'water';
  details: string;
  value: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface WeeklyHistory {
  labels: string[];
  workout_data: number[];
  meal_data: number[];
  water_data?: number[];
  data: number[];
}

export interface HealthReport {
  bmi: number;
  bmi_category: string;
  daily_calories: number;
  tdee?: number;
  recommendations: string[];
  charts: {
    macros: {
      labels: string[];
      data: number[];
      grams?: {
        protein: number;
        carbs: number;
        fats: number;
      };
    };
    weight_projection: {
      weeks: number[];
      change: number[];
      weights?: number[];
    };
  };
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  intent?: string;
  isError?: boolean;
}

export interface OfflineAction {
  id: string;
  type: 'log_activity' | 'save_profile' | 'delete_activity';
  payload: Record<string, unknown>;
  queuedAt: string;
}

export type UnitSystem = 'metric' | 'imperial';
