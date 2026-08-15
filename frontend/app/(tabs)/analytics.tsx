import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { useFocusEffect, useRouter } from 'expo-router';

import { ChartSkeleton } from '@/components/SkeletonLoader';
import { useToast } from '@/components/Toast';
import { theme } from '@/constants/theme';
import { generateReport } from '@/lib/api';
import { isProfileComplete, loadProfile } from '@/lib/storage';
import { HealthReport, UserProfile } from '@/lib/types';

export default function AnalyticsScreen() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileComplete, setProfileComplete] = useState(true);
  const [userProfile, setUserProfile] = useState<Partial<UserProfile>>({});
  const [reportData, setReportData] = useState<HealthReport | null>(null);

  const screenWidth = Dimensions.get('window').width;

  const fetchAnalytics = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const complete = await isProfileComplete();
      setProfileComplete(complete);

      const profile = await loadProfile();
      setUserProfile(profile);

      if (complete && profile.age && profile.weight && profile.height) {
        const report = await generateReport(profile);
        setReportData(report);
      }
    } catch {
      showToast('Could not load report. Please check server.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useFocusEffect(
    useCallback(() => {
      fetchAnalytics();
    }, [fetchAnalytics])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics(true);
  };

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surfaceSubtle,
    color: (opacity = 1) => `rgba(79, 172, 254, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.6,
    useShadowColorFromDataset: false,
    decimalPlaces: 1,
    labelColor: (opacity = 1) => `rgba(165, 163, 194, ${opacity})`,
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Health Analytics</Text>
            <Text style={styles.subtitle}>Personalized Projections & Macros</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => fetchAnalytics()}
            accessibilityLabel="Refresh Report"
          >
            <Ionicons name="refresh" size={22} color={theme.colors.accent} />
          </TouchableOpacity>
        </View>

        {/* If Profile Incomplete */}
        {!profileComplete && !loading && (
          <View style={styles.card}>
            <Ionicons name="alert-circle" size={32} color={theme.colors.warning} />
            <Text style={styles.incompleteTitle}>Complete Your Profile</Text>
            <Text style={styles.incompleteSub}>
              To calculate accurate BMI, TDEE, macro breakdowns, and 12-week weight projections,
              please input your age, weight, and height.
            </Text>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push('/profile')}
            >
              <LinearGradient colors={theme.colors.accentGradient} style={styles.gradientBtn}>
                <Text style={styles.btnText}>Go to Profile</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {loading && (
          <View style={{ gap: 16, marginTop: 10 }}>
            <ChartSkeleton />
            <ChartSkeleton />
          </View>
        )}

        {/* Report Content */}
        {reportData && !loading && (
          <View style={styles.resultsContainer}>
            {/* Key Metrics Row */}
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>BMI Score</Text>
                <Text style={styles.metricValue}>{reportData.bmi}</Text>
                <View
                  style={[
                    styles.metricBadge,
                    {
                      backgroundColor:
                        reportData.bmi_category === 'Normal'
                          ? 'rgba(16, 185, 129, 0.2)'
                          : 'rgba(245, 158, 11, 0.2)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.metricSub,
                      {
                        color:
                          reportData.bmi_category === 'Normal'
                            ? theme.colors.success
                            : theme.colors.warning,
                      },
                    ]}
                  >
                    {reportData.bmi_category}
                  </Text>
                </View>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Daily Calorie Target</Text>
                <Text style={styles.metricValue}>{reportData.daily_calories}</Text>
                <Text style={styles.metricSubMuted}>
                  {reportData.tdee ? `TDEE: ~${reportData.tdee} kcal` : 'kcal / day'}
                </Text>
              </View>
            </View>

            {/* BMI Reference Chart */}
            <Text style={styles.chartTitle}>BMI Category Spectrum</Text>
            <View style={styles.chartCard}>
              <BarChart
                data={{
                  labels: ['Under', 'Normal', 'Over', 'Obese', 'You'],
                  datasets: [
                    {
                      data: [18.5, 24.9, 29.9, 35, reportData.bmi],
                    },
                  ],
                }}
                width={screenWidth - 56}
                height={200}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(79, 172, 254, ${opacity})`,
                }}
                showValuesOnTopOfBars
                style={{ borderRadius: 16, paddingRight: 20 }}
              />
            </View>

            {/* Recommended Macros Breakdown */}
            <Text style={styles.chartTitle}>Target Daily Macros</Text>
            <View style={styles.chartCard}>
              {reportData.charts.macros.grams && (
                <View style={styles.macroGramsRow}>
                  <View style={styles.macroStat}>
                    <Text style={[styles.macroVal, { color: theme.colors.calories }]}>
                      {reportData.charts.macros.grams.protein}g
                    </Text>
                    <Text style={styles.macroName}>Protein (35%)</Text>
                  </View>
                  <View style={styles.macroStat}>
                    <Text style={[styles.macroVal, { color: theme.colors.steps }]}>
                      {reportData.charts.macros.grams.carbs}g
                    </Text>
                    <Text style={styles.macroName}>Carbs (40%)</Text>
                  </View>
                  <View style={styles.macroStat}>
                    <Text style={[styles.macroVal, { color: '#FCD34D' }]}>
                      {reportData.charts.macros.grams.fats}g
                    </Text>
                    <Text style={styles.macroName}>Fats (25%)</Text>
                  </View>
                </View>
              )}

              <PieChart
                data={[
                  {
                    name: 'Protein',
                    population: Math.round(
                      (reportData.daily_calories * reportData.charts.macros.data[0]) / 4
                    ),
                    color: theme.colors.calories,
                    legendFontColor: theme.colors.textSecondary,
                    legendFontSize: 13,
                  },
                  {
                    name: 'Carbs',
                    population: Math.round(
                      (reportData.daily_calories * reportData.charts.macros.data[1]) / 4
                    ),
                    color: theme.colors.steps,
                    legendFontColor: theme.colors.textSecondary,
                    legendFontSize: 13,
                  },
                  {
                    name: 'Fats',
                    population: Math.round(
                      (reportData.daily_calories * reportData.charts.macros.data[2]) / 9
                    ),
                    color: '#FCD34D',
                    legendFontColor: theme.colors.textSecondary,
                    legendFontSize: 13,
                  },
                ]}
                width={screenWidth - 56}
                height={190}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                center={[8, 0]}
                absolute
              />
            </View>

            {/* 12-Week Weight Projection */}
            <Text style={styles.chartTitle}>12-Week Weight Trajectory</Text>
            <View style={styles.chartCard}>
              <LineChart
                data={{
                  labels: ['W1', 'W3', 'W6', 'W9', 'W12'],
                  datasets: [
                    {
                      data: [
                        reportData.charts.weight_projection.weights
                          ? reportData.charts.weight_projection.weights[0]
                          : 0,
                        reportData.charts.weight_projection.weights
                          ? reportData.charts.weight_projection.weights[2]
                          : 0,
                        reportData.charts.weight_projection.weights
                          ? reportData.charts.weight_projection.weights[5]
                          : 0,
                        reportData.charts.weight_projection.weights
                          ? reportData.charts.weight_projection.weights[8]
                          : 0,
                        reportData.charts.weight_projection.weights
                          ? reportData.charts.weight_projection.weights[11]
                          : 0,
                      ],
                    },
                  ],
                }}
                width={screenWidth - 56}
                height={200}
                yAxisLabel=""
                yAxisSuffix="kg"
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                  propsForDots: {
                    r: '5',
                    strokeWidth: '2',
                    stroke: '#10B981',
                  },
                }}
                bezier
                style={{ borderRadius: 16, paddingRight: 40 }}
              />
            </View>

            {/* Actionable Recommendations */}
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="bulb-outline" size={22} color={theme.colors.accent} />
                <Text style={styles.cardTitle}>Personalized Recommendations</Text>
              </View>

              {reportData.recommendations.map((rec, index) => (
                <View key={index} style={styles.recItem}>
                  <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                  <Text style={styles.recText}>{rec}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
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
  refreshBtn: {
    padding: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    alignItems: 'center',
  },
  incompleteTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
  },
  incompleteSub: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  actionBtn: {
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    width: '100%',
  },
  gradientBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  resultsContainer: {
    gap: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metricCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  metricLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  metricValue: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  metricBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 6,
  },
  metricSub: {
    fontSize: 12,
    fontWeight: '700',
  },
  metricSubMuted: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 6,
  },
  chartTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 10,
  },
  chartCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    alignItems: 'center',
  },
  macroGramsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 10,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorder,
  },
  macroStat: {
    alignItems: 'center',
  },
  macroVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  macroName: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  recItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
    width: '100%',
  },
  recText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
});
