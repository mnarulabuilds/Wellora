import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  compact?: boolean;
  accessibilityLabel?: string;
}

const BG: Record<Variant, string> = {
  primary: theme.colors.primary,
  secondary: theme.colors.surfaceSubtle,
  ghost: 'transparent',
  danger: 'rgba(239, 68, 68, 0.14)',
};
const FG: Record<Variant, string> = {
  primary: '#ffffff',
  secondary: theme.colors.text,
  ghost: theme.colors.accent,
  danger: theme.colors.error,
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
  compact,
  accessibilityLabel,
}: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        { backgroundColor: BG[variant], opacity: inactive ? 0.5 : pressed ? 0.8 : 1 },
        variant === 'secondary' && styles.bordered,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={FG[variant]} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={compact ? 16 : 18} color={FG[variant]} />}
          <Text style={[styles.label, compact && styles.labelCompact, { color: FG[variant] }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  compact: { minHeight: 36, paddingHorizontal: 12, borderRadius: theme.borderRadius.sm },
  bordered: { borderWidth: 1, borderColor: theme.colors.surfaceBorder },
  label: { fontSize: 15, fontWeight: '700' },
  labelCompact: { fontSize: 13 },
});
