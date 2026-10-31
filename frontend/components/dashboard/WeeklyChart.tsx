import React, { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

import { Segmented } from '@/components/ui';
import { theme } from '@/constants/theme';
import { WeeklyHistory } from '@/lib/types';

const METRICS = [
  { value: 'workout', label: 'Exercise', color: '52, 211, 153', suffix: 'm' },
  { value: 'meal', label: 'Calories', color: '255, 107, 107', suffix: '' },
  { value: 'water', label: 'Water', color: '56, 189, 248', suffix: 'L' },
] as const;

type Metric = (typeof METRICS)[number]['value'];

export function WeeklyChart({ history }: { history: WeeklyHistory }) {
  const [metric, setMetric] = useState<Metric>('workout');
  const { width } = useWindowDimensions();
  const config = METRICS.find((m) => m.value === metric)!;
  const raw = metric === 'workout' ? history.workout_data : metric === 'meal' ? history.meal_data : history.water_data;
  const data = raw?.length === 7 ? raw : [0, 0, 0, 0, 0, 0, 0];

  return (
    <View>
      <Segmented options={METRICS} value={metric} onChange={setMetric} color={`rgb(${config.color})`} />
      <View style={styles.card}>
        <LineChart
          data={{ labels: history.labels, datasets: [{ data }] }}
          width={Math.min(width, 760) - 48}
          height={190}
          yAxisSuffix={config.suffix}
          yAxisLabel=""
          fromZero
          chartConfig={{
            backgroundColor: theme.colors.surface,
            backgroundGradientFrom: theme.colors.surface,
            backgroundGradientTo: theme.colors.surfaceSubtle,
            decimalPlaces: metric === 'water' ? 1 : 0,
            color: (o = 1) => `rgba(${config.color}, ${o})`,
            labelColor: (o = 1) => `rgba(165, 163, 194, ${o})`,
            propsForDots: { r: '4', strokeWidth: '2', stroke: `rgb(${config.color})` },
          }}
          bezier
          style={styles.chart}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: theme.borderRadius.lg, overflow: 'hidden', marginBottom: 14 },
  chart: { borderRadius: theme.borderRadius.lg },
});
