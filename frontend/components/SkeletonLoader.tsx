import React, { useEffect, useRef } from 'react';
import { Animated, DimensionValue, StyleSheet, View, ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

export function ScoreCardSkeleton() {
  return (
    <View style={styles.scoreCard}>
      <View style={{ flex: 1 }}>
        <Skeleton width={110} height={14} />
        <Skeleton width={80} height={44} style={{ marginTop: 10 }} />
        <Skeleton width={120} height={22} style={{ marginTop: 10 }} />
      </View>
      <Skeleton width={64} height={64} borderRadius={32} />
    </View>
  );
}

export function GoalsSkeleton() {
  return (
    <View style={styles.goalsRow}>
      <View style={styles.goalSkeletonCard}>
        <Skeleton width={32} height={32} borderRadius={16} />
        <Skeleton width={50} height={16} style={{ marginTop: 8 }} />
        <Skeleton width={40} height={12} style={{ marginTop: 4 }} />
      </View>
      <View style={styles.goalSkeletonCard}>
        <Skeleton width={32} height={32} borderRadius={16} />
        <Skeleton width={50} height={16} style={{ marginTop: 8 }} />
        <Skeleton width={40} height={12} style={{ marginTop: 4 }} />
      </View>
      <View style={styles.goalSkeletonCard}>
        <Skeleton width={32} height={32} borderRadius={16} />
        <Skeleton width={50} height={16} style={{ marginTop: 8 }} />
        <Skeleton width={40} height={12} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

export function ChartSkeleton() {
  return (
    <View style={styles.chart}>
      <Skeleton width="100%" height={180} borderRadius={16} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: theme.colors.surfaceBorder,
  },
  scoreCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  goalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  goalSkeletonCard: {
    width: '31%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  chart: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
});
