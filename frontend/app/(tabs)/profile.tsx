import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ChipSelector } from '@/components/ChipSelector';
import { useToast } from '@/components/Toast';
import { ACTIVITY_LEVELS, DIETARY_OPTIONS, GENDERS, HEALTH_GOALS, theme } from '@/constants/theme';
import { fetchProfileFromBackend, syncProfileToBackend } from '@/lib/api';
import { getUnitSystem, getUserId, loadProfile, saveProfileLocal } from '@/lib/storage';
import { UnitSystem, UserProfile } from '@/lib/types';

export default function ProfileScreen() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>('metric');

  // Form Fields
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState('male');
  const [activityLevel, setActivityLevel] = useState('light');
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
  const [healthGoals, setHealthGoals] = useState<string[]>(['maintenance']);

  // Target Goals
  const [targetCalories, setTargetCalories] = useState('2000');
  const [targetSteps, setTargetSteps] = useState('10000');
  const [targetWater, setTargetWater] = useState('2.5');
  const [targetWorkoutMinutes, setTargetWorkoutMinutes] = useState('30');

  useEffect(() => {
    const initProfile = async () => {
      try {
        const currentUserId = await getUserId();
        setUserId(currentUserId);
        const units = await getUnitSystem();
        setUnitSystemState(units);

        // Load local profile first
        const local = await loadProfile();
        setName(local.name || '');
        setAge(local.age || '');
        setWeight(local.weight || '');
        setHeight(local.height || '');
        setGender(local.gender || 'male');
        setActivityLevel(local.activityLevel || 'light');
        setDietaryPreferences(local.dietaryPreferences || []);
        setHealthGoals(local.healthGoals && local.healthGoals.length > 0 ? local.healthGoals : ['maintenance']);
        setTargetCalories(local.targetCalories || '2000');
        setTargetSteps(local.targetSteps || '10000');
        setTargetWater(local.targetWater || '2.5');
        setTargetWorkoutMinutes(local.targetWorkoutMinutes || '30');

        // Attempt remote sync
        const remote = await fetchProfileFromBackend(currentUserId);
        if (remote) {
          if (remote.name) setName(remote.name);
          if (remote.age) setAge(remote.age);
          if (remote.weight) setWeight(remote.weight);
          if (remote.height) setHeight(remote.height);
          if (remote.gender) setGender(remote.gender);
          if (remote.activityLevel) setActivityLevel(remote.activityLevel);
          if (remote.dietaryPreferences) setDietaryPreferences(remote.dietaryPreferences);
          if (remote.healthGoals && remote.healthGoals.length > 0) setHealthGoals(remote.healthGoals);
          if (remote.targetCalories) setTargetCalories(remote.targetCalories);
          if (remote.targetSteps) setTargetSteps(remote.targetSteps);
          if (remote.targetWater) setTargetWater(remote.targetWater);
          if (remote.targetWorkoutMinutes) setTargetWorkoutMinutes(remote.targetWorkoutMinutes);
        }
      } catch (err) {
        console.error('Failed to initialize profile:', err);
      } finally {
        setInitialLoading(false);
      }
    };

    initProfile();
  }, []);

  const toggleMultiSelect = (item: string, current: string[], setter: (v: string[]) => void) => {
    if (current.includes(item)) {
      if (current.length === 1 && item === 'maintenance') return;
      setter(current.filter((i) => i !== item));
    } else {
      setter([...current, item]);
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const ageNum = parseInt(age, 10);
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);

    if (!trimmedName) {
      showToast('Please enter your name.', 'error');
      return;
    }
    if (isNaN(ageNum) || ageNum < 10 || ageNum > 120) {
      showToast('Please enter a valid age (10-120).', 'error');
      return;
    }
    if (isNaN(weightNum) || weightNum < 20 || weightNum > 400) {
      showToast('Please enter a valid weight.', 'error');
      return;
    }
    if (isNaN(heightNum) || heightNum < 50 || heightNum > 280) {
      showToast('Please enter a valid height.', 'error');
      return;
    }

    setLoading(true);
    try {
      const activeUserId = userId || (await getUserId());
      const updatedProfile: UserProfile = {
        userId: activeUserId,
        name: trimmedName,
        age: String(ageNum),
        weight: String(weightNum),
        height: String(heightNum),
        gender,
        activityLevel,
        dietaryPreferences,
        healthGoals: healthGoals.length > 0 ? healthGoals : ['maintenance'],
        targetCalories: targetCalories || '2000',
        targetSteps: targetSteps || '10000',
        targetWater: targetWater || '2.5',
        targetWorkoutMinutes: targetWorkoutMinutes || '30',
      };

      // 1. Save Locally
      await saveProfileLocal(updatedProfile);

      // 2. Sync to Backend
      try {
        await syncProfileToBackend(updatedProfile);
        showToast('Profile & Goals saved successfully! ✨', 'success');
      } catch {
        showToast('Saved locally. Will sync when server is online.', 'info');
      }
    } catch {
      showToast('Failed to save profile.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Your Profile</Text>
            <Text style={styles.subtitle}>Customize your metrics & wellness targets</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => router.push('/settings')}
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Section 1: Personal Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Personal Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Alex Smith"
              placeholderTextColor={theme.colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

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
              <Text style={styles.label}>Weight ({unitSystem === 'metric' ? 'kg' : 'lbs'})</Text>
              <TextInput
                style={styles.input}
                placeholder={unitSystem === 'metric' ? '72' : '158'}
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
              />
            </View>

            <View style={styles.halfInput}>
              <Text style={styles.label}>Height ({unitSystem === 'metric' ? 'cm' : 'in'})</Text>
              <TextInput
                style={styles.input}
                placeholder={unitSystem === 'metric' ? '175' : '69'}
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                value={height}
                onChangeText={setHeight}
              />
            </View>
          </View>
        </View>

        {/* Section 2: Activity Level */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Activity Level</Text>
          <ChipSelector options={ACTIVITY_LEVELS} selected={activityLevel} onSelect={setActivityLevel} />
        </View>

        {/* Section 3: Health Goals */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Health & Wellness Goals</Text>
          <ChipSelector
            options={HEALTH_GOALS}
            selected={healthGoals}
            onSelect={(item) => toggleMultiSelect(item, healthGoals, setHealthGoals)}
            multi
          />
        </View>

        {/* Section 4: Dietary Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Dietary Preferences</Text>
          <ChipSelector
            options={DIETARY_OPTIONS}
            selected={dietaryPreferences}
            onSelect={(item) => toggleMultiSelect(item, dietaryPreferences, setDietaryPreferences)}
            multi
          />
        </View>

        {/* Section 5: Daily Target Goals */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Daily Targets</Text>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Calories (kcal)</Text>
              <TextInput
                style={styles.input}
                placeholder="2000"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                value={targetCalories}
                onChangeText={setTargetCalories}
              />
            </View>

            <View style={styles.halfInput}>
              <Text style={styles.label}>Steps Target</Text>
              <TextInput
                style={styles.input}
                placeholder="10000"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                value={targetSteps}
                onChangeText={setTargetSteps}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Water (Liters)</Text>
              <TextInput
                style={styles.input}
                placeholder="2.5"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                value={targetWater}
                onChangeText={setTargetWater}
              />
            </View>

            <View style={styles.halfInput}>
              <Text style={styles.label}>Active Exercise (mins)</Text>
              <TextInput
                style={styles.input}
                placeholder="30"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                value={targetWorkoutMinutes}
                onChangeText={setTargetWorkoutMinutes}
              />
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveBtnWrap} onPress={handleSave} disabled={loading} activeOpacity={0.85}>
          <LinearGradient colors={theme.colors.accentGradient} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>{loading ? 'Saving Profile...' : 'Save Profile & Targets'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  settingsBtn: {
    padding: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.accent,
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  halfInput: {
    flex: 1,
  },
  saveBtnWrap: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginTop: 10,
  },
  saveBtn: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
