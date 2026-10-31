import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ChipSelector } from '@/components/ChipSelector';
import { useToast } from '@/components/Toast';
import { ACTIVITY_LEVELS, DIETARY_OPTIONS, GENDERS, HEALTH_GOALS, theme } from '@/constants/theme';
import { syncProfileToBackend } from '@/lib/api';
import { getUserId, saveProfileLocal, setOnboardingComplete } from '@/lib/storage';

export default function OnboardingScreen() {
  const router = useRouter();
  const { showToast } = useToast();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState('male');
  const [activityLevel, setActivityLevel] = useState('light');
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
  const [healthGoals, setHealthGoals] = useState<string[]>(['maintenance']);
  const [targetCalories, setTargetCalories] = useState('2000');
  const [targetSteps] = useState('10000');
  const [targetWater, setTargetWater] = useState('2.5');
  const [targetWorkoutMinutes] = useState('30');
  const [loading, setLoading] = useState(false);

  const toggleMulti = (value: string, current: string[], setter: (v: string[]) => void) => {
    if (current.includes(value)) {
      if (current.length === 1 && value === 'maintenance') return;
      setter(current.filter((v) => v !== value));
    } else {
      setter([...current, value]);
    }
  };

  const validateStep2 = () => {
    const trimmed = name.trim();
    const ageNum = parseInt(age, 10);
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);

    if (!trimmed) {
      showToast('Please enter your name.', 'error');
      return false;
    }
    if (isNaN(ageNum) || ageNum < 10 || ageNum > 120) {
      showToast('Please enter a valid age (10-120).', 'error');
      return false;
    }
    if (isNaN(weightNum) || weightNum < 20 || weightNum > 400) {
      showToast('Please enter a valid weight (20-400 kg).', 'error');
      return false;
    }
    if (isNaN(heightNum) || heightNum < 50 || heightNum > 280) {
      showToast('Please enter a valid height (50-280 cm).', 'error');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep2()) {
      return;
    }
    if (step < 2) {
      setStep(step + 1);
    } else {
      finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    if (!validateStep2()) return;

    setLoading(true);
    try {
      const userId = await getUserId();
      const profile = {
        userId,
        name: name.trim(),
        age,
        weight,
        height,
        gender,
        activityLevel,
        dietaryPreferences,
        healthGoals: healthGoals.length > 0 ? healthGoals : ['maintenance'],
        targetCalories: targetCalories || '2000',
        targetSteps: targetSteps || '10000',
        targetWater: targetWater || '2.5',
        targetWorkoutMinutes: targetWorkoutMinutes || '30',
      };

      await saveProfileLocal(profile);
      try {
        await syncProfileToBackend(profile);
      } catch {
        // Saved locally, will sync later
      }

      await setOnboardingComplete();
      showToast(`Welcome to Wellora, ${name.trim()}! ✨`, 'success');
      router.replace('/(tabs)');
    } catch {
      showToast('Failed to complete onboarding. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    // Step 0: Welcome
    <View key="welcome" style={styles.stepBox}>
      <View style={styles.welcomeHero}>
        <LinearGradient
          colors={theme.colors.primaryGradient}
          style={styles.logoCircle}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="sparkles" size={38} color="#ffffff" />
        </LinearGradient>
        <Text style={styles.appName}>Wellora</Text>
        <Text style={styles.appTagline}>Your AI Health & Longevity Assistant</Text>
      </View>

      <View style={styles.featureGrid}>
        <View style={styles.featureCard}>
          <Ionicons name="pulse-outline" size={22} color={theme.colors.calories} />
          <View style={{ flex: 1 }}>
            <Text style={styles.featureTitle}>Biometric Analytics</Text>
            <Text style={styles.featureDesc}>BMI, TDEE, macro calculations & 12-week projections.</Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <Ionicons name="chatbubbles-outline" size={22} color={theme.colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.featureTitle}>AI Wellness Coach</Text>
            <Text style={styles.featureDesc}>Personalized guidance for nutrition, workouts, sleep, and recovery.</Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <Ionicons name="flame-outline" size={22} color={theme.colors.workout} />
          <View style={{ flex: 1 }}>
            <Text style={styles.featureTitle}>Daily Habit Streaks</Text>
            <Text style={styles.featureDesc}>Real-time activity tracking with offline sync resilience.</Text>
          </View>
        </View>
      </View>
    </View>,

    // Step 1: Personal Metrics
    <View key="metrics" style={styles.stepBox}>
      <Text style={styles.stepTitle}>About You</Text>
      <Text style={styles.stepDesc}>These metrics allow Wellora to calculate personalized metabolic rates.</Text>

      <Text style={styles.label}>Your Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Alex Smith"
        placeholderTextColor={theme.colors.textMuted}
        value={name}
        onChangeText={setName}
      />

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Age (years)</Text>
          <TextInput
            style={styles.input}
            placeholder="28"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="numeric"
            value={age}
            onChangeText={setAge}
          />
        </View>

        <View style={styles.halfInput}>
          <Text style={styles.label}>Gender</Text>
          <ChipSelector options={GENDERS} selected={gender} onSelect={setGender} />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Weight (kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="72"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="numeric"
            value={weight}
            onChangeText={setWeight}
          />
        </View>

        <View style={styles.halfInput}>
          <Text style={styles.label}>Height (cm)</Text>
          <TextInput
            style={styles.input}
            placeholder="175"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="numeric"
            value={height}
            onChangeText={setHeight}
          />
        </View>
      </View>
    </View>,

    // Step 2: Goals & Targets
    <View key="goals" style={styles.stepBox}>
      <Text style={styles.stepTitle}>Your Goals & Lifestyle</Text>
      <Text style={styles.stepDesc}>Select your active lifestyle and daily wellness ambitions.</Text>

      <Text style={styles.label}>Activity Level</Text>
      <ChipSelector options={ACTIVITY_LEVELS} selected={activityLevel} onSelect={setActivityLevel} />

      <Text style={[styles.label, { marginTop: 14 }]}>Primary Health Goals</Text>
      <ChipSelector
        options={HEALTH_GOALS}
        selected={healthGoals}
        onSelect={(v) => toggleMulti(v, healthGoals, setHealthGoals)}
        multi
      />

      <Text style={[styles.label, { marginTop: 14 }]}>Dietary Preferences (Optional)</Text>
      <ChipSelector
        options={DIETARY_OPTIONS}
        selected={dietaryPreferences}
        onSelect={(v) => toggleMulti(v, dietaryPreferences, setDietaryPreferences)}
        multi
      />

      <Text style={[styles.label, { marginTop: 14 }]}>Daily Targets</Text>
      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.miniLabel}>Calories (kcal)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={targetCalories}
            onChangeText={setTargetCalories}
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>
        <View style={styles.halfInput}>
          <Text style={styles.miniLabel}>Water (Liters)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={targetWater}
            onChangeText={setTargetWater}
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>
      </View>
    </View>,
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Step Indicator */}
        <View style={styles.progressRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
          ))}
        </View>

        {steps[step]}

        {/* Navigation Buttons */}
        <View style={styles.buttonsRow}>
          {step > 0 && (
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)} accessibilityLabel="Go back">
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.nextBtnWrap} onPress={handleNext} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={theme.colors.accentGradient} style={styles.nextBtn}>
              <Text style={styles.nextBtnText}>{loading ? 'Saving...' : step < 2 ? 'Continue' : 'Get Started ✨'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { paddingHorizontal: 22, paddingVertical: 20 },
  progressRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.surfaceBorder,
  },
  progressDotActive: { backgroundColor: theme.colors.accent },
  stepBox: { marginBottom: 20 },
  welcomeHero: { alignItems: 'center', marginVertical: 20 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  appName: { fontSize: 32, fontWeight: '900', color: theme.colors.text, letterSpacing: -0.5 },
  appTagline: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
  featureGrid: { gap: 12, marginTop: 16 },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  featureTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  featureDesc: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2, lineHeight: 16 },
  stepTitle: { fontSize: 24, fontWeight: '800', color: theme.colors.text, marginBottom: 6 },
  stepDesc: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 20 },
  label: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  miniLabel: { color: theme.colors.textMuted, fontSize: 11, marginBottom: 4 },
  input: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    fontSize: 15,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  buttonsRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  backBtn: {
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  backBtnText: { color: theme.colors.textSecondary, fontSize: 15, fontWeight: '600' },
  nextBtnWrap: { flex: 1, borderRadius: theme.borderRadius.md, overflow: 'hidden' },
  nextBtn: { paddingVertical: 16, alignItems: 'center' },
  nextBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
});
