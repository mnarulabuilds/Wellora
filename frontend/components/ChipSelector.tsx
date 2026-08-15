import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '@/constants/theme';

interface ChipOption {
  value: string;
  label: string;
}

interface ChipSelectorProps {
  options: (ChipOption | string)[];
  selected: string | string[];
  onSelect: (value: string) => void;
  multi?: boolean;
}

export function ChipSelector({ options, selected, onSelect, multi = false }: ChipSelectorProps) {
  const normalized: ChipOption[] = options.map((o) =>
    typeof o === 'string' ? { value: o, label: o.replace(/_/g, ' ') } : o
  );
  const selectedArr = Array.isArray(selected) ? selected : [selected];

  return (
    <View style={styles.container}>
      {normalized.map((option) => {
        const isSelected = selectedArr.includes(option.value);
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onSelect(option.value)}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  chipTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
