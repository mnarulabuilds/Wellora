import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { theme } from '@/constants/theme';

interface FieldProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string | null;
  suffix?: string;
}

export function Field({ label, hint, error, suffix, style, ...inputProps }: FieldProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error ? styles.inputError : null]}>
        <TextInput
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, style]}
          accessibilityLabel={label}
          {...inputProps}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14, flex: 1 },
  label: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 14,
  },
  inputError: { borderColor: theme.colors.error },
  input: { flex: 1, color: theme.colors.text, fontSize: 16, paddingVertical: 12 },
  suffix: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '600', marginLeft: 8 },
  hint: { color: theme.colors.textMuted, fontSize: 12, marginTop: 5 },
  error: { color: theme.colors.error, fontSize: 12, marginTop: 5, fontWeight: '600' },
});
