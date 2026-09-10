import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import {
  decomposeSeconds,
  composeSeconds,
  formatDurationDetailed,
  formatDurationBadge,
} from '@/utils/time';
import { ThemeColors } from '@/constants/theme';

interface ExerciseDurationModalProps {
  visible: boolean;
  initialSeconds: number;
  exerciseName?: string;
  onSave: (totalSeconds: number) => void;
  onClose: () => void;
}

export default function ExerciseDurationModal({
  visible,
  initialSeconds,
  exerciseName,
  onSave,
  onClose,
}: ExerciseDurationModalProps) {
  const colors = useThemeColors();
  const styles = getStyles(colors);
  const { t, language } = useTranslation();

  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(30);

  useEffect(() => {
    if (visible) {
      const decomposed = decomposeSeconds(initialSeconds || 30);
      setHours(decomposed.hours);
      setMinutes(decomposed.minutes);
      setSeconds(decomposed.seconds);
    }
  }, [visible, initialSeconds]);

  const totalCalculatedSeconds = composeSeconds(hours, minutes, seconds);

  const handleStepHours = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHours((prev) => Math.max(0, Math.min(23, prev + delta)));
  };

  const handleStepMinutes = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMinutes((prev) => {
      const next = prev + delta;
      if (next < 0) return 0;
      if (next > 59) return 59;
      return next;
    });
  };

  const handleStepSeconds = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSeconds((prev) => {
      const next = prev + delta;
      if (next < 0) return 0;
      if (next > 59) return 59;
      return next;
    });
  };

  const handleSelectPreset = (presetSeconds: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const decomposed = decomposeSeconds(presetSeconds);
    setHours(decomposed.hours);
    setMinutes(decomposed.minutes);
    setSeconds(decomposed.seconds);
  };

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(Math.max(1, totalCalculatedSeconds));
    onClose();
  };

  const pad = (n: number) => n.toString().padStart(2, '0');

  const presets = [
    { label: language === 'id' ? '15 dtk' : '15s', sec: 15 },
    { label: language === 'id' ? '30 dtk' : '30s', sec: 30 },
    { label: language === 'id' ? '45 dtk' : '45s', sec: 45 },
    { label: language === 'id' ? '1 mnt' : '1m', sec: 60 },
    { label: language === 'id' ? '1.5 mnt' : '1.5m', sec: 90 },
    { label: language === 'id' ? '2 mnt' : '2m', sec: 120 },
    { label: language === 'id' ? '3 mnt' : '3m', sec: 180 },
    { label: language === 'id' ? '5 mnt' : '5m', sec: 300 },
    { label: language === 'id' ? '10 mnt' : '10m', sec: 600 },
    { label: language === 'id' ? '15 mnt' : '15m', sec: 900 },
    { label: language === 'id' ? '20 mnt' : '20m', sec: 1200 },
    { label: language === 'id' ? '30 mnt' : '30m', sec: 1800 },
    { label: language === 'id' ? '45 mnt' : '45m', sec: 2700 },
    { label: language === 'id' ? '1 jam' : '1h', sec: 3600 },
    { label: language === 'id' ? '1.5 jam' : '1.5h', sec: 5400 },
  ];

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheetCard}>
          {/* Top Grab Bar */}
          <View style={styles.grabBar} />

          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.iconWrap}>
                <Ionicons name="timer" size={20} color={colors.primaryAction} />
              </View>
              <View>
                <Text style={styles.title}>{t('set_duration_title')}</Text>
                {exerciseName ? (
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {exerciseName}
                  </Text>
                ) : (
                  <Text style={styles.subtitle}>{t('set_duration_desc')}</Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollBody}
          >
            {/* Live Clock Preview Box */}
            <View style={styles.previewBox}>
              <View style={styles.digitsRow}>
                <Text style={styles.previewDigits}>
                  {pad(hours)}
                </Text>
                <Text style={styles.previewSeparator}>:</Text>
                <Text style={styles.previewDigits}>
                  {pad(minutes)}
                </Text>
                <Text style={styles.previewSeparator}>:</Text>
                <Text style={styles.previewDigits}>
                  {pad(seconds)}
                </Text>
              </View>

              <Text style={styles.previewFormatted}>
                {formatDurationDetailed(totalCalculatedSeconds, language)}
              </Text>
            </View>

            {/* 3 Column Controls: Jam, Menit, Detik */}
            <View style={styles.columnsContainer}>
              {/* Hours Column */}
              <View style={styles.timeColumn}>
                <Text style={styles.columnLabel}>{t('hours').toUpperCase()}</Text>
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleStepHours(1)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={18} color={colors.textPrimary} />
                  </TouchableOpacity>

                  <TextInput
                    style={styles.columnInput}
                    keyboardType="number-pad"
                    value={hours.toString()}
                    onChangeText={(val) => {
                      const clean = parseInt(val.replace(/[^0-9]/g, ''), 10);
                      setHours(isNaN(clean) ? 0 : Math.min(23, clean));
                    }}
                    selectTextOnFocus
                  />

                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleStepHours(-1)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="remove" size={18} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Minutes Column */}
              <View style={styles.timeColumn}>
                <Text style={styles.columnLabel}>{t('minutes').toUpperCase()}</Text>
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleStepMinutes(1)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={18} color={colors.textPrimary} />
                  </TouchableOpacity>

                  <TextInput
                    style={styles.columnInput}
                    keyboardType="number-pad"
                    value={minutes.toString()}
                    onChangeText={(val) => {
                      const clean = parseInt(val.replace(/[^0-9]/g, ''), 10);
                      setMinutes(isNaN(clean) ? 0 : Math.min(59, clean));
                    }}
                    selectTextOnFocus
                  />

                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleStepMinutes(-1)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="remove" size={18} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Seconds Column */}
              <View style={styles.timeColumn}>
                <Text style={styles.columnLabel}>{t('seconds').toUpperCase()}</Text>
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleStepSeconds(5)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={18} color={colors.textPrimary} />
                  </TouchableOpacity>

                  <TextInput
                    style={styles.columnInput}
                    keyboardType="number-pad"
                    value={seconds.toString()}
                    onChangeText={(val) => {
                      const clean = parseInt(val.replace(/[^0-9]/g, ''), 10);
                      setSeconds(isNaN(clean) ? 0 : Math.min(59, clean));
                    }}
                    selectTextOnFocus
                  />

                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleStepSeconds(-5)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="remove" size={18} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Quick Presets */}
            <View style={styles.presetsSection}>
              <Text style={styles.presetsTitle}>{t('quick_presets')}</Text>
              <View style={styles.presetChipsWrap}>
                {presets.map((preset) => {
                  const isSelected = totalCalculatedSeconds === preset.sec;
                  return (
                    <TouchableOpacity
                      key={preset.sec}
                      style={[
                        styles.presetChip,
                        isSelected && styles.presetChipActive,
                      ]}
                      onPress={() => handleSelectPreset(preset.sec)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          isSelected && styles.presetChipTextActive,
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionsDock}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={styles.applyBtnText}>{t('apply_duration')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const getStyles = (c: ThemeColors) => {
  const isDark = c.background === '#0B0C0E';

  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'flex-end',
    },
    backdropTouch: {
      flex: 1,
    },
    sheetCard: {
      backgroundColor: c.cardSurface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderTopWidth: 1,
      borderColor: c.borderSubtle,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: Platform.OS === 'ios' ? 34 : 20,
      maxHeight: '88%',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
        },
        android: {
          elevation: 16,
        },
      }),
    },
    grabBar: {
      width: 44,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
      alignSelf: 'center',
      marginBottom: 16,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    iconWrap: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 17,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: '500',
      marginTop: 2,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.surfaceHighlight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollBody: {
      paddingBottom: 16,
    },
    previewBox: {
      backgroundColor: c.surfaceHighlight,
      borderRadius: 20,
      paddingVertical: 18,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    digitsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    previewDigits: {
      fontSize: 34,
      fontWeight: '900',
      color: c.primaryAction,
      fontVariant: ['tabular-nums'],
      letterSpacing: 1,
    },
    previewSeparator: {
      fontSize: 26,
      fontWeight: '800',
      color: c.textSecondary,
      opacity: 0.6,
      marginBottom: 2,
    },
    previewFormatted: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textSecondary,
      marginTop: 6,
    },
    columnsContainer: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 20,
    },
    timeColumn: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
      borderRadius: 18,
      paddingVertical: 12,
      paddingHorizontal: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    columnLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: c.textSecondary,
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    stepperContainer: {
      alignItems: 'center',
      gap: 6,
      width: '100%',
    },
    stepperBtn: {
      width: '100%',
      height: 34,
      borderRadius: 10,
      backgroundColor: c.cardSurface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    columnInput: {
      width: '100%',
      fontSize: 22,
      fontWeight: '900',
      color: c.textPrimary,
      textAlign: 'center',
      paddingVertical: 4,
      includeFontPadding: false,
      fontVariant: ['tabular-nums'],
    },
    presetsSection: {
      marginBottom: 10,
    },
    presetsTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 10,
    },
    presetChipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    presetChip: {
      backgroundColor: c.surfaceHighlight,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    presetChipActive: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.12)',
      borderColor: c.primaryAction,
    },
    presetChipText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textPrimary,
    },
    presetChipTextActive: {
      color: c.primaryAction,
      fontWeight: '800',
    },
    actionsDock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.borderSubtle,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceHighlight,
    },
    cancelBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: c.textSecondary,
    },
    applyBtn: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 16,
      backgroundColor: c.primaryAction,
      ...Platform.select({
        ios: {
          shadowColor: c.primaryAction,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    applyBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
    },
  });
};
