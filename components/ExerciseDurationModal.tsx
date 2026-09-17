import React, { useState, useEffect, useMemo } from 'react';
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
import { Timer, Plus, Minus, Check, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import {
  decomposeSeconds,
  composeSeconds,
  formatDurationDetailed,
  formatDurationBadge,
} from '@/utils/time';
import { ThemeColors, AppFonts } from '@/constants/theme';

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
  const styles = useMemo(() => getStyles(colors), [colors]);
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
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.iconWrap}>
                <Timer size={18} color={colors.primaryAction} strokeWidth={2.4} />
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
              <X size={16} color={colors.textSecondary} strokeWidth={2.4} />
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
                    <Plus size={16} color={colors.textPrimary} />
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
                    <Minus size={16} color={colors.textPrimary} />
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
                    <Plus size={16} color={colors.textPrimary} />
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
                    <Minus size={16} color={colors.textPrimary} />
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
                    <Plus size={16} color={colors.textPrimary} />
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
                    <Minus size={16} color={colors.textPrimary} />
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
              <Check size={16} color="#000000" strokeWidth={2.5} />
              <Text style={styles.applyBtnText}>{t('apply_duration')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const getStyles = (c: ThemeColors) => {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.78)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    backdropTouch: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    sheetCard: {
      backgroundColor: c.cardSurface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      padding: 22,
      maxWidth: 360,
      width: '100%',
      maxHeight: '88%',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.35,
          shadowRadius: 18,
        },
        android: {
          elevation: 12,
        },
      }),
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
      marginRight: 8,
    },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontFamily: AppFonts.bold,
      fontSize: 17,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.2,
    },
    subtitle: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 1,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.surfaceHighlight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollBody: {
      paddingBottom: 8,
    },
    previewBox: {
      backgroundColor: c.elevatedSurface,
      borderRadius: 18,
      paddingVertical: 14,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    digitsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    previewDigits: {
      fontSize: 32,
      fontFamily: AppFonts.extraBold,
      fontWeight: '900',
      color: c.primaryAction,
      fontVariant: ['tabular-nums'],
      letterSpacing: 1,
    },
    previewSeparator: {
      fontSize: 24,
      fontFamily: AppFonts.bold,
      fontWeight: '800',
      color: c.textSecondary,
      opacity: 0.6,
      marginBottom: 2,
    },
    previewFormatted: {
      fontSize: 12,
      fontFamily: AppFonts.bold,
      fontWeight: '700',
      color: c.textSecondary,
      marginTop: 4,
    },
    columnsContainer: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    timeColumn: {
      flex: 1,
      backgroundColor: c.elevatedSurface,
      borderRadius: 16,
      paddingVertical: 10,
      paddingHorizontal: 6,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    columnLabel: {
      fontSize: 10,
      fontFamily: AppFonts.bold,
      fontWeight: '800',
      color: c.textSecondary,
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    stepperContainer: {
      alignItems: 'center',
      gap: 4,
      width: '100%',
    },
    stepperBtn: {
      width: '100%',
      height: 32,
      borderRadius: 8,
      backgroundColor: c.cardSurface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    columnInput: {
      width: '100%',
      fontSize: 18,
      fontFamily: AppFonts.extraBold,
      fontWeight: '900',
      color: c.textPrimary,
      textAlign: 'center',
      paddingVertical: 2,
      includeFontPadding: false,
      fontVariant: ['tabular-nums'],
    },
    presetsSection: {
      marginBottom: 8,
    },
    presetsTitle: {
      fontSize: 11,
      fontFamily: AppFonts.bold,
      fontWeight: '800',
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 8,
    },
    presetChipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    presetChip: {
      backgroundColor: c.elevatedSurface,
      paddingVertical: 6,
      paddingHorizontal: 11,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    presetChipActive: {
      backgroundColor: c.primaryAction,
      borderColor: c.primaryAction,
    },
    presetChipText: {
      fontSize: 12,
      fontFamily: AppFonts.bold,
      fontWeight: '700',
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    presetChipTextActive: {
      color: '#000000',
      fontWeight: '800',
    },
    actionsDock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.borderSubtle,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.elevatedSurface,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    cancelBtnText: {
      fontSize: 14,
      fontFamily: AppFonts.bold,
      fontWeight: '700',
      color: c.textSecondary,
    },
    applyBtn: {
      flex: 1.6,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 13,
      borderRadius: 14,
      backgroundColor: c.primaryAction,
    },
    applyBtnText: {
      fontSize: 14,
      fontFamily: AppFonts.bold,
      fontWeight: '800',
      color: '#000000',
    },
  });
};
