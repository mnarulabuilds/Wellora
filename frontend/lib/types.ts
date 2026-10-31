// ---------- Local profile (form-friendly strings) ----------
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

export type UnitSystem = 'metric' | 'imperial';
export type ActivityType = 'meal' | 'workout' | 'water';
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

// ---------- Scores & summaries ----------
export interface Streak {
  current_streak: number;
  longest_streak: number;
  total_active_days?: number;
}

export interface HealthScore {
  score: number;
  label: string;
  color: string;
  feedback: string[];
  breakdown?: { profile: number; bmi: number; activity: number; consistency: number };
  streak?: Streak;
}

export interface Macros {
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fiber_g: number;
}

export interface ActivityLogEntry {
  id: number;
  user_id: string;
  activity_type: ActivityType;
  details: string;
  value: number;
  timestamp: string;
  metadata?: Record<string, unknown> & Partial<Macros> & { meal_slot?: MealSlot; serving_label?: string };
}

export interface DailySummary {
  date: string;
  calories_logged: number;
  workout_minutes: number;
  water_liters: number;
  meal_count: number;
  workout_count?: number;
  macros?: Macros;
  logs: ActivityLogEntry[];
}

export interface WeeklyHistory {
  labels: string[];
  workout_data: number[];
  meal_data: number[];
  water_data?: number[];
  data: number[];
}

export interface RecoveryScore {
  score: number;
  status: string;
  color: string;
  insights: string[];
  metrics: Record<string, number>;
}

export interface HealthReport {
  bmi: number;
  bmi_category: string;
  daily_calories: number;
  tdee?: number;
  recommendations: string[];
  charts: {
    macros: { labels: string[]; data: number[]; grams?: { protein: number; carbs: number; fats: number } };
    weight_projection: { weeks: number[]; change: number[]; weights?: number[] };
  };
}

// ---------- Habits / sleep / weight ----------
export interface Habit {
  id: number;
  title: string;
  category: string;
  icon: string;
  completed?: boolean;
}

export interface HabitsStatus {
  date: string;
  total_habits: number;
  completed_habits: number;
  completion_rate: number;
  habits: Habit[];
}

export interface SleepLog {
  id: number;
  date: string;
  hours: number;
  quality: number;
  deep_sleep_hours: number;
  bed_time: string | null;
  wake_time: string | null;
  notes: string;
}

export interface WeightLog {
  id: number;
  date: string;
  weight: number;
  bmi: number | null;
  notes: string;
}

// ---------- Nutrition ----------
export interface FoodItem {
  id: number;
  name: string;
  category: string;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fiber_g: number;
}

export interface DailyNutrition {
  date: string;
  consumed: { calories: number } & Macros;
  targets: { calories: number; protein: number; carbs: number; fats: number };
  progress: { calories: number; protein: number; carbs: number; fats: number };
  remaining_calories: number;
  meals: Record<MealSlot, ActivityLogEntry[]>;
}

// ---------- Medications ----------
export interface Medication {
  id: number;
  name: string;
  dosage: string;
  times: string[];
  instructions: string;
  is_active: boolean;
}

export type DoseStatus = 'taken' | 'upcoming' | 'due' | 'overdue' | 'missed';

export interface ScheduledDose {
  medication_id: number;
  name: string;
  dosage: string;
  instructions: string;
  scheduled_time: string;
  taken: boolean;
  taken_at: string | null;
  status: DoseStatus;
}

export interface MedicationSchedule {
  date: string;
  total: number;
  taken: number;
  adherence: number | null;
  next_dose: ScheduledDose | null;
  doses: ScheduledDose[];
}

// ---------- Vitals ----------
export type VitalType = 'blood_pressure' | 'heart_rate' | 'blood_glucose' | 'spo2' | 'temperature';
export type VitalStatus = 'normal' | 'elevated' | 'low' | 'high' | 'critical';

export interface VitalReading {
  id: number;
  vital_type: VitalType;
  value: number;
  value_secondary: number | null;
  context: string | null;
  measured_at: string;
  notes: string;
  label: string;
  unit: string;
  display_value: string;
  classification: { status: VitalStatus; label: string; advice: string };
}

// ---------- Reports ----------
export interface WeeklyWindow {
  start: string;
  end: string;
  active_days: number;
  avg_calories: number | null;
  total_workout_minutes: number;
  workout_sessions: number;
  avg_water_liters: number | null;
  avg_sleep_hours: number | null;
  avg_sleep_quality: number | null;
  habit_completion_rate: number | null;
  medication_adherence: number | null;
  latest_weight: number | null;
  weight_change: number | null;
}

export interface WeeklyReport {
  current: WeeklyWindow;
  previous: WeeklyWindow;
  changes: Partial<Record<keyof WeeklyWindow, number | null>>;
  highlights: string[];
}

export interface Dashboard {
  health_score: HealthScore;
  daily: DailySummary;
  weekly: WeeklyHistory;
  recovery: RecoveryScore;
  habits: HabitsStatus;
  medications: MedicationSchedule;
}

// ---------- Chat & offline ----------
export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  intent?: string;
  isError?: boolean;
  suggestions?: string[];
}

export interface OfflineAction {
  id: string;
  type: 'log_activity' | 'save_profile';
  payload: Record<string, unknown>;
  queuedAt: string;
}
