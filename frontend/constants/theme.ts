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

export const DIETARY_OPTIONS = [
  'vegan',
  'vegetarian',
  'gluten_free',
  'keto',
  'dairy_free',
];

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
  '🥗 What should I eat for high-protein breakfast?',
  '😴 How can I optimize my deep sleep tonight?',
  '🏋️ Suggest a 30-minute cardio & core workout',
  '💧 How much water should I drink based on my weight?',
  '🧘 Quick 5-minute breathing exercise for stress',
  '🍎 Healthy late night snacks that won\'t spike sugar',
];

export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}
