import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
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
  AppState,
  AppStateStatus,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import {
  Timer,
  X,
  Play,
  ChevronDown,
  Edit3,
  Plus,
  Minus,
  Sliders,
  Sparkles,
  Undo2,
  FastForward,
  Check,
} from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { AppFonts } from '@/constants/theme';
import { useUserStore } from '@/store/useUserStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';
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
} from '@/utils/soundPlayer';

interface RestTimerOverlayProps {
  visible: boolean;
  initialTime: number; // in seconds
  exerciseId?: string;
  setIndex?: number;
  onClose: () => void;
  onCancelSet?: () => void;
  onTimerComplete?: () => void;
  isConfiguringDefault?: boolean;
}

export default function RestTimerOverlay({
  visible,
  initialTime,
  exerciseId,
  setIndex,
  onClose,
  onCancelSet,
  onTimerComplete,
  isConfiguringDefault = false,
}: RestTimerOverlayProps) {
  const { t, language } = useTranslation();
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isConfiguring, setIsConfiguring] = useState(isConfiguringDefault || initialTime <= 0);
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [isEditing, setIsEditing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const notificationIdRef = useRef<string | null>(null);
  const setupNotificationIdRef = useRef<number>(0);
  const targetEndTimeRef = useRef<number | null>(null);
  const hapticsEnabled = useUserStore((s) => s.hapticsEnabled);
  const audioNotification = useUserStore((s) => s.audioNotification);
  const completeRestTimer = useWorkoutStore((s) => s.completeRestTimer);
  const clearRestTimer = useWorkoutStore((s) => s.clearRestTimer);
  const completedRef = useRef(false);
  const lastVibratedSecondRef = useRef<number | null>(null);

  // Stable refs for callbacks and user settings so interval loop is NEVER torn down by external re-renders
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onTimerCompleteRef = useRef(onTimerComplete);
  onTimerCompleteRef.current = onTimerComplete;
  const onCancelSetRef = useRef(onCancelSet);
  onCancelSetRef.current = onCancelSet;
  const hapticsEnabledRef = useRef(hapticsEnabled);
  hapticsEnabledRef.current = hapticsEnabled;
  const audioNotificationRef = useRef(audioNotification);
  audioNotificationRef.current = audioNotification;
  const completeRestTimerRef = useRef(completeRestTimer);
  completeRestTimerRef.current = completeRestTimer;

  const activeTemplate = useWorkoutStore((s) =>
    s.templates.find((tpl) => tpl.id === s.activeSession?.templateId)
  );
  const currentExercise = activeTemplate?.exercises.find((e) => e.id === exerciseId);
  const nextSetIndex = (setIndex ?? 0) + 1;
  const nextSetLabel = currentExercise
    ? `SET ${nextSetIndex + 1} • ${currentExercise.name.toUpperCase()}`
    : t('rest_period').toUpperCase();
  const nextSetPreview = currentExercise
    ? currentExercise.type === 'time'
      ? `${currentExercise.duration || 30}s`
      : currentExercise.weightMode === 'weighted' && currentExercise.weight
      ? `${currentExercise.weight}kg × ${currentExercise.reps || 10}`
      : `${currentExercise.reps || 10} reps`
    : null;

  // Track max time to correctly render the SVG progress ring
  const [maxTime, setMaxTime] = useState(initialTime > 0 ? initialTime : 60);
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

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

  const handleFinish = useCallback(() => {
    if (!completedRef.current) {
      completedRef.current = true;
      triggerTimerFinishedVibration(hapticsEnabledRef.current);
      playTimerSound(audioNotificationRef.current);
      showRestTimerFinishedNotification().catch(() => {});
    }

    if (notificationIdRef.current) {
      cancelNotification(notificationIdRef.current);
      notificationIdRef.current = null;
    }
    setIsRunning(false);
    setIsMinimized(false);
    completeRestTimerRef.current();
    if (onTimerCompleteRef.current) {
      onTimerCompleteRef.current();
    }
    onCloseRef.current();
  }, []);

  useEffect(() => {
    if (visible) {
      setIsMinimized(false);
      const storeRest = useWorkoutStore.getState().activeSession?.activeRestTimer;

      if (storeRest?.targetEndTime) {
        const remaining = Math.ceil((storeRest.targetEndTime - Date.now()) / 1000);
        if (remaining <= 0) {
          // Already expired while away
          handleFinish();
          return;
        } else {
          // Resume existing running timer accurately
          completedRef.current = false;
          lastVibratedSecondRef.current = null;
          targetEndTimeRef.current = storeRest.targetEndTime;
          setTimeLeft(remaining);
          setMaxTime(storeRest.totalDuration || Math.max(remaining, initialTime > 0 ? initialTime : 60));
          setIsConfiguring(false);
          setIsRunning(true);
          setIsEditing(false);
          if (!notificationIdRef.current) {
            setupNotification(remaining);
          }
          return;
        }
      }

      // Brand new timer
      completedRef.current = false;
      lastVibratedSecondRef.current = null;
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
      // Reset state when hiding — mark as completed to prevent race with completion effect
      completedRef.current = true;
      targetEndTimeRef.current = null;
      setTimeLeft(initialTime);
      setIsConfiguring(false);
      setIsRunning(false);
      setIsEditing(false);
      setIsMinimized(false);
      if (notificationIdRef.current) {
        cancelNotification(notificationIdRef.current);
        notificationIdRef.current = null;
      }
    }
  }, [visible, initialTime, exerciseId, setIndex, handleFinish]);

  // Sync timer immediately when app returns from background to foreground
  useEffect(() => {
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active' && visible && isRunning) {
        const currentRest = useWorkoutStore.getState().activeSession?.activeRestTimer;
        if (currentRest?.targetEndTime) {
          const rem = Math.ceil((currentRest.targetEndTime - Date.now()) / 1000);
          if (rem <= 0) {
            // Already expired while app was minimized/asleep
            handleFinish();
          } else {
            // Still running: update immediately to accurate remaining time
            targetEndTimeRef.current = currentRest.targetEndTime;
            setTimeLeft(rem);
            if (currentRest.totalDuration) {
              setMaxTime(currentRest.totalDuration);
            }
          }
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [visible, isRunning, handleFinish]);

  // Bulletproof countdown interval: runs with 200ms precision and stable dependencies
  useEffect(() => {
    if (!visible || isConfiguring || !isRunning) return;

    const tick = () => {
      if (!targetEndTimeRef.current) return;
      const now = Date.now();
      const remainingMs = targetEndTimeRef.current - now;
      const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));

      setTimeLeft((prev) => (prev !== remainingSecs ? remainingSecs : prev));

      if (remainingSecs <= 3 && remainingSecs > 0 && lastVibratedSecondRef.current !== remainingSecs) {
        lastVibratedSecondRef.current = remainingSecs;
        triggerCountdownTickVibration(hapticsEnabledRef.current);
      }

      if (remainingMs <= 0) {
        handleFinish();
      }
    };

    // Immediate tick upon starting/resuming
    tick();

    const timerId = setInterval(tick, 200);

    return () => clearInterval(timerId);
  }, [visible, isConfiguring, isRunning, handleFinish]);

  const startCustomTimer = (seconds: number) => {
    if (seconds <= 0) return;
    if (hapticsEnabledRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      Vibration.vibrate(70);
    }
    const store = useWorkoutStore.getState();
    const currentEx = exerciseId || store.activeSession?.activeRestTimer?.exerciseId || 'custom';
    const currentSet = setIndex ?? store.activeSession?.activeRestTimer?.setIndex ?? 0;
    store.startRestTimer(currentEx, currentSet, seconds);

    completedRef.current = false;
    lastVibratedSecondRef.current = null;
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
    if (hapticsEnabledRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      Vibration.vibrate(70);
    }
    const currentRemaining = targetEndTimeRef.current
      ? Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000))
      : timeLeft;
    const newTime = Math.max(0, currentRemaining + amount);

    if (newTime <= 0) {
      handleSkip();
      return;
    }

    lastVibratedSecondRef.current = null;
    targetEndTimeRef.current = Date.now() + newTime * 1000;
    setTimeLeft(newTime);
    setMaxTime((currentMax) => (newTime > currentMax ? newTime : currentMax));
    useWorkoutStore.getState().adjustRestTimer(amount);
    setupNotification(newTime);
  };

  const handleApplyPresetInModal = (seconds: number) => {
    if (hapticsEnabledRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      Vibration.vibrate(50);
    }
    const store = useWorkoutStore.getState();
    const currentEx = exerciseId || store.activeSession?.activeRestTimer?.exerciseId || 'custom';
    const currentSet = setIndex ?? store.activeSession?.activeRestTimer?.setIndex ?? 0;
    store.startRestTimer(currentEx, currentSet, seconds);

    completedRef.current = false;
    lastVibratedSecondRef.current = null;
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
      if (hapticsEnabledRef.current) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const store = useWorkoutStore.getState();
      const currentEx = exerciseId || store.activeSession?.activeRestTimer?.exerciseId || 'custom';
      const currentSet = setIndex ?? store.activeSession?.activeRestTimer?.setIndex ?? 0;
      store.startRestTimer(currentEx, currentSet, parsed);

      completedRef.current = false;
      lastVibratedSecondRef.current = null;
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
    completedRef.current = true;
    if (hapticsEnabledRef.current) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (notificationIdRef.current) await cancelNotification(notificationIdRef.current);
    setIsRunning(false);
    setIsMinimized(false);
    completeRestTimerRef.current();
    if (onTimerCompleteRef.current) {
      onTimerCompleteRef.current();
    }
    onCloseRef.current();
  };

  const handleCancelSet = async () => {
    completedRef.current = true;
    if (hapticsEnabledRef.current) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (notificationIdRef.current) await cancelNotification(notificationIdRef.current);
    setIsRunning(false);
    setIsMinimized(false);
    clearRestTimer();
    if (onCancelSetRef.current) onCancelSetRef.current();
    onCloseRef.current();
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

  const isDark = colors.isDark;
  const isWarning = timeLeft <= 3 && timeLeft > 0;
  const gradStart = isWarning ? '#EF4444' : '#F59E0B';
  const gradEnd = isWarning ? '#F97316' : '#FBBF24';
  const ringTrackColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  const parsedManual = parseInt(manualInput, 10);
  const activeChosenSeconds =
    !isNaN(parsedManual) && parsedManual > 0 ? parsedManual : selectedDuration;
  const previewMinutes = Math.floor(activeChosenSeconds / 60);
  const previewSeconds = activeChosenSeconds % 60;
  const previewFormatted = `${previewMinutes}:${previewSeconds.toString().padStart(2, '0')}`;



  return (
    <>
      <Modal visible={visible && !isMinimized} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* If user needs to choose rest time before starting (Sleek Obsidian Popup Dialog) */}
          {isConfiguring ? (
            <View style={styles.popupWrapper}>
              <View style={styles.popupCard}>
                {/* Popup Header with icon, title & close */}
                <View style={styles.popupHeaderRow}>
                  <View style={styles.popupBadge}>
                    <Timer size={16} color={colors.primaryAction} strokeWidth={2.5} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.popupTitle}>{t('rest_timer') || 'Timer Istirahat'}</Text>
                    <Text style={styles.popupSubtitle}>{t('select_rest_duration') || 'Tentukan durasi istirahat antar set'}</Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleCancelSet}
                    style={styles.popupCloseBtn}
                  >
                    <X size={16} color={colors.textSecondary} strokeWidth={2.4} />
                  </TouchableOpacity>
                </View>

                {/* Context badge if set is known */}
                {currentExercise && (
                  <View style={styles.contextBadge}>
                    <Text style={styles.contextBadgeText} numberOfLines={1}>
                      {nextSetLabel} {nextSetPreview ? `• ${nextSetPreview}` : ''}
                    </Text>
                  </View>
                )}

                {/* Hero Time Display Box */}
                <View style={styles.previewContainer}>
                  <Text style={styles.previewDigits}>{previewFormatted}</Text>
                  <Text style={styles.previewSubtext}>
                    {activeChosenSeconds} {t('seconds') || 'detik'}
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
                          {preset}s
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Compact Numeric Input */}
                <View style={styles.manualInputWrapper}>
                  <TextInput
                    style={styles.manualInputField}
                    keyboardType="number-pad"
                    placeholder={t('rest_timer_input_placeholder') || 'Ketik manual (detik)...'}
                    placeholderTextColor={colors.textMuted}
                    value={manualInput}
                    onChangeText={(val) => {
                      const cleanVal = val.replace(/[^0-9]/g, '');
                      setManualInput(cleanVal);
                      const parsed = parseInt(cleanVal, 10);
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
                    <Text style={styles.setupCancelBtnText}>{t('cancel') || 'Batal'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.setupStartBtn}
                    onPress={() => {
                      startCustomTimer(activeChosenSeconds);
                    }}
                  >
                    <Play size={15} color="#000000" fill="#000000" />
                    <Text style={styles.setupStartBtnText}>{t('start_rest') || 'Mulai Istirahat'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <>
              {/* Top Header Row with Minimize Button & Pill */}
              <View style={styles.topControlRow}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={styles.minimizeButton}
                  onPress={() => {
                    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsMinimized(true);
                  }}
                >
                  <ChevronDown size={18} color={colors.textPrimary} strokeWidth={2.2} />
                  <Text style={styles.minimizeButtonText}>{t('minimize')}</Text>
                </TouchableOpacity>

                <View style={styles.badgePill}>
                  <View style={[styles.pulseDot, isWarning && { backgroundColor: '#EF4444' }]} />
                  <Text style={styles.badgeText}>{t('rest_period').toUpperCase()}</Text>
                </View>

                <View style={{ width: 75 }} />
              </View>
              <Text style={styles.subtitle}>{t('catch_breath')}</Text>

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
                      <Text style={[styles.timerDigits, isWarning && styles.timerDigitsWarning]}>
                        {formattedTime}
                      </Text>
                      <Text style={styles.restingLabel} numberOfLines={1}>
                        {`RESTING BEFORE ${nextSetLabel}`}
                      </Text>
                      {nextSetPreview && (
                        <View style={styles.nextSetBadge}>
                          <Text style={styles.nextSetBadgeText}>
                            {`Up Next: ${nextSetPreview}`}
                          </Text>
                        </View>
                      )}
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
                  <Text style={styles.chipText}>-15s</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.75}
                  style={styles.chipButton}
                  onPress={() => adjustTime(15)}
                >
                  <Text style={styles.chipText}>+15s</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.75}
                  style={styles.chipButton}
                  onPress={() => adjustTime(30)}
                >
                  <Text style={styles.chipText}>+30s</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.75}
                  style={[styles.chipButton, styles.customChipButton]}
                  onPress={() => {
                    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsEditing(true);
                  }}
                >
                  <Sliders size={12} color={colors.primaryAction} strokeWidth={2.4} />
                  <Text style={[styles.chipText, { color: colors.primaryAction }]}>{t('custom')}</Text>
                </TouchableOpacity>
              </View>

              {/* Bottom Action Dock */}
              <View style={styles.actionDock}>
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={styles.skipButton}
                  onPress={handleSkip}
                >
                  <FastForward size={16} color="#000000" strokeWidth={2.6} />
                  <Text style={styles.skipButtonText}>{t('skip')}</Text>
                </TouchableOpacity>

                {onCancelSet && (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    style={styles.undoTextButton}
                    onPress={handleCancelSet}
                  >
                    <Text style={styles.undoTextButtonText}>{t('undo_last_set')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {/* Custom Duration Popup Dialog (when editing during active timer) */}
          {isEditing && (
            <Modal visible={isEditing} transparent animationType="fade" onRequestClose={() => setIsEditing(false)}>
              <TouchableOpacity
                style={styles.customModalBackdrop}
                activeOpacity={1}
                onPress={() => {
                  Keyboard.dismiss();
                  setIsEditing(false);
                }}
              >
                <View style={styles.customSheetCard} onStartShouldSetResponder={() => true}>
                  <View style={styles.popupHeaderRow}>
                    <View style={styles.popupBadge}>
                      <Sliders size={16} color={colors.primaryAction} strokeWidth={2.5} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.popupTitle}>{t('custom') || 'Atur Waktu'}</Text>
                      <Text style={styles.popupSubtitle}>{t('or_enter_seconds') || 'Masukkan detik secara manual'}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setIsEditing(false)}
                      style={styles.popupCloseBtn}
                      activeOpacity={0.7}
                    >
                      <X size={16} color={colors.textSecondary} strokeWidth={2.4} />
                    </TouchableOpacity>
                  </View>

                  {/* Large Numeric Input Display */}
                  <View style={styles.customInputContainer}>
                    <TextInput
                      style={styles.customLargeInput}
                      keyboardType="number-pad"
                      placeholder="60"
                      placeholderTextColor={colors.textMuted}
                      value={manualInput || (timeLeft > 0 ? String(timeLeft) : '')}
                      onChangeText={setManualInput}
                      autoFocus
                      maxLength={4}
                      selectTextOnFocus
                    />
                    <Text style={styles.customUnitLabel}>{t('seconds') || 'detik'}</Text>
                  </View>

                  {/* Quick Preset Grid */}
                  <View style={styles.presetGrid}>
                    {[30, 45, 60, 90, 120, 180].map((preset) => {
                      const isCurrent = manualInput
                        ? parseInt(manualInput, 10) === preset
                        : timeLeft === preset;
                      return (
                        <TouchableOpacity
                          key={preset}
                          style={[
                            styles.setupPresetPill,
                            isCurrent && styles.setupPresetPillActive,
                          ]}
                          onPress={() => {
                            if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setManualInput(String(preset));
                          }}
                        >
                          <Text
                            style={[
                              styles.setupPresetText,
                              isCurrent && styles.setupPresetTextActive,
                            ]}
                          >
                            {preset}s
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Actions */}
                  <View style={styles.setupActions}>
                    <TouchableOpacity
                      style={styles.setupCancelBtn}
                      onPress={() => setIsEditing(false)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.setupCancelBtnText}>{t('cancel') || 'Batal'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.setupStartBtn}
                      onPress={handleManualApplyInModal}
                      activeOpacity={0.85}
                    >
                      <Check size={16} color="#000000" strokeWidth={2.5} />
                      <Text style={styles.setupStartBtnText}>{t('save') || 'Terapkan'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </Modal>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>

    {visible && isMinimized && (
      <View style={styles.floatingMiniBarWrapper} pointerEvents="box-none">
        <TouchableOpacity
          activeOpacity={0.92}
          style={styles.floatingMiniBar}
          onPress={() => {
            if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsMinimized(false);
          }}
        >
          {/* Left: Mini Ring & Digits */}
          <View style={styles.miniBarLeft}>
            <View style={styles.miniRingWrapper}>
              <Svg width={38} height={38} viewBox="0 0 38 38">
                <Circle
                  cx={19}
                  cy={19}
                  r={15}
                  stroke={ringTrackColor}
                  strokeWidth={3.5}
                  fill="none"
                />
                <Circle
                  cx={19}
                  cy={19}
                  r={15}
                  stroke={isWarning ? '#EF4444' : colors.primaryAction}
                  strokeWidth={3.5}
                  strokeDasharray={`${2 * Math.PI * 15}`}
                  strokeDashoffset={`${2 * Math.PI * 15 * (1 - Math.min(1, Math.max(0, progress)))}`}
                  strokeLinecap="round"
                  fill="none"
                  transform="rotate(-90 19 19)"
                />
              </Svg>
              <Timer
                size={15}
                color={isWarning ? '#EF4444' : colors.primaryAction}
                style={styles.miniRingIcon}
                strokeWidth={2}
              />
            </View>
            <View style={styles.miniBarTextCol}>
              <Text style={styles.miniBarLabel}>{t('rest_period')}</Text>
              <Text style={[styles.miniBarDigits, isWarning && styles.timerDigitsWarning]}>
                {formattedTime}
              </Text>
            </View>
          </View>

          {/* Right: +30s and Skip buttons */}
          <View style={styles.miniBarActions}>
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.miniBarPlusBtn}
              onPress={(e) => {
                e.stopPropagation();
                adjustTime(30);
              }}
            >
              <Plus size={14} color={colors.textPrimary} strokeWidth={2.2} />
              <Text style={styles.miniBarPlusText}>30{t('seconds_short')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.miniBarSkipBtn}
              onPress={(e) => {
                e.stopPropagation();
                handleSkip();
              }}
            >
              <Text style={styles.miniBarSkipText}>{t('skip')}</Text>
              <FastForward size={13} color="#000000" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    )}
  </>
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
      marginBottom: 24,
    },
    chipButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: c.surfaceHighlight,
      paddingVertical: 10,
      paddingHorizontal: 13,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    customChipButton: {
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    chipText: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textPrimary,
    },
    actionDock: {
      gap: 10,
      width: '100%',
    },
    skipButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: '#F59E0B',
      paddingVertical: 14,
      borderRadius: 14,
      width: '100%',
      ...Platform.select({
        ios: {
          shadowColor: '#F59E0B',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 10,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    skipButtonText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#000000',
      letterSpacing: 0.3,
    },
    undoTextButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
    },
    undoTextButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textMuted,
    },
    restingLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: 2,
      textAlign: 'center',
      paddingHorizontal: 12,
    },
    nextSetBadge: {
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.25)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      marginTop: 6,
    },
    nextSetBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.primaryAction,
      fontVariant: ['tabular-nums'],
    },
    undoButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: c.surfaceHighlight,
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      width: '100%',
    },
    undoButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: c.danger,
    },
    customModalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.78)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    customSheetCard: {
      width: '100%',
      maxWidth: 350,
      backgroundColor: c.cardSurface,
      borderRadius: 24,
      padding: 22,
      borderWidth: 1,
      borderColor: c.borderSubtle,
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
    customInputContainer: {
      backgroundColor: c.elevatedSurface,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      borderWidth: 1.5,
      borderColor: c.primaryAction,
    },
    customLargeInput: {
      fontSize: 38,
      fontFamily: AppFonts.extraBold,
      fontWeight: '900',
      color: c.textPrimary,
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
      includeFontPadding: false,
    },
    customUnitLabel: {
      fontSize: 11,
      fontFamily: AppFonts.bold,
      fontWeight: '800',
      color: c.primaryAction,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: 2,
    },
    popupWrapper: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      paddingHorizontal: 20,
    },
    popupCard: {
      width: '100%',
      maxWidth: 350,
      backgroundColor: c.cardSurface,
      borderRadius: 24,
      padding: 22,
      borderWidth: 1,
      borderColor: c.borderSubtle,
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
    popupHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    popupBadge: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    popupTitle: {
      fontSize: 17,
      fontFamily: AppFonts.bold,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.2,
    },
    popupSubtitle: {
      fontSize: 12,
      fontFamily: AppFonts.medium,
      color: c.textSecondary,
      marginTop: 1,
    },
    popupCloseBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.surfaceHighlight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    contextBadge: {
      backgroundColor: c.elevatedSurface,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      marginBottom: 14,
      alignSelf: 'flex-start',
    },
    contextBadgeText: {
      fontSize: 11,
      fontFamily: AppFonts.bold,
      fontWeight: '700',
      color: c.textSecondary,
    },
    previewContainer: {
      backgroundColor: c.elevatedSurface,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    previewDigits: {
      fontSize: 36,
      fontFamily: AppFonts.extraBold,
      fontWeight: '900',
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
      letterSpacing: -1,
    },
    previewSubtext: {
      fontSize: 12,
      fontFamily: AppFonts.bold,
      fontWeight: '700',
      color: '#F59E0B',
      marginTop: 2,
      fontVariant: ['tabular-nums'],
    },
    presetGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 14,
    },
    setupPresetPill: {
      flexBasis: '30%',
      flexGrow: 1,
      backgroundColor: c.elevatedSurface,
      paddingVertical: 11,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    setupPresetPillActive: {
      backgroundColor: '#F59E0B',
      borderColor: '#F59E0B',
    },
    setupPresetText: {
      fontSize: 13,
      fontFamily: AppFonts.bold,
      fontWeight: '800',
      color: c.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    setupPresetTextActive: {
      color: '#000000',
      fontWeight: '800',
    },
    manualInputWrapper: {
      backgroundColor: c.elevatedSurface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      marginBottom: 16,
    },
    manualInputField: {
      fontSize: 13,
      fontFamily: AppFonts.medium,
      color: c.textPrimary,
      paddingVertical: 10,
      paddingHorizontal: 14,
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
    },
    setupActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 2,
    },
    setupCancelBtn: {
      flex: 1,
      backgroundColor: c.elevatedSurface,
      paddingVertical: 13,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    setupCancelBtnText: {
      fontSize: 14,
      fontFamily: AppFonts.bold,
      fontWeight: '700',
      color: c.textSecondary,
    },
    setupStartBtn: {
      flex: 1.6,
      flexDirection: 'row',
      backgroundColor: '#F59E0B',
      paddingVertical: 13,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    setupStartBtnText: {
      fontSize: 14,
      fontFamily: AppFonts.bold,
      fontWeight: '800',
      color: '#000000',
    },
    topControlRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      marginTop: 4,
      marginBottom: 6,
    },
    minimizeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.cardSurface,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    minimizeButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textPrimary,
    },
    timerDigitsWarning: {
      color: '#EF4444',
    },
    floatingMiniBarWrapper: {
      position: 'absolute',
      bottom: 110,
      left: 16,
      right: 16,
      zIndex: 9999,
      elevation: 10,
    },
    floatingMiniBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.cardSurface,
      borderRadius: 18,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderWidth: 1.5,
      borderColor: c.primaryAction,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 12,
        },
        android: {
          elevation: 12,
        },
      }),
    },
    miniBarLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    miniRingWrapper: {
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    miniRingIcon: {
      position: 'absolute',
    },
    miniBarTextCol: {
      justifyContent: 'center',
    },
    miniBarLabel: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: c.textSecondary,
    },
    miniBarDigits: {
      fontSize: 20,
      fontWeight: '900',
      fontVariant: ['tabular-nums'],
      color: c.textPrimary,
      letterSpacing: -0.5,
    },
    miniBarActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    miniBarPlusBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: c.cardSurface,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    miniBarPlusText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textPrimary,
    },
    miniBarSkipBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.primaryAction,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
    },
    miniBarSkipText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#000000',
    },
    tourGuideCard: {
      backgroundColor: c.cardSurface,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: '#F59E0B',
      padding: 14,
      marginTop: 14,
      marginBottom: 6,
      ...Platform.select({
        ios: {
          shadowColor: '#F59E0B',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    tourGuideHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    tourGuideBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    tourGuideBadgeText: {
      color: '#F59E0B',
      fontSize: 11,
      fontWeight: '800',
    },
    tourGuideTitle: {
      color: c.textPrimary,
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 4,
    },
    tourGuideDesc: {
      color: c.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '500',
      marginBottom: 10,
    },
    tourFinishBtn: {
      backgroundColor: '#F59E0B',
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tourFinishBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
  });


