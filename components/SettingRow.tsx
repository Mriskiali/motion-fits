import React from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { AppFonts } from '@/constants/theme';

interface SettingRowProps {
  icon: React.ReactNode;
  label: string;
  subLabel?: string;
  value?: boolean;
  onToggle?: (val: boolean) => void;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  colors: any;
  disabled?: boolean;
}

const SettingRow = React.memo<SettingRowProps>(({
  icon,
  label,
  subLabel,
  value,
  onToggle,
  onPress,
  rightElement,
  colors,
  disabled,
}) => {
  const styles = getStyles(colors);

  if (onPress) {
    return (
      <TouchableOpacity 
        style={styles.compactRow} 
        onPress={onPress}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <View style={styles.rowIconBox}>{icon}</View>
        <View style={styles.rowLabelWrap}>
          <Text style={styles.rowLabel}>{label}</Text>
          {subLabel && <Text style={styles.rowSubLabel}>{subLabel}</Text>}
        </View>
        {rightElement}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.compactRow}>
      <View style={styles.rowIconBox}>{icon}</View>
      <View style={styles.rowLabelWrap}>
        <Text style={styles.rowLabel}>{label}</Text>
        {subLabel && <Text style={styles.rowSubLabel}>{subLabel}</Text>}
      </View>
      {onToggle && (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: colors.borderSubtle, true: colors.primaryAction }}
          thumbColor="#fff"
          disabled={disabled}
        />
      )}
      {rightElement}
    </View>
  );
}, (prev, next) => 
  prev.value === next.value &&
  prev.label === next.label &&
  prev.subLabel === next.subLabel &&
  prev.disabled === next.disabled &&
  prev.colors === next.colors
);

const getStyles = (colors: any) => StyleSheet.create({
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.actionIconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowLabelWrap: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: AppFonts.medium,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  rowSubLabel: {
    fontFamily: AppFonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
});

export default SettingRow;
