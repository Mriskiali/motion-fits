import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useAlertStore } from '@/store/useAlertStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import RestTimerOverlay from '@/components/RestTimerOverlay';

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const { activeSession, templates, logSession, clearActiveSession, updateActiveSession } = useWorkoutStore();
  
  const [elapsedTime, setElapsedTime] = useState(0);
  const [restTimerVisible, setRestTimerVisible] = useState(false);
  const [currentRestTime, setCurrentRestTime] = useState(90);

  // Read from global state to persist across app closures
  const completedSets = activeSession?.completedSetsMap || {};
  const actualValues = activeSession?.actualValuesMap || {};
  
  const [lastLoggedSet, setLastLoggedSet] = useState<{ exerciseId: string; setIndex: number } | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const colors = useThemeColors();
  const styles = getStyles(colors);
  const showAlert = useAlertStore(state => state.showAlert);

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
    if (!activeSession) {
      router.replace('/(tabs)/workout');
    }
  }, [activeSession]);

  const template = templates.find((t) => t.id === activeSession?.templateId);

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

  if (!activeSession || !template) {
    return null; // Will redirect
  }

  const toggleLogSet = (exerciseId: string, setIndex: number, restTime: number) => {
    const exerciseSets = completedSets[exerciseId] || [];
    let newCompletedSets;
    
    if (exerciseSets.includes(setIndex)) {
      // Undo log
      newCompletedSets = {
        ...completedSets,
        [exerciseId]: exerciseSets.filter(i => i !== setIndex),
      };
    } else {
      // Log set and trigger Rest Timer
      newCompletedSets = {
        ...completedSets,
        [exerciseId]: [...exerciseSets, setIndex],
      };
      setCurrentRestTime(restTime);
      setLastLoggedSet({ exerciseId, setIndex });
      setRestTimerVisible(true);
    }
    
    updateActiveSession(newCompletedSets, actualValues);
  };

  const handleFinishWorkout = () => {
    showAlert(
      'Finish Workout',
      'Are you sure you want to finish this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Finish', 
          style: 'default',
          onPress: () => {
            logSession({
              ...activeSession,
              duration: elapsedTime,
              completedExercises: Object.entries(completedSets).map(([exerciseId, sets]) => {
                // Return an array of the actual reps/durations logged for each completed set
                const actualRepsArray = sets.map(setIndex => {
                  const val = actualValues[exerciseId]?.[setIndex];
                  return val ? parseInt(val) : 0;
                });
                return {
                  exerciseId,
                  completedSets: actualRepsArray,
                };
              }),
            });
            router.replace('/(tabs)/history'); // Redirect to history or somewhere appropriate
          }
        }
      ]
    );
  };

  const handleCancelWorkout = () => {
    showAlert(
      'Cancel Workout',
      'Are you sure? This session will not be saved.',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: () => {
            clearActiveSession();
            router.back();
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: template.name,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={handleCancelWorkout} style={{ marginLeft: 8 }}>
              <X color={colors.danger} size={24} />
            </TouchableOpacity>
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
        {template.exercises.map((exercise, index) => {
          const exerciseSets = completedSets[exercise.id] || [];
          
          return (
            <View key={exercise.id} style={styles.exerciseCard}>
              <Text style={styles.exerciseName}>
                {index + 1}. {exercise.name}
              </Text>
              
              <View style={styles.setsHeader}>
                <Text style={[styles.headerCol, { flex: 0.5 }]}>Set</Text>
                <Text style={[styles.headerCol, { flex: 1 }]}>Target</Text>
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
                        {isTimeBased ? 's' : ' reps'}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={[styles.logButton, isCompleted && styles.logButtonCompleted]}
                      onPress={() => toggleLogSet(exercise.id, setIndex, template.defaultRestTime)}
                    >
                      <Check color={isCompleted ? "#fff" : colors.primary} size={20} strokeWidth={isCompleted ? 3 : 2} />
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
          <Text style={styles.finishButtonText}>FINISH WORKOUT</Text>
        </TouchableOpacity>
      </View>

      <RestTimerOverlay 
        visible={restTimerVisible} 
        initialTime={currentRestTime} 
        onClose={() => setRestTimerVisible(false)} 
        onCancelSet={() => {
          setRestTimerVisible(false);
          if (lastLoggedSet) {
             toggleLogSet(lastLoggedSet.exerciseId, lastLoggedSet.setIndex, 0);
             setLastLoggedSet(null);
          }
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
    backgroundColor: colors.overlay,
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
});
