export const theme = {
  colors: {
    background: '#090814',
    backgroundElevated: '#0f0c29',
    surface: '#15132d',
    surfaceSubtle: '#1d1b3c',
    surfaceBorder: '#27244d',
    primary: '#2575fc',
    primaryGradient: ['#6a11cb', '#2575fc'] as [string, string],
    accent: '#4facfe',
    accentGradient: ['#4facfe', '#00f2fe'] as [string, string],
    energyGradient: ['#FF512F', '#DD2476'] as [string, string],
    emeraldGradient: ['#11998e', '#38ef7d'] as [string, string],
    violetGradient: ['#8E2DE2', '#4A00E0'] as [string, string],
    text: '#ffffff',
    textSecondary: '#a5a3c2',
    textMuted: '#6f6c91',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    calories: '#FF6B6B',
    steps: '#4ECDC4',
    water: '#38BDF8',
    workout: '#34D399',
    sleep: '#A78BFA',
    weight: '#F472B6',
    vitals: '#F87171',
    meds: '#FBBF24',
    habits: '#2DD4BF',
    protein: '#60A5FA',
    carbs: '#FBBF24',
    fats: '#F472B6',
    overlay: 'rgba(5, 4, 15, 0.78)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    full: 9999,
  },
};

export const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary (Desk Job)' },
  { value: 'light', label: 'Light (1-2 days/wk)' },
  { value: 'moderate', label: 'Moderate (3-5 days/wk)' },
  { value: 'active', label: 'Active (6-7 days/wk)' },
  { value: 'very_active', label: 'Very Active (Athlete)' },
];

export const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

export const DIETARY_OPTIONS = ['vegan', 'vegetarian', 'gluten_free', 'keto', 'dairy_free'];

export const HEALTH_GOALS = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'weight_loss', label: 'Weight Loss' },
  { value: 'muscle_gain', label: 'Muscle Gain' },
  { value: 'better_sleep', label: 'Better Sleep' },
  { value: 'stress_reduction', label: 'Stress Relief' },
  { value: 'improved_flexibility', label: 'Flexibility' },
  { value: 'spiritual_growth', label: 'Mind & Spirit' },
];

export const WORKOUT_PRESETS = [
  { label: '🏃 30m Run', details: 'Outdoor Running', value: 30 },
  { label: '🏋️ 45m Gym', details: 'Strength & Resistance', value: 45 },
  { label: '🧘 20m Yoga', details: 'Yoga & Mobility', value: 20 },
  { label: '🚶 30m Walk', details: 'Brisk Walking', value: 30 },
  { label: '🚴 30m Cycle', details: 'Cycling', value: 30 },
  { label: '🏊 30m Swim', details: 'Swimming', value: 30 },
];

export const MEAL_PRESETS = [
  { label: '🥣 Breakfast (400 kcal)', details: 'Breakfast Oatmeal & Fruit', value: 400 },
  { label: '🥗 Lunch (600 kcal)', details: 'Balanced Lunch Bowl', value: 600 },
  { label: '🍲 Dinner (700 kcal)', details: 'Nutritious Dinner', value: 700 },
  { label: '🍎 Snack (200 kcal)', details: 'Healthy Snack & Nuts', value: 200 },
  { label: '🥤 Protein Shake (250 kcal)', details: 'Post-workout Whey & Berries', value: 250 },
];

export const WATER_PRESETS = [
  { label: '🥛 250 ml (Glass)', details: 'Water Glass', value: 0.25 },
  { label: '🍶 500 ml (Bottle)', details: 'Hydration Bottle', value: 0.5 },
  { label: '💧 1000 ml (Large)', details: 'Large Bottle', value: 1.0 },
];

export const SUGGESTED_PROMPTS = [
  '💊 What should I do if I miss a dose?',
  '❤️ What is a healthy blood pressure?',
  '🥗 What should I eat for high-protein breakfast?',
  '😴 How can I optimize my deep sleep tonight?',
  '🏋️ Suggest a 30-minute cardio & core workout',
  '💧 How much water should I drink based on my weight?',
  '🧘 Quick 5-minute breathing exercise for stress',
  "🍎 Healthy late night snacks that won't spike sugar",
];

export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export const STATUS_COLORS: Record<string, string> = {
  normal: '#10B981',
  taken: '#10B981',
  elevated: '#F59E0B',
  due: '#F59E0B',
  upcoming: '#6f6c91',
  low: '#38BDF8',
  high: '#F97316',
  overdue: '#EF4444',
  missed: '#EF4444',
  critical: '#EF4444',
};

export const MEAL_SLOTS = [
  { value: 'breakfast', label: 'Breakfast', icon: 'sunny-outline' },
  { value: 'lunch', label: 'Lunch', icon: 'restaurant-outline' },
  { value: 'dinner', label: 'Dinner', icon: 'moon-outline' },
  { value: 'snack', label: 'Snack', icon: 'cafe-outline' },
] as const;

/** Suggest a meal slot from the time of day. */
export function defaultMealSlot(date: Date = new Date()): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const h = date.getHours();
  if (h >= 5 && h < 11) return 'breakfast';
  if (h >= 11 && h < 16) return 'lunch';
  if (h >= 18 && h < 23) return 'dinner';
  return 'snack';
}

export const VITAL_TYPES = [
  {
    value: 'blood_pressure',
    label: 'Blood Pressure',
    short: 'BP',
    unit: 'mmHg',
    icon: 'pulse-outline',
    placeholder: '120',
    secondaryPlaceholder: '80',
  },
  { value: 'heart_rate', label: 'Heart Rate', short: 'HR', unit: 'bpm', icon: 'heart-outline', placeholder: '72' },
  {
    value: 'blood_glucose',
    label: 'Blood Glucose',
    short: 'Sugar',
    unit: 'mg/dL',
    icon: 'water-outline',
    placeholder: '95',
  },
  { value: 'spo2', label: 'Blood Oxygen', short: 'SpO₂', unit: '%', icon: 'fitness-outline', placeholder: '98' },
  {
    value: 'temperature',
    label: 'Temperature',
    short: 'Temp',
    unit: '°C',
    icon: 'thermometer-outline',
    placeholder: '36.8',
  },
] as const;

export const GLUCOSE_CONTEXTS = [
  { value: 'fasting', label: 'Fasting' },
  { value: 'before_meal', label: 'Before meal' },
  { value: 'after_meal', label: 'After meal' },
  { value: 'random', label: 'Random' },
] as const;

export const TRACKERS = [
  { route: '/tracker/nutrition', title: 'Nutrition', subtitle: 'Food & macros', icon: 'nutrition', color: '#FF6B6B' },
  {
    route: '/tracker/medications',
    title: 'Medications',
    subtitle: 'Doses & reminders',
    icon: 'medkit',
    color: '#FBBF24',
  },
  { route: '/tracker/vitals', title: 'Vitals', subtitle: 'BP, sugar, heart rate', icon: 'pulse', color: '#F87171' },
  { route: '/tracker/sleep', title: 'Sleep', subtitle: 'Duration & quality', icon: 'moon', color: '#A78BFA' },
  { route: '/tracker/weight', title: 'Weight', subtitle: 'Weigh-ins & BMI', icon: 'scale', color: '#F472B6' },
  { route: '/tracker/habits', title: 'Habits', subtitle: 'Daily checklist', icon: 'checkmark-done', color: '#2DD4BF' },
] as const;
