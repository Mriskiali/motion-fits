import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Vibration,
  AppState,
  AppStateStatus,
  BackHandler,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ChevronDown, X, Timer, Check, Dumbbell, Flame } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useAlertStore } from '@/store/useAlertStore';
import { useUserStore } from '@/store/useUserStore';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import RestTimerOverlay from '@/components/RestTimerOverlay';
import { useTranslation } from '@/hooks/useTranslation';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { dismissActiveWorkoutNotification, dismissRestTimerNotification } from '@/utils/notifications';
import { formatDurationBadge } from '@/utils/time';
import { AppFonts } from '@/constants/theme';

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const activeSession = useWorkoutStore((s) => s.activeSession);
  const templates = useWorkoutStore((s) => s.templates);
  const logSession = useWorkoutStore((s) => s.logSession);
  const clearActiveSession = useWorkoutStore((s) => s.clearActiveSession);
  const updateActiveSession = useWorkoutStore((s) => s.updateActiveSession);
  const completeRestTimer = useWorkoutStore((s) => s.completeRestTimer);

  const autoStartTimer = useUserStore((s) => s.autoStartTimer);
  const defaultRestTimer = useUserStore((s) => s.defaultRestTimer);
  const hapticsEnabled = useUserStore((s) => s.hapticsEnabled);
  const keepScreenAwake = useUserStore((s) => s.keepScreenAwake);
  const streak = useUserStore((s) => s.streak);
  const { t, language } = useTranslation();
  
  const [elapsedTime, setElapsedTime] = useState(0);
  const [restTimerVisible, setRestTimerVisible] = useState(false);
  const [currentRestTime, setCurrentRestTime] = useState(90);

  // Read from global state to persist across app closures
  const completedSets = activeSession?.completedSetsMap || {};
  const actualValues = activeSession?.actualValuesMap || {};
  const actualWeights = activeSession?.actualWeightsMap || {};
  const activeRestTimer = activeSession?.activeRestTimer;
  
  const [lastLoggedSet, setLastLoggedSet] = useState<{ exerciseId: string; setIndex: number } | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const isFinishingRef = useRef(false);

  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const showAlert = useAlertStore(state => state.showAlert);

  // Keep screen awake ONLY while this workout screen is open in foreground (releases when minimized or backgrounded)
  // And sync rest timer state when returning to active state
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        if (keepScreenAwake) {
          activateKeepAwakeAsync('active-workout').catch(() => {});
        }
        // Check if rest timer expired or is still running while phone was asleep/backgrounded
        const currentRest = useWorkoutStore.getState().activeSession?.activeRestTimer;
        if (currentRest?.targetEndTime) {
          if (currentRest.targetEndTime <= Date.now()) {
            // Dismiss scheduled/shown notification to prevent duplicates
            dismissRestTimerNotification().catch(() => {});
            completeRestTimer();
            setRestTimerVisible(false);
            setLastLoggedSet(null);
          } else {
            setRestTimerVisible(true);
          }
        }
      } else {
        deactivateKeepAwake('active-workout').catch(() => {});
        deactivateKeepAwake().catch(() => {});
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    if (AppState.currentState === 'active') {
      if (keepScreenAwake) {
        activateKeepAwakeAsync('active-workout').catch(() => {});
      }
      const currentRest = useWorkoutStore.getState().activeSession?.activeRestTimer;
      if (currentRest?.targetEndTime) {
        if (currentRest.targetEndTime <= Date.now()) {
          dismissRestTimerNotification().catch(() => {});
          completeRestTimer();
          setRestTimerVisible(false);
          setLastLoggedSet(null);
        } else {
          setRestTimerVisible(true);
        }
      }
    } else {
      deactivateKeepAwake('active-workout').catch(() => {});
      deactivateKeepAwake().catch(() => {});
    }

    return () => {
      subscription.remove();
      deactivateKeepAwake('active-workout').catch(() => {});
      deactivateKeepAwake().catch(() => {});
    };
  }, [keepScreenAwake, completeRestTimer]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!activeSession && !isFinishingRef.current) {
      router.replace('/(tabs)/workout');
    }
  }, [activeSession]);

  const template = templates.find((tData) => tData.id === activeSession?.templateId);

  useEffect(() => {
    if (!activeSession?.startTime) return;
    
    const updateTimer = () => {
      const ms = Date.now() - activeSession.startTime;
      setElapsedTime(Math.floor(ms / 1000));
    };
    
    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [activeSession?.startTime]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getActiveDurationUnit = (durSeconds: number): 'sec' | 'min' | 'hour' => {
    if (durSeconds >= 3600 && durSeconds % 3600 === 0) return 'hour';
    if (durSeconds >= 60 && durSeconds % 60 === 0) return 'min';
    return 'sec';
  };

  const getActiveDurationDisplay = (exerciseId: string, setIndex: number, defaultDurSeconds: number): string => {
    const recordedVal = actualValues[exerciseId]?.[setIndex];
    const durSec = recordedVal !== undefined ? (parseInt(recordedVal, 10) || 0) : defaultDurSeconds;
    if (durSec <= 0) return '';
    const unit = getActiveDurationUnit(defaultDurSeconds);
    if (unit === 'hour') return Math.round(durSec / 3600).toString();
    if (unit === 'min') return Math.round(durSec / 60).toString();
    return durSec.toString();
  };

  const handleUpdateActiveDurationVal = (exerciseId: string, setIndex: number, valStr: string, defaultDurSeconds: number) => {
    const clean = valStr.replace(/[^0-9]/g, '');
    const num = clean ? parseInt(clean, 10) : 0;
    const unit = getActiveDurationUnit(defaultDurSeconds);
    let totalSec = num;
    if (unit === 'min') totalSec = num * 60;
    else if (unit === 'hour') totalSec = num * 3600;

    const newActualValues = {
      ...actualValues,
      [exerciseId]: {
        ...(actualValues[exerciseId] || {}),
        [setIndex]: clean === '' ? '' : totalSec.toString(),
      },
    };
    updateActiveSession(completedSets, newActualValues);
  };

  // If activeRestTimer is active in store, sync restTimerVisible and lastLoggedSet
  useEffect(() => {
    if (activeRestTimer && activeRestTimer.targetEndTime > Date.now()) {
      setLastLoggedSet({ exerciseId: activeRestTimer.exerciseId, setIndex: activeRestTimer.setIndex });
      setRestTimerVisible(true);
    }
  }, [activeRestTimer]);

  const getPreviousSetData = (exerciseId: string, setIndex: number): string => {
    const sessions = useWorkoutStore.getState().sessions;
    if (sessions && sessions.length > 0) {
      const pastSession = sessions.find((s: any) =>
        s.completedExercises?.some((e: any) => e.exerciseId === exerciseId && e.setsDetails?.[setIndex])
      );
      if (pastSession) {
        const exData = pastSession.completedExercises?.find((e: any) => e.exerciseId === exerciseId);
        const setDetail = exData?.setsDetails?.[setIndex];
        if (setDetail) {
          if (setDetail.weight !== undefined && setDetail.weight > 0) {
            return `${setDetail.weight}kg × ${setDetail.reps || 0}`;
          }
          return `${setDetail.reps || 0} reps`;
        }
      }
    }
    const targetEx = template?.exercises.find((e) => e.id === exerciseId);
    if (targetEx) {
      if (targetEx.weight && targetEx.weight > 0) {
        return `${targetEx.weight}kg × ${targetEx.reps || '-'}`;
      }
      if (targetEx.reps) return `${targetEx.reps} reps`;
      if (targetEx.duration) return `${targetEx.duration}s`;
    }
    return '—';
  };

  const toggleLogSet = (exerciseId: string, setIndex: number) => {
    const exerciseSets = completedSets[exerciseId] || [];
    const isCurrentlyResting =
      activeRestTimer &&
      activeRestTimer.exerciseId === exerciseId &&
      activeRestTimer.setIndex === setIndex &&
      activeRestTimer.targetEndTime > Date.now();

    if (isCurrentlyResting) {
      // User tapped the resting set button -> re-open the rest timer overlay popup
      if (hapticsEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      setRestTimerVisible(true);
      return;
    }

    let newCompletedSets;
    if (exerciseSets.includes(setIndex)) {
      // Undo log: remove from completed sets and clear any active timer
      if (hapticsEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        Vibration.vibrate(60);
      }
      newCompletedSets = {
        ...completedSets,
        [exerciseId]: exerciseSets.filter(i => i !== setIndex),
      };
      if (activeRestTimer?.exerciseId === exerciseId && activeRestTimer?.setIndex === setIndex) {
        useWorkoutStore.getState().clearRestTimer();
        setRestTimerVisible(false);
      }
      updateActiveSession(newCompletedSets, actualValues);
    } else {
      // User tapped checkmark to complete a set
      if (hapticsEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        Vibration.vibrate(100);
      }
      if (!autoStartTimer) {
        // When auto rest timer is disabled in settings, mark set complete directly
        // and open RestTimerOverlay in manual configuration mode so user can choose/enter rest time manually
        newCompletedSets = {
          ...completedSets,
          [exerciseId]: [...exerciseSets, setIndex],
        };
        updateActiveSession(newCompletedSets, actualValues);
        setLastLoggedSet({ exerciseId, setIndex });
        setCurrentRestTime(0); // initialTime <= 0 triggers manual input card
        setRestTimerVisible(true);
        return;
      }

      // Rest duration strictly honors defaultRestTimer from settings when autoStartTimer is enabled
      const restDuration = (defaultRestTimer && defaultRestTimer > 0)
        ? defaultRestTimer
        : (template?.defaultRestTime || 60);

      // Start global rest timer in store
      setLastLoggedSet({ exerciseId, setIndex });
      setCurrentRestTime(restDuration);
      useWorkoutStore.getState().startRestTimer(exerciseId, setIndex, restDuration);
      setRestTimerVisible(true);
    }
  };

  const handleFinishWorkout = () => {
    showAlert(
      t('finish_workout'),
      t('finish_workout_confirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('finish'), 
          style: 'default',
          onPress: () => {
            if (!activeSession || !template) return;

            const completedExercisesData = Object.entries(completedSets).map(([exerciseId, sets]) => {
              const targetEx = template.exercises.find((e) => e.id === exerciseId);
              const actualRepsArray = sets.map((setIndex) => {
                const val = actualValues[exerciseId]?.[setIndex];
                if (val !== undefined && val !== '') {
                  return parseInt(val, 10) || 0;
                }
                if (targetEx?.type === 'time') {
                  return targetEx.duration || 0;
                }
                const repStr = String(targetEx?.reps || '10').split('-')[0];
                return parseInt(repStr, 10) || 10;
              });

              const setsDetails: Record<number, { reps?: number; weight?: number }> = {};
              sets.forEach((setIndex) => {
                const val = actualValues[exerciseId]?.[setIndex];
                let repsNum = 0;
                if (val !== undefined && val !== '') {
                  repsNum = parseInt(val, 10) || 0;
                } else if (targetEx?.type === 'time') {
                  repsNum = targetEx.duration || 0;
                } else {
                  const repStr = String(targetEx?.reps || '10').split('-')[0];
                  repsNum = parseInt(repStr, 10) || 10;
                }

                const weightVal = actualWeights[exerciseId]?.[setIndex];
                const weightNum =
                  weightVal !== undefined && weightVal !== ''
                    ? parseFloat(weightVal)
                    : (targetEx?.weight || undefined);

                setsDetails[setIndex] = {
                  reps: repsNum,
                  weight: weightNum,
                };
              });

              return {
                exerciseId,
                completedSets: actualRepsArray,
                setsDetails,
              };
            });

            // Log to store
            logSession({
              ...activeSession,
              duration: elapsedTime,
              completedExercises: completedExercisesData,
            });

            // Update user streak for today
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const { updateStreak } = useUserStore.getState();
            updateStreak(todayStr);

            // Auto unassign if they just finished today's scheduled workout
            const { scheduledWorkouts, scheduleWorkout } = useWorkoutStore.getState();
            if (scheduledWorkouts[todayStr] === activeSession.templateId) {
              scheduleWorkout(todayStr, null);
            }

            dismissActiveWorkoutNotification().catch(() => {});

            // Clean finish: clear active session and route directly to History
            isFinishingRef.current = true;
            clearActiveSession();
            router.replace('/(tabs)/history');
          }
        }
      ]
    );
  };

  const handleCancelWorkout = () => {
    showAlert(
      t('cancel_workout'),
      t('cancel_workout_confirm'),
      [
        { text: t('no'), style: 'cancel' },
        { 
          text: t('yes'), 
          style: 'destructive',
          onPress: () => {
            // Auto unassign scheduled workout when cancelled
            if (activeSession?.templateId) {
              const { scheduledWorkouts, scheduleWorkout } = useWorkoutStore.getState();
              const todayStr = format(new Date(), 'yyyy-MM-dd');
              if (scheduledWorkouts[todayStr] === activeSession.templateId) {
                scheduleWorkout(todayStr, null);
              }
            }
            dismissActiveWorkoutNotification().catch(() => {});
            clearActiveSession();
            router.replace('/(tabs)/workout');
          }
        }
      ]
    );
  };

  const handleMinimize = useCallback(() => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/workout');
    }
  }, [hapticsEnabled, router]);

  // Intercept Android hardware / gesture back button to safely minimize to floating bar
  useEffect(() => {
    const handleBackPress = () => {
      handleMinimize();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => sub.remove();
  }, [handleMinimize]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top Sticky Bar */}
      <View style={styles.topStickyBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            onPress={handleMinimize}
            accessibilityLabel={t('minimize')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.topBarIconBtn}
          >
            <ChevronDown color={colors.textPrimary} size={20} strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleCancelWorkout}
            accessibilityLabel={t('cancel_workout')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.topBarCancelBtn}
          >
            <X color="#EF4444" size={17} strokeWidth={2.4} />
          </TouchableOpacity>
        </View>

        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {template?.name || 'Workout'}
          </Text>
          <View style={styles.topBarTimerRow}>
            <View style={styles.pulseDot} />
            <Text style={styles.topBarTimerText}>{formatTime(elapsedTime)}</Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.topBarFinishBtn}
          onPress={handleFinishWorkout}
        >
          <Check size={14} color="#000000" strokeWidth={3} />
          <Text style={styles.topBarFinishBtnText}>{t('finish')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {template?.exercises.map((exercise, index) => {
          const exerciseSets = completedSets[exercise.id] || [];
          const totalSets = exercise.sets || 1;
          const isAllSetsCompleted = exerciseSets.length >= totalSets && totalSets > 0;
          const isTimeBased = exercise.type === 'time';
          const weightMode = exercise.weightMode || (isTimeBased ? 'none' : 'weighted');
          const isWeighted = !isTimeBased && weightMode === 'weighted';
          const isBodyweight = !isTimeBased && weightMode === 'bodyweight';

          return (
            <View
              key={exercise.id}
              style={[
                styles.exerciseCard,
                isAllSetsCompleted && styles.exerciseCardCompleted,
              ]}
            >
              {/* Exercise Card Header with badge & progress */}
              <View style={styles.exerciseCardHeaderRow}>
                <View style={styles.exerciseTitleGroup}>
                  <View style={[styles.exerciseNumberPill, isAllSetsCompleted && styles.exerciseNumberPillCompleted]}>
                    <Text style={[styles.exerciseNumberPillText, isAllSetsCompleted && styles.exerciseNumberPillTextCompleted]}>
                      {(index + 1).toString().padStart(2, '0')}
                    </Text>
                  </View>
                  <Text style={styles.exerciseName} numberOfLines={1}>
                    {exercise.name}
                  </Text>
                </View>

                <View style={styles.exerciseHeaderRight}>
                  {isWeighted && (
                    <View style={styles.weightHeaderBadge}>
                      <Dumbbell size={11} color={colors.primaryAction} strokeWidth={2.4} />
                      <Text style={styles.weightHeaderBadgeText}>
                        {exercise.weight ? `${exercise.weight}kg` : t('weighted')}
                      </Text>
                    </View>
                  )}
                  {isBodyweight && (
                    <View style={styles.bwHeaderBadge}>
                      <Text style={styles.bwHeaderBadgeText}>{t('bodyweight_short')}</Text>
                    </View>
                  )}
                  {isTimeBased ? (
                    <View style={styles.timeTargetBadge}>
                      <Timer size={11} color={colors.primaryAction} strokeWidth={2.4} />
                      <Text style={styles.timeTargetBadgeText}>
                        {formatDurationBadge(exercise.duration || 30, language)}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.setsProgressBadge, isAllSetsCompleted && styles.setsProgressBadgeCompleted]}>
                      <Text style={[styles.setsProgressText, isAllSetsCompleted && styles.setsProgressTextCompleted]}>
                        {exerciseSets.length}/{totalSets} SETS
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Table Column Headers */}
              <View style={styles.tableHeaderRow}>
                <Text style={styles.colHeaderSet}>{t('set').toUpperCase()}</Text>
                <Text style={styles.colHeaderPrev}>PREV</Text>
                {isWeighted && (
                  <>
                    <Text style={styles.colHeaderMetric}>{t('weight_unit').toUpperCase()}</Text>
                    <Text style={styles.colHeaderMetric}>{t('reps_label').toUpperCase()}</Text>
                  </>
                )}
                {isBodyweight && (
                  <>
                    <Text style={styles.colHeaderMetric}>MODE</Text>
                    <Text style={styles.colHeaderMetric}>{t('reps_label').toUpperCase()}</Text>
                  </>
                )}
                {isTimeBased && (
                  <>
                    <Text style={styles.colHeaderMetric}>{t('duration').toUpperCase()}</Text>
                    <Text style={styles.colHeaderMetric}>UNIT</Text>
                  </>
                )}
                <Text style={styles.colHeaderCheck}>✓</Text>
              </View>

              {/* Set Rows */}
              {Array.from({ length: totalSets }).map((_, setIndex) => {
                const isCompleted = exerciseSets.includes(setIndex);
                const isResting =
                  activeRestTimer?.exerciseId === exercise.id &&
                  activeRestTimer?.setIndex === setIndex &&
                  activeRestTimer.targetEndTime > Date.now();
                const prevData = getPreviousSetData(exercise.id, setIndex);

                return (
                  <View key={setIndex} style={styles.setRowWrapper}>
                    <View
                      style={[
                        styles.setRow,
                        isCompleted && styles.setRowCompleted,
                        isResting && styles.setRowResting,
                      ]}
                    >
                      {/* SET Column */}
                      <View style={styles.setNumberBadge}>
                        <Text style={[styles.setNumberText, isCompleted && styles.setNumberTextCompleted]}>
                          {setIndex + 1}
                        </Text>
                      </View>

                      {/* PREV Column */}
                      <View style={styles.prevContainer}>
                        <Text style={styles.prevText} numberOfLines={1}>
                          {prevData}
                        </Text>
                      </View>

                      {/* Dynamic Inputs depending on mode */}
                      {isWeighted && (
                        <>
                          <TextInput
                            style={[
                              styles.tableInput,
                              isCompleted && styles.tableInputCompleted,
                              isResting && styles.tableInputResting,
                            ]}
                            value={
                              actualWeights[exercise.id]?.[setIndex] !== undefined
                                ? actualWeights[exercise.id]?.[setIndex]
                                : (exercise.weight !== undefined && exercise.weight !== null ? String(exercise.weight) : '')
                            }
                            placeholder="0"
                            placeholderTextColor={colors.textMuted}
                            onChangeText={(val) => {
                              const cleanVal = val.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
                              const newActualWeights = {
                                ...actualWeights,
                                [exercise.id]: {
                                  ...(actualWeights[exercise.id] || {}),
                                  [setIndex]: cleanVal,
                                },
                              };
                              updateActiveSession(completedSets, actualValues, activeRestTimer, newActualWeights);
                            }}
                            keyboardType="decimal-pad"
                            editable={!isCompleted && !isResting}
                            selectTextOnFocus
                          />

                          <TextInput
                            style={[
                              styles.tableInput,
                              isCompleted && styles.tableInputCompleted,
                              isResting && styles.tableInputResting,
                            ]}
                            value={
                              actualValues[exercise.id]?.[setIndex] !== undefined
                                ? actualValues[exercise.id]?.[setIndex]
                                : String(exercise.reps || 0)
                            }
                            placeholder="0"
                            placeholderTextColor={colors.textMuted}
                            onChangeText={(val) => {
                              const cleanVal = val.replace(/[^0-9]/g, '');
                              const newActualValues = {
                                ...actualValues,
                                [exercise.id]: {
                                  ...(actualValues[exercise.id] || {}),
                                  [setIndex]: cleanVal,
                                },
                              };
                              updateActiveSession(completedSets, newActualValues, activeRestTimer, actualWeights);
                            }}
                            keyboardType="number-pad"
                            editable={!isCompleted && !isResting}
                            selectTextOnFocus
                          />
                        </>
                      )}

                      {isBodyweight && (
                        <>
                          <View style={styles.bwModePill}>
                            <Text style={styles.bwModePillText}>BW</Text>
                          </View>
                          <TextInput
                            style={[
                              styles.tableInput,
                              isCompleted && styles.tableInputCompleted,
                              isResting && styles.tableInputResting,
                            ]}
                            value={
                              actualValues[exercise.id]?.[setIndex] !== undefined
                                ? actualValues[exercise.id]?.[setIndex]
                                : String(exercise.reps || 0)
                            }
                            placeholder="0"
                            placeholderTextColor={colors.textMuted}
                            onChangeText={(val) => {
                              const cleanVal = val.replace(/[^0-9]/g, '');
                              const newActualValues = {
                                ...actualValues,
                                [exercise.id]: {
                                  ...(actualValues[exercise.id] || {}),
                                  [setIndex]: cleanVal,
                                },
                              };
                              updateActiveSession(completedSets, newActualValues, activeRestTimer, actualWeights);
                            }}
                            keyboardType="number-pad"
                            editable={!isCompleted && !isResting}
                            selectTextOnFocus
                          />
                        </>
                      )}

                      {isTimeBased && (
                        <>
                          <TextInput
                            style={[
                              styles.tableInput,
                              isCompleted && styles.tableInputCompleted,
                              isResting && styles.tableInputResting,
                            ]}
                            value={getActiveDurationDisplay(exercise.id, setIndex, exercise.duration || 30)}
                            onChangeText={(val) =>
                              handleUpdateActiveDurationVal(exercise.id, setIndex, val, exercise.duration || 30)
                            }
                            keyboardType="number-pad"
                            editable={!isCompleted && !isResting}
                            selectTextOnFocus
                          />
                          <View style={styles.timeUnitPill}>
                            <Text style={styles.timeUnitPillText}>
                              {getActiveDurationUnit(exercise.duration || 30) === 'hour'
                                ? t('hours_short')
                                : getActiveDurationUnit(exercise.duration || 30) === 'min'
                                ? t('min_short')
                                : t('seconds_short')}
                            </Text>
                          </View>
                        </>
                      )}

                      {/* Checkmark Button */}
                      <TouchableOpacity
                        style={[
                          styles.statusCheckBtn,
                          isCompleted && styles.statusCheckBtnCompleted,
                          isResting && styles.statusCheckBtnResting,
                        ]}
                        onPress={() => toggleLogSet(exercise.id, setIndex)}
                        activeOpacity={0.75}
                      >
                        {isResting ? (
                          <Timer color={colors.primaryAction} size={15} strokeWidth={2.5} />
                        ) : (
                          <Check
                            color={isCompleted ? "#000000" : colors.textMuted}
                            size={15}
                            strokeWidth={isCompleted ? 3 : 2}
                          />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}

        {/* Dummy view for bulletproof Android keyboard scrolling */}
        <View style={{ height: keyboardHeight > 0 ? keyboardHeight + 20 : 0 }} />
      </ScrollView>

      <RestTimerOverlay 
        visible={restTimerVisible} 
        initialTime={currentRestTime} 
        exerciseId={lastLoggedSet?.exerciseId}
        setIndex={lastLoggedSet?.setIndex}
        isConfiguringDefault={!autoStartTimer}
        onClose={() => setRestTimerVisible(false)} 
        onCancelSet={() => {
          setRestTimerVisible(false);
          if (lastLoggedSet) {
             const exerciseSets = completedSets[lastLoggedSet.exerciseId] || [];
             const updated = {
               ...completedSets,
               [lastLoggedSet.exerciseId]: exerciseSets.filter(i => i !== lastLoggedSet.setIndex),
             };
             updateActiveSession(updated, actualValues);
             setLastLoggedSet(null);
          }
        }}
        onTimerComplete={() => {
          setRestTimerVisible(false);
          setLastLoggedSet(null);
        }}
      />
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topStickyBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 54 : 42,
      paddingBottom: 14,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    topBarLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    topBarIconBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.cardSurface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topBarCancelBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    topBarCenter: {
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      paddingHorizontal: 8,
    },
    topBarTitle: {
      fontFamily: AppFonts.bold,
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    topBarTimerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    pulseDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#10B981',
    },
    topBarTimerText: {
      fontFamily: AppFonts.extraBold,
      color: '#10B981',
      fontSize: 14,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
      letterSpacing: 0.3,
    },
    topBarFinishBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: '#10B981',
      paddingVertical: 7,
      paddingHorizontal: 14,
      borderRadius: 9999,
      ...Platform.select({
        ios: {
          shadowColor: '#10B981',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    topBarFinishBtnText: {
      fontFamily: AppFonts.bold,
      color: '#000000',
      fontSize: 13,
      fontWeight: '800',
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 60,
    },
    exerciseCard: {
      backgroundColor: colors.cardSurface,
      borderRadius: 16,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    exerciseCardCompleted: {
      borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    exerciseCardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    exerciseTitleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    exerciseNumberPill: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: colors.elevatedSurface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    exerciseNumberPillCompleted: {
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    exerciseNumberPillText: {
      fontFamily: AppFonts.extraBold,
      fontSize: 11,
      fontWeight: '800',
      color: colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    exerciseNumberPillTextCompleted: {
      color: '#10B981',
    },
    exerciseName: {
      fontFamily: AppFonts.bold,
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      letterSpacing: -0.3,
      flex: 1,
    },
    exerciseHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    weightHeaderBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    weightHeaderBadgeText: {
      fontFamily: AppFonts.bold,
      fontSize: 11,
      fontWeight: '700',
      color: colors.primaryAction,
      fontVariant: ['tabular-nums'],
    },
    bwHeaderBadge: {
      backgroundColor: 'rgba(99, 102, 241, 0.12)',
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
    },
    bwHeaderBadgeText: {
      fontFamily: AppFonts.bold,
      fontSize: 11,
      fontWeight: '700',
      color: '#818CF8',
    },
    timeTargetBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    timeTargetBadgeText: {
      fontFamily: AppFonts.bold,
      fontSize: 11,
      fontWeight: '700',
      color: colors.primaryAction,
      fontVariant: ['tabular-nums'],
    },
    setsProgressBadge: {
      backgroundColor: colors.elevatedSurface,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    setsProgressBadgeCompleted: {
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
    },
    setsProgressText: {
      fontFamily: AppFonts.bold,
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    setsProgressTextCompleted: {
      color: '#10B981',
    },
    tableHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      marginBottom: 8,
    },
    colHeaderSet: {
      fontFamily: AppFonts.bold,
      width: 36,
      fontSize: 11,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 0.6,
      textAlign: 'center',
    },
    colHeaderPrev: {
      fontFamily: AppFonts.bold,
      flex: 1.2,
      fontSize: 11,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 0.6,
      paddingLeft: 8,
    },
    colHeaderMetric: {
      fontFamily: AppFonts.bold,
      width: 62,
      fontSize: 11,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 0.6,
      textAlign: 'center',
    },
    colHeaderCheck: {
      fontFamily: AppFonts.bold,
      width: 40,
      fontSize: 12,
      fontWeight: '800',
      color: colors.textMuted,
      textAlign: 'center',
    },
    setRowWrapper: {
      marginBottom: 8,
    },
    setRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.elevatedSurface,
      borderRadius: 12,
      paddingVertical: 6,
      paddingHorizontal: 6,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    setRowCompleted: {
      backgroundColor: 'rgba(16, 185, 129, 0.06)',
      borderColor: 'rgba(16, 185, 129, 0.25)',
    },
    setRowResting: {
      backgroundColor: 'rgba(245, 158, 11, 0.08)',
      borderColor: 'rgba(245, 158, 11, 0.35)',
    },
    setNumberBadge: {
      width: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    setNumberText: {
      fontFamily: AppFonts.bold,
      fontSize: 13,
      fontWeight: '800',
      color: colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    setNumberTextCompleted: {
      color: '#10B981',
    },
    prevContainer: {
      flex: 1.2,
      paddingLeft: 6,
    },
    prevText: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      color: colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    tableInput: {
      fontFamily: AppFonts.bold,
      width: 58,
      marginHorizontal: 3,
      backgroundColor: colors.cardSurface,
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: '700',
      textAlign: 'center',
      borderRadius: 8,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      fontVariant: ['tabular-nums'],
    },
    tableInputCompleted: {
      color: '#10B981',
      backgroundColor: 'transparent',
      borderColor: 'transparent',
    },
    tableInputResting: {
      color: colors.primaryAction,
      borderColor: 'rgba(245, 158, 11, 0.35)',
    },
    bwModePill: {
      width: 58,
      marginHorizontal: 3,
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      borderRadius: 8,
      paddingVertical: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bwModePillText: {
      fontFamily: AppFonts.bold,
      fontSize: 11,
      fontWeight: '800',
      color: '#818CF8',
    },
    timeUnitPill: {
      width: 58,
      marginHorizontal: 3,
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderRadius: 8,
      paddingVertical: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeUnitPillText: {
      fontFamily: AppFonts.bold,
      fontSize: 11,
      fontWeight: '800',
      color: colors.primaryAction,
      textTransform: 'lowercase',
    },
    statusCheckBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceHighlight,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 4,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    statusCheckBtnCompleted: {
      backgroundColor: '#10B981',
      borderColor: '#10B981',
    },
    statusCheckBtnResting: {
      backgroundColor: 'rgba(245, 158, 11, 0.2)',
      borderColor: colors.primaryAction,
    },
  });
