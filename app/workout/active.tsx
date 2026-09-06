import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useAlertStore } from '@/store/useAlertStore';
import { useUserStore } from '@/store/useUserStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import RestTimerOverlay from '@/components/RestTimerOverlay';
import WorkoutSummaryModal from '@/components/WorkoutSummaryModal';
import { useTranslation } from '@/hooks/useTranslation';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { dismissActiveWorkoutNotification } from '@/utils/notifications';

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const { activeSession, templates, logSession, clearActiveSession, updateActiveSession } = useWorkoutStore();
  const { autoStartTimer, defaultRestTimer, hapticsEnabled, keepScreenAwake, streak } = useUserStore();
  const { t } = useTranslation();
  
  const [elapsedTime, setElapsedTime] = useState(0);
  const [restTimerVisible, setRestTimerVisible] = useState(false);
  const [currentRestTime, setCurrentRestTime] = useState(90);

  // Read from global state to persist across app closures
  const completedSets = activeSession?.completedSetsMap || {};
  const actualValues = activeSession?.actualValuesMap || {};
  
  const [lastLoggedSet, setLastLoggedSet] = useState<{ exerciseId: string; setIndex: number } | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [summaryData, setSummaryData] = useState<{
    visible: boolean;
    workoutName: string;
    duration: number;
    exercises: { name: string; setsCount: number; weight?: number }[];
    totalVolume: number;
    streak: number;
  }>({
    visible: false,
    workoutName: '',
    duration: 0,
    exercises: [],
    totalVolume: 0,
    streak: 0,
  });

  const colors = useThemeColors();
  const styles = getStyles(colors);
  const showAlert = useAlertStore(state => state.showAlert);

  // Keep screen awake ONLY while this workout screen is open in foreground (releases when minimized or backgrounded)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && keepScreenAwake) {
        activateKeepAwakeAsync('active-workout').catch(() => {});
      } else {
        deactivateKeepAwake('active-workout').catch(() => {});
        deactivateKeepAwake().catch(() => {});
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    if (AppState.currentState === 'active' && keepScreenAwake) {
      activateKeepAwakeAsync('active-workout').catch(() => {});
    } else {
      deactivateKeepAwake('active-workout').catch(() => {});
      deactivateKeepAwake().catch(() => {});
    }

    return () => {
      subscription.remove();
      deactivateKeepAwake('active-workout').catch(() => {});
      deactivateKeepAwake().catch(() => {});
    };
  }, [keepScreenAwake]);

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
    if (!activeSession && !summaryData.visible) {
      router.replace('/(tabs)/workout');
    }
  }, [activeSession, summaryData.visible]);

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

  if (!activeSession && !summaryData.visible) {
    return null; // Will redirect
  }

  const toggleLogSet = (exerciseId: string, setIndex: number) => {
    const exerciseSets = completedSets[exerciseId] || [];
    let newCompletedSets;
    
    if (exerciseSets.includes(setIndex)) {
      // Undo log
      if (hapticsEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        Vibration.vibrate(60);
      }
      newCompletedSets = {
        ...completedSets,
        [exerciseId]: exerciseSets.filter(i => i !== setIndex),
      };
    } else {
      // Log set and trigger Rest Timer
      if (hapticsEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        Vibration.vibrate(100);
      }
      newCompletedSets = {
        ...completedSets,
        [exerciseId]: [...exerciseSets, setIndex],
      };
      setLastLoggedSet({ exerciseId, setIndex });
      setCurrentRestTime(autoStartTimer ? defaultRestTimer : 0);
      setRestTimerVisible(true);
    }
    
    updateActiveSession(newCompletedSets, actualValues);
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

            // Calculate volume and exercise summaries for share card
            let calculatedVolume = 0;
            const exercisesSummary = template.exercises.map((ex) => {
              const sets = completedSets[ex.id] || [];
              const setsCount = sets.length;
              sets.forEach((setIndex) => {
                const reps = actualValues[ex.id]?.[setIndex] ? parseInt(actualValues[ex.id][setIndex], 10) : 0;
                const weight = ex.weight || 0;
                calculatedVolume += reps * weight;
              });
              return {
                name: ex.name,
                setsCount,
                weight: ex.weight,
              };
            }).filter((ex) => ex.setsCount > 0);

            // Log to store
            logSession({
              ...activeSession,
              duration: elapsedTime,
              completedExercises: Object.entries(completedSets).map(([exerciseId, sets]) => {
                const actualRepsArray = sets.map(setIndex => {
                  const val = actualValues[exerciseId]?.[setIndex];
                  return val ? parseInt(val, 10) : 0;
                });
                return {
                  exerciseId,
                  completedSets: actualRepsArray,
                };
              }),
            });

            // Auto unassign if they just finished today's scheduled workout
            const { scheduledWorkouts, scheduleWorkout } = useWorkoutStore.getState();
            const todayStr = new Date().toISOString().split('T')[0];
            if (scheduledWorkouts[todayStr] === activeSession.templateId) {
              scheduleWorkout(todayStr, null);
            }

            dismissActiveWorkoutNotification().catch(() => {});

            // Show summary celebration modal
            setSummaryData({
              visible: true,
              workoutName: template.name,
              duration: elapsedTime,
              exercises: exercisesSummary,
              totalVolume: calculatedVolume,
              streak: Math.max(1, streak),
            });
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
              const todayStr = new Date().toISOString().split('T')[0];
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

  const handleMinimize = () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/workout');
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: template?.name || summaryData.workoutName || 'Workout',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerLeft: () => (
            <View style={styles.headerActionGroup}>
              <TouchableOpacity
                onPress={handleMinimize}
                accessibilityLabel={t('minimize')}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.headerIconButton}
              >
                <Ionicons name="chevron-down" color={colors.text} size={26} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCancelWorkout}
                accessibilityLabel={t('cancel_workout')}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.headerIconButton}
              >
                <Ionicons name="close" color={colors.danger} size={22} />
              </TouchableOpacity>
            </View>
          ),
          headerRight: () => (
            <Text style={styles.elapsedTime}>{formatTime(elapsedTime)}</Text>
          ),
        }} 
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {template?.exercises.map((exercise, index) => {
          const exerciseSets = completedSets[exercise.id] || [];
          
          return (
            <View key={exercise.id} style={styles.exerciseCard}>
              <Text style={styles.exerciseName}>
                {index + 1}. {exercise.name}
              </Text>
              
              <View style={styles.setsHeader}>
                <Text style={[styles.headerCol, { flex: 0.5 }]}>{t('set')}</Text>
                <Text style={[styles.headerCol, { flex: 1 }]}>{t('target')}</Text>
                <Text style={[styles.headerCol, { flex: 1, textAlign: 'right' }]}></Text>
              </View>

              {Array.from({ length: exercise.sets }).map((_, setIndex) => {
                const isCompleted = exerciseSets.includes(setIndex);
                const isTimeBased = exercise.type === 'time';
                
                return (
                  <View 
                    key={setIndex} 
                    style={[styles.setRow, isCompleted && styles.setRowCompleted]}
                  >
                    <Text style={[styles.setNumber, isCompleted && styles.textCompleted]}>
                      {setIndex + 1}
                    </Text>
                    <View style={styles.targetContainer}>
                      <TextInput
                        style={[styles.inputBox, isCompleted && styles.inputBoxCompleted]}
                        value={
                          actualValues[exercise.id]?.[setIndex] !== undefined
                            ? actualValues[exercise.id]?.[setIndex]
                            : isTimeBased ? String(exercise.duration || 0) : String(exercise.reps || 0)
                        }
                        onChangeText={(val) => {
                          const newActualValues = {
                            ...actualValues,
                            [exercise.id]: {
                              ...(actualValues[exercise.id] || {}),
                              [setIndex]: val
                            }
                          };
                          updateActiveSession(completedSets, newActualValues);
                        }}
                        keyboardType="numeric"
                        editable={!isCompleted}
                        selectTextOnFocus
                      />
                      <Text style={[styles.unitText, isCompleted && styles.textCompleted]}>
                        {isTimeBased ? t('seconds_short') : ` ${t('reps_label')}`}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={[styles.logButton, isCompleted && styles.logButtonCompleted]}
                      onPress={() => toggleLogSet(exercise.id, setIndex)}
                    >
                      <Ionicons name="checkmark-outline" color={isCompleted ? "#fff" : colors.primary} size={20} strokeWidth={isCompleted ? 3 : 2} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          );
        })}
        {/* Dummy view for bulletproof Android keyboard scrolling */}
        <View style={{ height: keyboardHeight > 0 ? keyboardHeight + 20 : 0 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.finishButton} onPress={handleFinishWorkout}>
          <Text style={styles.finishButtonText}>{t('finish_workout')}</Text>
        </TouchableOpacity>
      </View>

      <RestTimerOverlay 
        visible={restTimerVisible} 
        initialTime={currentRestTime} 
        onClose={() => setRestTimerVisible(false)} 
        onCancelSet={() => {
          setRestTimerVisible(false);
          if (lastLoggedSet) {
             toggleLogSet(lastLoggedSet.exerciseId, lastLoggedSet.setIndex);
             setLastLoggedSet(null);
          }
        }}
      />

      <WorkoutSummaryModal
        visible={summaryData.visible}
        workoutName={summaryData.workoutName}
        duration={summaryData.duration}
        exercises={summaryData.exercises}
        totalVolume={summaryData.totalVolume}
        streak={summaryData.streak}
        onClose={() => {
          setSummaryData(prev => ({ ...prev, visible: false }));
          clearActiveSession();
          router.replace('/(tabs)/history');
        }}
      />
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  elapsedTime: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
    marginRight: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // Space for footer
  },
  exerciseCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  setsHeader: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  headerCol: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  setRowCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)', // emerald-500 tint
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  setNumber: {
    flex: 0.5,
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  targetContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputBox: {
    backgroundColor: colors.card, // darker than row
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 60,
  },
  inputBoxCompleted: {
    color: colors.success,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  unitText: {
    color: colors.text,
    fontSize: 14,
  },
  textCompleted: {
    color: colors.success, // emerald-500
  },
  logButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)', // subtle primary tint
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  logButtonCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 40,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  finishButton: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  headerActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 4,
  },
  headerIconButton: {
    padding: 4,
  },
});
