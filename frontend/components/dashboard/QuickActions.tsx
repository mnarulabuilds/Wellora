import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export interface QuickAction {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  colors: [string, string];
  onPress: () => void;
}

export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <View style={styles.grid}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.key}
          style={styles.cell}
          onPress={action.onPress}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <LinearGradient colors={action.colors} style={styles.tile} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name={action.icon} size={22} color="#fff" />
            <Text style={styles.label}>{action.label}</Text>
          </LinearGradient>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  cell: { width: '31.5%', flexGrow: 1 },
  tile: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', gap: 6 },
  label: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
