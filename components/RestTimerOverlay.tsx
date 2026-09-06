import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Vibration,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useUserStore } from '@/store/useUserStore';
import {
  scheduleRestTimerNotification,
  cancelNotification,
  showRestTimerFinishedNotification,
} from '@/utils/notifications';
import { useTranslation } from '@/hooks/useTranslation';
import {
  playTimerSound,
  triggerTimerFinishedVibration,
  triggerCountdownTickVibration,
  triggerButtonVibration,
} from '@/utils/soundPlayer';

interface RestTimerOverlayProps {
  visible: boolean;
  initialTime: number; // in seconds
  onClose: () => void;
  onCancelSet?: () => void;
}

export default function RestTimerOverlay({
  visible,
  initialTime,
  onClose,
  onCancelSet,
}: RestTimerOverlayProps) {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isConfiguring, setIsConfiguring] = useState(initialTime <= 0);
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [isEditing, setIsEditing] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const notificationIdRef = useRef<string | null>(null);
  const setupNotificationIdRef = useRef<number>(0);
  const targetEndTimeRef = useRef<number | null>(null);
  const { hapticsEnabled, audioNotification } = useUserStore();

  // Track max time to correctly render the SVG progress ring
  const [maxTime, setMaxTime] = useState(initialTime > 0 ? initialTime : 60);
  const colors = useThemeColors();
  const styles = getStyles(colors);

  const setupNotification = async (seconds: number) => {
    const currentSetupId = ++setupNotificationIdRef.current;

    if (notificationIdRef.current) {
      await cancelNotification(notificationIdRef.current);
      notificationIdRef.current = null;
    }

    if (seconds > 0) {
      const id = await scheduleRestTimerNotification(seconds);
      if (currentSetupId !== setupNotificationIdRef.current) {
        if (id) cancelNotification(id);
        return;
      }
      notificationIdRef.current = id;
    }
  };

  useEffect(() => {
    if (visible) {
      if (initialTime > 0) {
        targetEndTimeRef.current = Date.now() + initialTime * 1000;
        setTimeLeft(initialTime);
        setMaxTime(initialTime);
        setIsConfiguring(false);
        setIsRunning(true);
        setIsEditing(false);
        setupNotification(initialTime);
      } else {
        // User opened timer manually without default time: Prompt duration first
        targetEndTimeRef.current = null;
        setTimeLeft(0);
        setMaxTime(60);
        setSelectedDuration(60);
        setIsConfiguring(true);
        setIsRunning(false);
        setIsEditing(false);
      }
    } else {
      // Reset state when hiding
      targetEndTimeRef.current = null;
      setTimeLeft(initialTime);
      setIsConfiguring(false);
      setIsRunning(false);
      setIsEditing(false);
      if (notificationIdRef.current) cancelNotification(notificationIdRef.current);
    }
  }, [visible, initialTime]);

  useEffect(() => {
    if (!visible || isConfiguring || !isRunning) return;

    if (timeLeft <= 0) {
      triggerTimerFinishedVibration(hapticsEnabled);
      playTimerSound(audioNotification);
      showRestTimerFinishedNotification().catch(() => {});

      if (notificationIdRef.current) {
        cancelNotification(notificationIdRef.current);
        notificationIdRef.current = null;
      }
      setIsRunning(false);
      onClose();
      return;
    }

    if (timeLeft <= 3 && timeLeft > 0) {
      triggerCountdownTickVibration(hapticsEnabled);
    }

    const timerId = setInterval(() => {
      if (targetEndTimeRef.current) {
        const remaining = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000));
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, visible, isConfiguring, isRunning]);

  const startCustomTimer = (seconds: number) => {
    if (seconds <= 0) return;
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      Vibration.vibrate(70);
    }
    targetEndTimeRef.current = Date.now() + seconds * 1000;
    setTimeLeft(seconds);
    setMaxTime(seconds);
    setIsConfiguring(false);
    setIsRunning(true);
    setIsEditing(false);
    setupNotification(seconds);
    Keyboard.dismiss();
  };

  const adjustTime = (amount: number) => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      Vibration.vibrate(70);
    }
    setTimeLeft((prev) => {
      const newTime = Math.max(0, prev + amount);
      targetEndTimeRef.current = Date.now() + newTime * 1000;
      setMaxTime((currentMax) => (newTime > currentMax ? newTime : currentMax));
      setTimeout(() => setupNotification(newTime), 0);
      return newTime;
    });
  };

  const handleApplyPresetInModal = (seconds: number) => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      Vibration.vibrate(50);
    }
    targetEndTimeRef.current = Date.now() + seconds * 1000;
    setTimeLeft(seconds);
    setMaxTime(seconds);
    setIsEditing(false);
    setupNotification(seconds);
    Keyboard.dismiss();
  };

  const handleManualApplyInModal = () => {
    const parsed = parseInt(manualInput, 10);
    if (!isNaN(parsed) && parsed > 0) {
      if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      targetEndTimeRef.current = Date.now() + parsed * 1000;
      setTimeLeft(parsed);
      setMaxTime(parsed);
      setIsEditing(false);
      setupNotification(parsed);
    } else {
      setIsEditing(false);
    }
    setManualInput('');
    Keyboard.dismiss();
  };

  const handleSkip = async () => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (notificationIdRef.current) await cancelNotification(notificationIdRef.current);
    setIsRunning(false);
    onClose();
  };

  const handleCancelSet = async () => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (notificationIdRef.current) await cancelNotification(notificationIdRef.current);
    setIsRunning(false);
    if (onCancelSet) onCancelSet();
  };

  // SVG Geometry
  const size = 280;
  const strokeWidth = 14;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = maxTime > 0 ? timeLeft / maxTime : 0;
  const strokeDashoffset = circumference * (1 - Math.min(1, Math.max(0, progress)));

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const isDark = colors.background === '#0B0C0E';
  const gradStart = isDark ? '#38BDF8' : '#1B4D3E';
  const gradEnd = isDark ? '#818CF8' : '#22C55E';
  const ringTrackColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  const parsedManual = parseInt(manualInput, 10);
  const activeChosenSeconds = !isNaN(parsedManual) && parsedManual > 0 ? parsedManual : selectedDuration;
  const previewMinutes = Math.floor(activeChosenSeconds / 60);
  const previewSeconds = activeChosenSeconds % 60;
  const previewFormatted = `${previewMinutes}:${previewSeconds.toString().padStart(2, '0')}`;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* If user needs to choose rest time before starting (Modern Popup Card) */}
          {isConfiguring ? (
            <View style={styles.popupWrapper}>
              <View style={styles.popupCard}>
                {/* Popup Top Row */}
                <View style={styles.popupHeaderRow}>
                  <View style={styles.popupBadge}>
                    <Ionicons name="timer" size={15} color={colors.primaryAction} />
                    <Text style={styles.popupBadgeText}>{t('rest_period').toUpperCase()}</Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleCancelSet}
                    style={styles.popupCloseBtn}
                  >
                    <Ionicons name="close" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Title & Subtitle */}
                <Text style={styles.popupTitle}>{t('select_rest_duration')}</Text>
                <Text style={styles.popupSubtitle}>{t('rest_timer_hint')}</Text>

                {/* Big Visual Preview Box of Chosen Time */}
                <View style={styles.previewContainer}>
                  <Text style={styles.previewLabel}>{t('selected_duration')}</Text>
                  <Text style={styles.previewDigits}>{previewFormatted}</Text>
                  <Text style={styles.previewSubtext}>
                    {activeChosenSeconds} {t('seconds')}
                  </Text>
                </View>

                {/* Presets Grid */}
                <View style={styles.presetGrid}>
                  {[30, 45, 60, 90, 120, 180].map((preset) => {
                    const isSelected = selectedDuration === preset && !manualInput;
                    return (
                      <TouchableOpacity
                        key={preset}
                        activeOpacity={0.75}
                        style={[
                          styles.setupPresetPill,
                          isSelected && styles.setupPresetPillActive,
                        ]}
                        onPress={() => {
                          if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedDuration(preset);
                          setManualInput('');
                        }}
                      >
                        <Text
                          style={[
                            styles.setupPresetText,
                            isSelected && styles.setupPresetTextActive,
                          ]}
                        >
                          {preset}
                          {t('seconds_short')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.sheetSubtitle}>{t('or_enter_seconds')}</Text>

                {/* Custom Numeric Input */}
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.sheetInput}
                    keyboardType="number-pad"
                    placeholder={t('rest_timer_input_placeholder')}
                    placeholderTextColor={colors.textMuted}
                    value={manualInput}
                    onChangeText={(val) => {
                      setManualInput(val);
                      const parsed = parseInt(val, 10);
                      if (!isNaN(parsed) && parsed > 0) {
                        setSelectedDuration(parsed);
                      }
                    }}
                    maxLength={4}
                  />
                </View>

                {/* Action Buttons */}
                <View style={styles.setupActions}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.setupCancelBtn}
                    onPress={handleCancelSet}
                  >
                    <Text style={styles.setupCancelBtnText}>{t('cancel')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.setupStartBtn}
                    onPress={() => {
                      startCustomTimer(activeChosenSeconds);
                    }}
                  >
                    <Ionicons name="play" size={18} color="#FFFFFF" />
                    <Text style={styles.setupStartBtnText}>{t('start_rest')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <>
              {/* Top Header Pill & Subtitle (during active timer) */}
              <View style={styles.header}>
                <View style={styles.badgePill}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.badgeText}>{t('rest_period').toUpperCase()}</Text>
                </View>
                <Text style={styles.subtitle}>{t('catch_breath')}</Text>
              </View>

              {/* Hero Circular Progress Ring */}
              <View style={styles.heroSection}>
                <View style={styles.ringContainer}>
                  <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <Defs>
                      <LinearGradient id="restTimerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor={gradStart} />
                        <Stop offset="100%" stopColor={gradEnd} />
                      </LinearGradient>
                    </Defs>
                    {/* Background Ring Track */}
                    <Circle
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      stroke={ringTrackColor}
                      strokeWidth={strokeWidth}
                      fill="none"
                    />
                    {/* Active Progress Ring */}
                    <Circle
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      stroke="url(#restTimerGrad)"
                      strokeWidth={strokeWidth}
                      strokeDasharray={`${circumference}`}
                      strokeDashoffset={`${strokeDashoffset}`}
                      strokeLinecap="round"
                      fill="none"
                      transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    />
                  </Svg>

                  {/* Center Countdown Display */}
                  <View style={styles.centerContent}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setIsEditing(true);
                      }}
                      style={styles.timerTouchTarget}
                    >
                      <Text style={styles.timerDigits}>{formattedTime}</Text>
                      <View style={styles.editBadge}>
                        <Ionicons name="pencil-sharp" size={12} color={colors.textSecondary} />
                        <Text style={styles.editBadgeText}>{t('edit')}</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Quick Adjustment Chips Row */}
              <View style={styles.chipsRow}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={styles.chipButton}
                  onPress={() => adjustTime(-15)}
                >
                  <Ionicons name="remove" size={16} color={colors.textPrimary} />
                  <Text style={styles.chipText}>15{t('seconds_short')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.75}
                  style={styles.chipButton}
                  onPress={() => adjustTime(15)}
                >
                  <Ionicons name="add" size={16} color={colors.textPrimary} />
                  <Text style={styles.chipText}>15{t('seconds_short')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.75}
                  style={styles.chipButton}
                  onPress={() => adjustTime(30)}
                >
                  <Ionicons name="add" size={16} color={colors.textPrimary} />
                  <Text style={styles.chipText}>30{t('seconds_short')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.75}
                  style={[styles.chipButton, styles.customChipButton]}
                  onPress={() => {
                    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsEditing(true);
                  }}
                >
                  <Ionicons name="options-outline" size={16} color={colors.textPrimary} />
                  <Text style={styles.chipText}>{t('custom')}</Text>
                </TouchableOpacity>
              </View>

              {/* Bottom Action Dock */}
              <View style={styles.actionDock}>
                {onCancelSet && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.undoButton}
                    onPress={handleCancelSet}
                  >
                    <Ionicons name="arrow-undo-outline" size={18} color={colors.danger} />
                    <Text style={styles.undoButtonText}>{t('undo_last_set')}</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.skipButton}
                  onPress={handleSkip}
                >
                  <Text style={styles.skipButtonText}>{t('skip')}</Text>
                  <Ionicons name="play-forward" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Custom Duration Sheet Modal (when editing during active timer) */}
          {isEditing && (
            <Modal visible={isEditing} transparent animationType="fade">
              <TouchableOpacity
                style={styles.customModalBackdrop}
                activeOpacity={1}
                onPress={() => {
                  Keyboard.dismiss();
                  setIsEditing(false);
                }}
              >
                <View style={styles.customSheetCard} onStartShouldSetResponder={() => true}>
                  <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>{t('rest_timer')}</Text>
                    <TouchableOpacity
                      onPress={() => setIsEditing(false)}
                      style={styles.sheetCloseBtn}
                    >
                      <Ionicons name="close" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.sheetSubtitle}>{t('or_enter_seconds')}</Text>

                  {/* Quick Preset Grid */}
                  <View style={styles.presetGrid}>
                    {[30, 45, 60, 90, 120, 180].map((preset) => (
                      <TouchableOpacity
                        key={preset}
                        style={[
                          styles.presetPill,
                          timeLeft === preset && styles.presetPillActive,
                        ]}
                        onPress={() => handleApplyPresetInModal(preset)}
                      >
                        <Text
                          style={[
                            styles.presetPillText,
                            timeLeft === preset && styles.presetPillTextActive,
                          ]}
                        >
                          {preset}
                          {t('seconds_short')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Manual Input Row */}
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.sheetInput}
                      keyboardType="number-pad"
                      placeholder={t('rest_timer_input_placeholder')}
                      placeholderTextColor={colors.textMuted}
                      value={manualInput}
                      onChangeText={setManualInput}
                      autoFocus
                      maxLength={4}
                    />
                    <TouchableOpacity
                      style={styles.sheetApplyButton}
                      onPress={handleManualApplyInModal}
                    >
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color="#FFFFFF"
                      />
                      <Text style={styles.sheetApplyText}>{t('save')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </Modal>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const getStyles = (c: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: c.background,
    },
    keyboardContainer: {
      flex: 1,
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingTop: Platform.OS === 'ios' ? 64 : 44,
      paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    },
    header: {
      alignItems: 'center',
      marginTop: 8,
    },
    badgePill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.cardSurface,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      gap: 8,
      marginBottom: 10,
    },
    pulseDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#22C55E',
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1.5,
      color: c.textPrimary,
    },
    subtitle: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 20,
      lineHeight: 20,
    },
    heroSection: {
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 'auto',
    },
    ringContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    centerContent: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    timerTouchTarget: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    timerDigits: {
      fontSize: 78,
      fontWeight: '900',
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
      letterSpacing: -3,
    },
    editBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.cardSurface,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      marginTop: 4,
    },
    editBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    chipsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 28,
    },
    chipButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.cardSurface,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      ...Platform.select({
        ios: {
          shadowColor: c.shadowColor,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: c.shadowOpacity,
          shadowRadius: 4,
        },
        android: {
          elevation: 1,
        },
      }),
    },
    customChipButton: {
      backgroundColor: c.surfaceHighlight,
    },
    chipText: {
      fontSize: 14,
      fontWeight: '700',
      color: c.textPrimary,
    },
    actionDock: {
      gap: 12,
      width: '100%',
    },
    skipButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.primaryAction,
      paddingVertical: 18,
      borderRadius: 20,
      width: '100%',
      ...Platform.select({
        ios: {
          shadowColor: c.primaryAction,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    skipButtonText: {
      fontSize: 17,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    undoButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: c.cardSurface,
      paddingVertical: 14,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      width: '100%',
    },
    undoButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: c.danger,
    },
    customModalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    customSheetCard: {
      width: '100%',
      backgroundColor: c.cardSurface,
      borderRadius: 28,
      padding: 24,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.25,
          shadowRadius: 20,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    sheetTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: c.textPrimary,
    },
    sheetCloseBtn: {
      padding: 6,
      borderRadius: 999,
      backgroundColor: c.surfaceHighlight,
    },
    sheetSubtitle: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 16,
    },
    presetGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 20,
    },
    presetPill: {
      flexBasis: '30%',
      flexGrow: 1,
      backgroundColor: c.surfaceHighlight,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    presetPillActive: {
      backgroundColor: c.primaryAction,
    },
    presetPillText: {
      fontSize: 15,
      fontWeight: '800',
      color: c.textPrimary,
    },
    presetPillTextActive: {
      color: '#FFFFFF',
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    sheetInput: {
      flex: 1,
      backgroundColor: c.surfaceHighlight,
      color: c.textPrimary,
      fontSize: 20,
      fontWeight: '800',
      textAlign: 'center',
      borderRadius: 16,
      paddingVertical: 14,
    },
    sheetApplyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.primaryAction,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 16,
    },
    sheetApplyText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    popupWrapper: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
    },
    popupCard: {
      width: '100%',
      backgroundColor: c.cardSurface,
      borderRadius: 32,
      padding: 24,
      borderWidth: 1.5,
      borderColor: c.borderSubtle,
      ...Platform.select({
        ios: {
          shadowColor: c.shadowColor,
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: c.shadowOpacity,
          shadowRadius: 20,
        },
        android: {
          elevation: c.elevation ? c.elevation + 4 : 6,
        },
      }),
    },
    popupHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    popupBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.surfaceHighlight,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    popupBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
      color: c.primaryAction,
    },
    popupCloseBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: c.surfaceHighlight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    popupTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: c.textPrimary,
      marginBottom: 4,
    },
    popupSubtitle: {
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 18,
      marginBottom: 18,
    },
    previewContainer: {
      backgroundColor: c.surfaceHighlight,
      borderRadius: 20,
      paddingVertical: 14,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    previewLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: c.textSecondary,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    previewDigits: {
      fontSize: 42,
      fontWeight: '900',
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
      letterSpacing: -1.5,
    },
    previewSubtext: {
      fontSize: 12,
      fontWeight: '700',
      color: c.primaryAction,
      marginTop: 2,
    },
    setupPresetPill: {
      flexBasis: '30%',
      flexGrow: 1,
      backgroundColor: c.surfaceHighlight,
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    setupPresetPillActive: {
      backgroundColor: c.primaryAction,
      borderColor: c.primaryAction,
    },
    setupPresetText: {
      fontSize: 15,
      fontWeight: '800',
      color: c.textPrimary,
    },
    setupPresetTextActive: {
      color: '#FFFFFF',
    },
    setupActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    setupCancelBtn: {
      flex: 1,
      backgroundColor: c.surfaceHighlight,
      paddingVertical: 16,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    setupCancelBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: c.textSecondary,
    },
    setupStartBtn: {
      flex: 2,
      flexDirection: 'row',
      backgroundColor: c.primaryAction,
      paddingVertical: 16,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      ...Platform.select({
        ios: {
          shadowColor: c.primaryAction,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    setupStartBtnText: {
      fontSize: 16,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
  });


