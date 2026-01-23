
import React, { useState, useRef, useEffect } from "react";
import { Stack, router } from "expo-router";
import {
  StyleSheet,
  View,
  Text,
  Platform,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
  Animated,
  ActivityIndicator,
  AppState,
  BackHandler,
  TextInput
} from "react-native";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { useTheme, useFocusEffect } from "@react-navigation/native";
import { colors } from "@/styles/commonStyles";
import * as Haptics from "expo-haptics";
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dataStore } from '@/lib/dataStore';
import { showSuccessToast, showErrorToast } from '@/utils/notifications';

interface Exercise {
  id: string;
  name: string;
  type?: 'strength' | 'cardio' | 'duration'; // strength (sets/reps/weight), cardio (duration), duration (just time)
  sets: string;
  reps?: string;
  duration?: string;
  hours?: string; // for cardio/duration exercises
  minutes?: string; // for cardio/duration exercises
  seconds?: string; // for cardio/duration exercises
  notes?: string;
}

interface WorkoutPlan {
  id: string;
  name: string;
  subtitle: string;
  exercises: Exercise[];
  icon: string;
  color: string;
  isCustom?: boolean;
}

interface CompletedExercise {
  planId: string;
  exerciseId: string;
  date: string;
}

interface DayWorkoutAssignment {
  date: string;
  planId: string | null;
}

interface ExerciseSetCount {
  planId: string;
  exerciseId: string;
  date: string;
  count: number;
}

interface RestTimer {
  planId: string;
  exerciseId: string;
  date: string;
  endsAt: number;
  durationSec: number;
  notified?: boolean;
}

type SessionExercise = {
  exerciseId: string;
  name: string;
  targetSets: number;
  completedSets: number;
  completed: boolean;
};

interface WorkoutSession {
  id: string;
  date: string;
  planId: string;
  planName: string;
  color: string;
  startedAt: number;
  endedAt: number;
  durationSec: number;
  exercises: SessionExercise[];
  completionPercent: number;
  totalSets: number;
  // optional summaries
  restCount?: number;
  restAvgSec?: number;
  setLogs?: SetLog[];
  newPBs?: { exerciseId: string; name: string; metric: '1RM'; value: number }[];
}

type SetLog = {
  planId: string;
  exerciseId: string;
  date: string;
  setIndex: number;
  weight: number;
  reps: number;
  duration?: number; // For cardio/duration exercises
};

const DAYS_OF_WEEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

// Simple Progress Component with numeric animation
const AnimatedProgressText = ({ value, size = 20 }: { value: number; size?: number }) => {
  const [currentValue, setCurrentValue] = useState(0);
  const [opacity, setOpacity] = useState(0.5);

  useEffect(() => {
    // Reset to 0 and fade in when value changes
    setOpacity(0.5);
    setCurrentValue(0);

    // Animate to target value
    const duration = 800;
    const startTime = Date.now();
    const startValue = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out function for smoother animation
      const easeOut = 1 - Math.pow(1 - progress, 2);
      const newValue = startValue + (value - startValue) * easeOut;

      setCurrentValue(newValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setOpacity(1);
      }
    };

    animate();
  }, [value]);

  return (
    <Text
      style={[
        styles.progressPercentage,
        { fontSize: size, opacity }
      ]}
    >
      {Math.round(currentValue)}%
    </Text>
  );
};

const defaultWorkoutPlans: WorkoutPlan[] = [
  {
    id: 'upper1',
    name: 'UPPER',
    subtitle: 'Chest, Shoulder, Triceps',
    icon: 'figure.strengthtraining.traditional',
    color: '#64b5f6',
    exercises: [
      { id: 'u1-1', name: 'Resistance Band Chest Press', type: 'strength', sets: '4', reps: '12' },
      { id: 'u1-2', name: 'Incline Push-up / Pike Push-up', type: 'strength', sets: '3', reps: '10' },
      { id: 'u1-3', name: 'Single Dumbbell Shoulder Press', type: 'strength', sets: '3', reps: '12' },
      { id: 'u1-4', name: 'Resistance Band Lateral Raise', type: 'strength', sets: '3', reps: '12–15' },
      { id: 'u1-5', name: 'Single Dumbbell Overhead Tricep Extension', type: 'strength', sets: '3', reps: '12' },
      { id: 'u1-6', name: 'Resistance Band Tricep Pushdown', type: 'strength', sets: '3', reps: '12' },
      { id: 'u1-7', name: 'Cooldown Cycling', type: 'cardio', sets: '1', duration: '5–15 minutes light', hours: '0', minutes: '5', seconds: '0' },
    ],
  },
  {
    id: 'lower',
    name: 'LOWER',
    subtitle: 'Legs + Glutes + Calves',
    icon: 'figure.strengthtraining.functional',
    color: '#aed581',
    exercises: [
      { id: 'l-1', name: 'Goblet Squat (with dumbbell)', type: 'strength', sets: '4', reps: '12' },
      { id: 'l-2', name: 'Resistance Band Deadlift / Romanian Deadlift', type: 'strength', sets: '3', reps: '12' },
      { id: 'l-3', name: 'Front Lunges', type: 'strength', sets: '3', reps: '12' },
      { id: 'l-4', name: 'Glute Bridge', type: 'strength', sets: '3', reps: '15' },
      { id: 'l-5', name: 'Standing Calf Raise', type: 'strength', sets: '4', reps: '15–20' },
      { id: 'l-6', name: 'Cycling', type: 'cardio', sets: '1', duration: '10–20 minutes', hours: '0', minutes: '10', seconds: '0' },
    ],
  },
  {
    id: 'upper2',
    name: 'UPPER',
    subtitle: 'Back, Biceps, Forearm, Core',
    icon: 'figure.core.training',
    color: '#ffb74d',
    exercises: [
      { id: 'u2-1', name: 'Resistance Band Row', type: 'strength', sets: '4', reps: '12' },
      { id: 'u2-2', name: 'Resistance Band Face Pull', type: 'strength', sets: '3', reps: '12' },
      { id: 'u2-3', name: 'Single Dumbbell Bicep Curl', type: 'strength', sets: '3', reps: '12' },
      { id: 'u2-4', name: 'Hammer Curl (alternate dumbbell)', type: 'strength', sets: '3', reps: '12' },
      { id: 'u2-5', name: 'Resistance Band Reverse Curl', type: 'strength', sets: '3', reps: '12' },
      { id: 'u2-6', name: 'Renegade Row (with dumbbell)', type: 'strength', sets: '3', reps: '10' },
      { id: 'u2-7', name: 'Penguin Crunch', type: 'strength', sets: '3', reps: '20' },
      { id: 'u2-8', name: 'Plank', type: 'duration', sets: '3', duration: '30–45 seconds', hours: '0', minutes: '0', seconds: '30' },
      { id: 'u2-9', name: 'Hollow Position', type: 'duration', sets: '3', duration: '30 seconds', hours: '0', minutes: '0', seconds: '30' },
      { id: 'u2-10', name: 'Cooldown Cycling', type: 'cardio', sets: '1', duration: '5–15 minutes easy', hours: '0', minutes: '5', seconds: '0' },
    ],
  },
];

export default function WorkoutScreen() {
  const theme = useTheme();
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
  const [completedExercises, setCompletedExercises] = useState<CompletedExercise[]>([]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showExerciseDetail, setShowExerciseDetail] = useState(false);
  const [showWorkoutSelector, setShowWorkoutSelector] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [workoutAssignments, setWorkoutAssignments] = useState<DayWorkoutAssignment[]>([]);
  const [customWorkoutPlans, setCustomWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [exerciseSetCounts, setExerciseSetCounts] = useState<ExerciseSetCount[]>([]);
  const [restTimers, setRestTimers] = useState<RestTimer[]>([]);
  const [now, setNow] = useState<number>(Date.now());
  const [currentSessionStart, setCurrentSessionStart] = useState<number | null>(null);
  const [setLogs, setSetLogs] = useState<SetLog[]>([]);
  const [best1RMByExercise, setBest1RMByExercise] = useState<Record<string, number>>({});
  const [restDefaultSec, setRestDefaultSec] = useState<number>(60);
  const [customRestSec, setCustomRestSec] = useState<number>(60); // Default custom rest time
  const [autoRestOnIncrement, setAutoRestOnIncrement] = useState<boolean>(true);
  const [exerciseGroups, setExerciseGroups] = useState<Record<string, string[]>>({}); // Groups of exercises that form supersets/circuits
  const [selectedExercisesForGroup, setSelectedExercisesForGroup] = useState<string[]>([]); // Currently selected exercises for grouping

  // Load user's custom rest time preferences
  useEffect(() => {
    const loadCustomRestTime = async () => {
      try {
        const savedTime = await AsyncStorage.getItem('customRestTime');
        if (savedTime) {
          const time = parseInt(savedTime, 10);
          if (!isNaN(time) && time > 0) {
            setCustomRestSec(time);
            setRestDefaultSec(time); // Also set as default if user prefers
          }
        }
      } catch (error) {
        console.log('Could not load custom rest time:', error);
      }
    };

    loadCustomRestTime();
  }, []);
  const [restEvents, setRestEvents] = useState<
    { planId: string; exerciseId: string; date: string; startedAt: number; durationSec: number }[]
  >([]);
  // Track if session is actively in progress
  const [sessionInProgress, setSessionInProgress] = useState<boolean>(false);
  // Onboarding/helper states
  const [hasAnySession, setHasAnySession] = useState<boolean>(false);
  const [showWorkoutOnboarding, setShowWorkoutOnboarding] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  // Celebration states
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationTitle, setCelebrationTitle] = useState('');
  const [celebrationSubtitle, setCelebrationSubtitle] = useState('');
  
  // Load data from AsyncStorage on mount
  useEffect(() => {
    loadData();
  }, []);

  // Reload data when screen gains focus (e.g., after creating or editing workouts)
  useFocusEffect(
    React.useCallback(() => {
      loadData();
      return () => {};
    }, [])
  );

  // Save data to AsyncStorage whenever it changes
  useEffect(() => {
    saveData();
  }, [completedExercises, workoutAssignments, customWorkoutPlans, exerciseSetCounts, restTimers, setLogs]);

  // Persist user-selected default rest time
  useEffect(() => {
    AsyncStorage.setItem('restDefaultSec', JSON.stringify(restDefaultSec)).catch(() => {});
  }, [restDefaultSec]);

  // Generate week dates
  useEffect(() => {
    generateWeekDates();
  }, [selectedDate]);

  // Global 1s tick (used for rest timers)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Handle app going to background/foreground
  useEffect(() => {
    let appState = AppState.currentState;

    const handleAppStateChange = (nextAppState: string) => {
      // Only handle transition from active to background while modal is open
      if (appState === 'active' && nextAppState === 'background' && sessionInProgress && showPlanModal) {
        // Don't save the session automatically when going to background
        // Just close the modal but preserve the session data for analytics
        setShowPlanModal(false);
      }
      appState = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [sessionInProgress, showPlanModal]);

  // Handle hardware back button on Android when modal is open
  useEffect(() => {
    const handleBackButton = () => {
      if (showPlanModal) {
        // Don't save the session when user presses back button
        // Just close the modal but preserve the session data for analytics
        setShowPlanModal(false);
        return true; // Prevent default back behavior
      }
      return false; // Allow default back behavior
    };

    if (Platform.OS === 'android') {
      const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackButton);
      return () => subscription.remove();
    }
  }, [showPlanModal]);

  // Play sound notification
  const playSound = async (soundName: 'complete' | 'restEnd' | 'success' | 'warning' | 'error' = 'success') => {
    try {
      // Check if we're in Expo Go, where push notifications aren't supported
      const isExpoGo = Constants.appOwnership === 'expo';

      if (isExpoGo) {
        // In Expo Go, we can't use notifications for sounds, so we'll just use haptics
        if (Platform.OS !== 'web') {
          switch(soundName) {
            case 'complete':
            case 'success':
              if (Haptics?.NotificationFeedbackType?.Success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              break;
            case 'warning':
              if (Haptics?.NotificationFeedbackType?.Warning) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              }
              break;
            case 'error':
              if (Haptics?.NotificationFeedbackType?.Error) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              }
              break;
            default:
              if (Haptics?.NotificationFeedbackType?.Success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
          }
        }
        return;
      }

      // Request notification permissions if not already granted
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permission not granted for sounds');
        // Fallback to haptics if notification permission is not granted
        if (Platform.OS !== 'web' && Haptics?.NotificationFeedbackType?.Success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        return;
      }

      // Play different sounds based on the type
      let soundFile = 'default';
      switch (soundName) {
        case 'complete':
          soundFile = 'complete';
          break;
        case 'restEnd':
          soundFile = 'complete';
          break;
        case 'success':
          soundFile = 'default';
          break;
        case 'warning':
          soundFile = 'default';
          break;
        case 'error':
          soundFile = 'default';
          break;
      }

      // Schedule a silent notification with sound to play the sound
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '', // Silent notification
          body: '',
          sound: soundFile,
          vibrate: false,
          priority: Notifications.AndroidNotificationPriority.MIN,
        },
        trigger: { seconds: 0.1 }, // Trigger immediately
      });
    } catch (error) {
      console.log('Error playing sound:', error);
      // Fallback to haptics if sound fails
      if (Platform.OS !== 'web' && Haptics?.NotificationFeedbackType?.Success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      // Only show toast in development to avoid spamming users
      if (__DEV__) {
        showErrorToast('Audio Error', 'Failed to play sound notification.');
      }
    }
  };

  // Notify when any rest timer finishes
  useEffect(() => {
    const due = restTimers.filter(t => !t.notified && t.endsAt <= now);
    if (due.length) {
      if (Platform.OS !== 'web') {
        // Enhanced haptic feedback for rest timer completion
        if (Haptics?.NotificationFeedbackType?.Warning) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } else if (Haptics?.NotificationFeedbackType?.Success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        // Enhanced audio alert for rest timer
        playSound('restEnd');
      }

      setRestTimers(prev => prev.map(t => t.endsAt <= now ? { ...t, notified: true } : t));
    }
  }, [now, restTimers]);

  // Load previous personal bests (1RM) per exercise when opening the plan modal
  const loadBest1RMMap = async () => {
    try {
      const sessionsStr = await AsyncStorage.getItem('workoutSessions');
      const sessions: any[] = sessionsStr ? JSON.parse(sessionsStr) : [];
      const map: Record<string, number> = {};
      sessions.forEach((s) => {
        const logs: any[] = s.setLogs || [];
        logs.forEach((l) => {
          const weight = Number(l.weight || 0);
          const reps = Number(l.reps || 0);
          const oneRM = weight > 0 && reps > 0 ? weight * (1 + reps / 30) : 0;
          if (oneRM > (map[l.exerciseId] || 0)) {
            map[l.exerciseId] = oneRM;
          }
        });
      });
      setBest1RMByExercise(map);
    } catch (e) {
      console.log('loadBest1RMMap error', e);
      if (__DEV__) {
        showErrorToast('Analytics Error', 'Failed to load personal records.');
      }
    }
  };

  useEffect(() => {
    if (showPlanModal) {
      loadBest1RMMap();
    }
  }, [showPlanModal]);

  const loadData = async () => {
    try {
      setLoading(true);
      const completedExercises = await dataStore.getCompletedExercises();
      const workoutAssignments = await dataStore.getWorkoutAssignments();
      const customWorkoutPlans = await dataStore.getCustomWorkoutPlans();
      const exerciseSetCounts = await dataStore.getExerciseSetCounts();
      const restTimers = await dataStore.getRestTimers();
      const setLogs = await dataStore.getSetLogs();

      setCompletedExercises(completedExercises);
      setWorkoutAssignments(workoutAssignments);
      setCustomWorkoutPlans(customWorkoutPlans);
      setExerciseSetCounts(exerciseSetCounts);
      setRestTimers(restTimers);
      setSetLogs(setLogs);

      // Has any session ever been saved? (for onboarding context)
      try {
        const sessions = await dataStore.getWorkoutSessions();
        setHasAnySession(Array.isArray(sessions) && sessions.length > 0);
      } catch {}

      const restDefaultSec = await dataStore.getRestDefaultSec();
      setRestDefaultSec(restDefaultSec);

      const autoRestOnIncrement = await dataStore.getAutoRestOnIncrement();
      setAutoRestOnIncrement(autoRestOnIncrement);

      // Show the quick-start helper until dismissed by the user
      const onboardingSeen = await dataStore.getOnboardingSeen();
      if (!onboardingSeen) {
        setShowWorkoutOnboarding(true);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showErrorToast('Load Error', 'Failed to load workout data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveData = async () => {
    try {
      await dataStore.setCompletedExercises(completedExercises);
      await dataStore.setWorkoutAssignments(workoutAssignments);
      await dataStore.setCustomWorkoutPlans(customWorkoutPlans);
      await dataStore.setExerciseSetCounts(exerciseSetCounts);
      await dataStore.setRestTimers(restTimers);
      await dataStore.setSetLogs(setLogs);
    } catch (error) {
      console.error('Error saving data:', error);
      // Only show toast in development to avoid spamming users
      if (__DEV__) {
        showErrorToast('Save Error', 'Data failed to save. Changes may be lost.');
      }
    }
  };

  const generateWeekDates = () => {
    const dates: Date[] = [];
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    
    setWeekDates(dates);
  };

  const getDateString = (date: Date) => {
    // Format date as YYYY-MM-DD in local time to prevent timezone shifts
    // Use toLocaleDateString to ensure local timezone is respected
    return date.toLocaleDateString('sv-SE'); // Swedish locale gives YYYY-MM-DD format
  };

  const getTodayString = () => {
    return getDateString(new Date());
  };

  const isToday = (date: Date) => {
    return getDateString(date) === getTodayString();
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return getDateString(date1) === getDateString(date2);
  };

  const getAllWorkoutPlans = () => {
    return [...defaultWorkoutPlans, ...customWorkoutPlans];
  };

  const getWorkoutForDate = (date: Date) => {
    const dateStr = getDateString(date);
    const assignment = workoutAssignments.find(a => a.date === dateStr);
    if (assignment && assignment.planId) {
      return getAllWorkoutPlans().find(p => p.id === assignment.planId);
    }
    return null;
  };

  const assignWorkoutToDate = (date: Date, planId: string | null) => {
    const dateStr = getDateString(date);
    const existingIndex = workoutAssignments.findIndex(a => a.date === dateStr);

    if (existingIndex >= 0) {
      const updated = [...workoutAssignments];
      updated[existingIndex] = { date: dateStr, planId };
      setWorkoutAssignments(updated);
    } else {
      setWorkoutAssignments([...workoutAssignments, { date: dateStr, planId }]);
    }
  };

  const deleteWorkoutPlan = async (planId: string) => {
    try {
      // Remove plan from custom plans
      const existingPlans = await dataStore.getCustomWorkoutPlans();
      const updatedPlans = existingPlans.filter(p => p.id !== planId);
      await dataStore.setCustomWorkoutPlans(updatedPlans);
      setCustomWorkoutPlans(updatedPlans);

      // Unassign any days referencing this plan
      setWorkoutAssignments(prev =>
        prev.map(a => (a.planId === planId ? { ...a, planId: null } : a))
      );

      // Remove completed exercises linked to this plan
      setCompletedExercises(prev => prev.filter(ce => ce.planId !== planId));

      if (Platform.OS !== 'web' && Haptics?.NotificationFeedbackType?.Success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      showSuccessToast('Deleted', 'Workout plan has been removed.');
    } catch (error) {
      console.error('Error deleting workout plan:', error);
      showErrorToast('Delete Failed', 'Failed to delete workout plan.');
    }
  };

  const isExerciseCompleted = (planId: string, exerciseId: string, date?: Date) => {
    const dateStr = date ? getDateString(date) : getDateString(selectedDate);

    // Get the exercise to determine its type
    const plan = getAllWorkoutPlans().find(p => p.id === planId);
    const exercise = plan?.exercises.find(ex => ex.id === exerciseId);

    // For duration/cardio exercises, check if duration was logged
    if (exercise && (exercise.type === 'cardio' || exercise.type === 'duration')) {
      const logs = getExerciseLogs(planId, exerciseId, date);
      return logs.length > 0;
    } else {
      // For strength exercises, check if marked as completed
      return completedExercises.some(
        ce => ce.planId === planId && ce.exerciseId === exerciseId && ce.date === dateStr
      );
    }
  };

  const toggleExerciseCompletion = (planId: string, exerciseId: string) => {
    const dateStr = getDateString(selectedDate);
    const isCompleted = isExerciseCompleted(planId, exerciseId);

    // Get the exercise to determine its type
    const plan = getAllWorkoutPlans().find(p => p.id === planId);
    const exercise = plan?.exercises.find(ex => ex.id === exerciseId);

    if (Platform.OS !== 'web' && Haptics?.ImpactFeedbackStyle?.Medium) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // For duration/cardio exercises, we don't use the traditional completion toggle
    if (exercise && (exercise.type === 'cardio' || exercise.type === 'duration')) {
      // For these exercises, we'll handle completion differently - perhaps by logging duration
      // For now, we'll just play the completion sound if not already completed
      if (!isCompleted && Platform.OS !== 'web') {
        playSound('complete');
      }
    } else {
      // For strength exercises, use the traditional completion toggle
      if (isCompleted) {
        setCompletedExercises(prev =>
          prev.filter(ce => !(ce.planId === planId && ce.exerciseId === exerciseId && ce.date === dateStr))
        );
      } else {
        setCompletedExercises(prev => [...prev, { planId, exerciseId, date: dateStr }]);
        // Play sound when exercise is completed
        if (Platform.OS !== 'web') {
          playSound('complete');
        }
      }
    }
  };

  // Helpers for tracking per-exercise set counts per day
  const parseTargetSets = (sets: string | undefined) => {
    if (!sets) return 0;
    const clean = String(sets).trim();
    const n = parseInt(clean.replace(/[^\d]/g, ''), 10);
    return Number.isNaN(n) ? 0 : n;
  };

  // Extract a default reps value from a reps string like "12" or "12–15"
  const parseDefaultReps = (reps: string | undefined) => {
    if (!reps) return 0;
    const digits = reps.match(/\d+/g);
    return digits && digits.length ? parseInt(digits[0], 10) : 0;
  };

  const formatSeconds = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const getExerciseSetCount = (planId: string, exerciseId: string, date?: Date) => {
    const dateStr = getDateString(date ?? selectedDate);
    const item = exerciseSetCounts.find(
      (es) => es.planId === planId && es.exerciseId === exerciseId && es.date === dateStr
    );
    return item ? item.count : 0;
  };

  const DEFAULT_REST_SEC = 60;

  // Allow user to define custom rest times
  const REST_PRESET_OPTIONS = [30, 60, 90, 120, 180]; // Default options

  const startRestTimer = (planId: string, exerciseId: string, seconds: number = DEFAULT_REST_SEC) => {
    const dateStr = getDateString(selectedDate);
    const endsAt = Date.now() + seconds * 1000;
    setRestTimers(prev => {
      const next = prev.filter(t => !(t.planId === planId && t.exerciseId === exerciseId && t.date === dateStr));
      next.push({ planId, exerciseId, date: dateStr, endsAt, durationSec: seconds, notified: false });
      return next;
    });
    // track rest event for history summary of this session
    setRestEvents(prev => [...prev, { planId, exerciseId, date: dateStr, startedAt: Date.now(), durationSec: seconds }]);
  };

   // Allow canceling a running rest timer (for accidental taps)
   const cancelRestTimer = (planId: string, exerciseId: string, date?: Date) => {
     const dateStr = getDateString(date ?? selectedDate);
     // remove active rest timer
     setRestTimers(prev =>
       prev.filter(t => !(t.planId === planId && t.exerciseId === exerciseId && t.date === dateStr))
     );
     // also remove the most recent rest event for this exercise/date so history isn't inflated
     setRestEvents(prev => {
       let lastIdx = -1;
       for (let i = prev.length - 1; i >= 0; i--) {
         const ev = prev[i];
         if (ev.planId === planId && ev.exerciseId === exerciseId && ev.date === dateStr) {
           lastIdx = i;
           break;
         }
       }
       if (lastIdx === -1) return prev;
       const next = prev.slice(0, lastIdx).concat(prev.slice(lastIdx + 1));
       return next;
     });
   };

  const getRemainingRestSec = (planId: string, exerciseId: string, date?: Date) => {
    const dateStr = getDateString(date ?? selectedDate);
    const t = restTimers.find(rt => rt.planId === planId && rt.exerciseId === exerciseId && rt.date === dateStr);
    if (!t) return 0;
    const remainingMs = t.endsAt - now;
    return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
  };

  // Logs helpers and PB calculations
  const getExerciseLogs = (planId: string, exerciseId: string, date?: Date) => {
    const dateStr = getDateString(date ?? selectedDate);
    return setLogs
      .filter(l => l.planId === planId && l.exerciseId === exerciseId && l.date === dateStr)
      .sort((a, b) => a.setIndex - b.setIndex);
  };

  const getNextSetIndex = (planId: string, exerciseId: string) => {
    const logs = getExerciseLogs(planId, exerciseId);
    return (logs[logs.length - 1]?.setIndex || 0) + 1;
  };


  const calculate1RM = (weight: number, reps: number) => {
    if (!weight || !reps) return 0;
    return weight * (1 + reps / 30);
  };

  const computeBest1RMFromLogs = (logs: SetLog[]) => {
    let best = 0;
    logs.forEach(l => {
      const oneRM = calculate1RM(Number(l.weight || 0), Number(l.reps || 0));
      if (oneRM > best) best = oneRM;
    });
    return best;
  };

  const onLogSet = (planId: string, exerciseId: string, targetSets: number, repsDefault?: number) => {
    // Get the exercise to determine its type
    const plan = getAllWorkoutPlans().find(p => p.id === planId);
    const exercise = plan?.exercises.find(ex => ex.id === exerciseId);

    // For duration/cardio exercises, we'll handle logging differently
    if (exercise && (exercise.type === 'cardio' || exercise.type === 'duration')) {
      // For these exercises, we'll show a prompt to enter duration
      // For now, we'll just mark the exercise as completed by adding a log entry
      const dateStr = getDateString(selectedDate);
      const nextIndex = getNextSetIndex(planId, exerciseId);

      // Calculate total duration in minutes from hours, minutes, and seconds
      const hours = parseInt(exercise.hours || '0');
      const minutes = parseInt(exercise.minutes || '0');
      const seconds = parseInt(exercise.seconds || '0');
      const totalMinutes = hours * 60 + minutes + seconds / 60;

      // Persist log for cardio/duration exercise
      setSetLogs(prev => {
        const withoutDup = prev.filter(l => !(l.planId === planId && l.exerciseId === exerciseId && l.date === dateStr && l.setIndex === nextIndex));
        return [...withoutDup, {
          planId,
          exerciseId,
          date: dateStr,
          setIndex: nextIndex,
          weight: 0,
          reps: 0, // For cardio/duration, reps might not be applicable
          duration: totalMinutes // Store as total minutes
        }];
      });

      // Enhanced haptic feedback for logging
      if (Platform.OS !== 'web') {
        if (Haptics?.ImpactFeedbackStyle?.Medium) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      }
      return;
    }

    // For strength exercises, use the traditional set logging
    // Check if exercise is already completed
    if (isExerciseCompleted(planId, exerciseId)) {
      // Optionally show a message to the user
      if (Platform.OS !== 'web' && Haptics?.NotificationFeedbackType?.Warning) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      return; // Don't proceed if exercise is completed
    }

    // Check if a rest timer is already running for this exercise
    if (getRemainingRestSec(planId, exerciseId) > 0) {
      // Optionally show a message to the user
      if (Platform.OS !== 'web' && Haptics?.NotificationFeedbackType?.Warning) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      return; // Don't start a new timer if one is already running
    }

    const dateStr = getDateString(selectedDate);
    const nextIndex = getNextSetIndex(planId, exerciseId);
    const weight = 0;
    const reps = Number(repsDefault || 0);

    // Persist log for strength exercise
    setSetLogs(prev => {
      const withoutDup = prev.filter(l => !(l.planId === planId && l.exerciseId === exerciseId && l.date === dateStr && l.setIndex === nextIndex));
      return [...withoutDup, { planId, exerciseId, date: dateStr, setIndex: nextIndex, weight, reps }];
    });

    // Increment set count and start rest
    const current = getExerciseSetCount(planId, exerciseId);
    const next = Math.min(current + 1, targetSets);
    setExerciseSetCount(planId, exerciseId, next, targetSets);
    startRestTimer(planId, exerciseId, restDefaultSec);

    // Enhanced haptic feedback for set completion
    if (Platform.OS !== 'web') {
      // Medium impact for set completion
      if (Haptics?.ImpactFeedbackStyle?.Medium) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  };

  // Snapshot current exercise progress for a plan
  const getExercisesSnapshot = (plan: WorkoutPlan): SessionExercise[] => {
    return plan.exercises.map((ex) => {
      const target = parseTargetSets(ex.sets);
      const completedSets = getExerciseSetCount(plan.id, ex.id);
      const completed = isExerciseCompleted(plan.id, ex.id);
      return {
        exerciseId: ex.id,
        name: ex.name,
        targetSets: target,
        completedSets,
        completed,
      };
    });
  };

  const calculateCompletionPercentFromSnapshot = (items: SessionExercise[]) => {
    if (!items.length) return 0;
    const completedCount = items.filter((i) => i.completed).length;
    return Math.round((completedCount / items.length) * 100);
  };

  const finishCurrentSession = async () => {
    if (!selectedPlan) return;
    const dateStr = getDateString(selectedDate);
    const startedAt = currentSessionStart ?? Date.now();
    const endedAt = Date.now();
    const durationSec = Math.max(1, Math.round((endedAt - startedAt) / 1000));

    const exercisesSnapshot = getExercisesSnapshot(selectedPlan);
    const completionPercent = calculateCompletionPercentFromSnapshot(exercisesSnapshot);
    const totalSets = exercisesSnapshot.reduce((sum, i) => sum + i.completedSets, 0);

    // Collect logs for this session (this date + plan)
    const logsForSession = setLogs.filter(l => l.date === dateStr && l.planId === selectedPlan.id);

    // Build previous best map from existing sessions
    let prevBestMap: Record<string, number> = {};
    try {
      const existingStr = await AsyncStorage.getItem('workoutSessions');
      const existingArr: any[] = existingStr ? JSON.parse(existingStr) : [];
      existingArr.forEach(s => {
        const logs: any[] = s.setLogs || [];
        logs.forEach((l) => {
          const weight = Number(l.weight || 0);
          const reps = Number(l.reps || 0);
          const oneRM = weight > 0 && reps > 0 ? weight * (1 + reps / 30) : 0;
          if (oneRM > (prevBestMap[l.exerciseId] || 0)) {
            prevBestMap[l.exerciseId] = oneRM;
          }
        });
      });
    } catch (e) {
      console.log('PB precompute error', e);
      if (__DEV__) {
        showErrorToast('Analytics Error', 'Failed to compute personal records.');
      }
    }

    // Compute new PBs for this session (only for strength exercises)
    const newPBs: { exerciseId: string; name: string; metric: '1RM'; value: number }[] = [];
    selectedPlan.exercises.forEach(ex => {
      // Only calculate PBs for strength exercises
      if (ex.type !== 'cardio' && ex.type !== 'duration') {
        const logs = logsForSession.filter(l => l.exerciseId === ex.id);
        const bestThisSession = computeBest1RMFromLogs(logs);
        const prevBest = prevBestMap[ex.id] || 0;
        if (bestThisSession > prevBest && bestThisSession > 0) {
          newPBs.push({
            exerciseId: ex.id,
            name: ex.name,
            metric: '1RM',
            value: Math.round(bestThisSession * 10) / 10,
          });
        }
      }
    });

    // Rest stats for this session
    const restForSession = restEvents.filter(ev => ev.planId === selectedPlan.id && ev.date === dateStr);
    const restCount = restForSession.length;
    const restTotalSec = restForSession.reduce((sum, ev) => sum + (ev.durationSec || 0), 0);
    const restAvgSec = restCount ? Math.round(restTotalSec / restCount) : 0;

    // Check if a session already exists for this date and plan
    const existingSessions = await dataStore.getWorkoutSessions();
    const existingSessionIndex = existingSessions.findIndex(
      s => s.date === dateStr && s.planId === selectedPlan.id
    );

    const session: WorkoutSession = {
      id: existingSessionIndex !== -1
        ? existingSessions[existingSessionIndex].id  // Use existing ID if updating
        : `${dateStr}_${selectedPlan.id}_${endedAt}`,
      date: dateStr,
      planId: selectedPlan.id,
      planName: selectedPlan.name,
      color: selectedPlan.color,
      startedAt: existingSessionIndex !== -1
        ? existingSessions[existingSessionIndex].startedAt  // Keep original start time if updating
        : startedAt,
      endedAt,
      durationSec,
      exercises: exercisesSnapshot,
      completionPercent,
      totalSets,
      restCount,
      restAvgSec,
      setLogs: logsForSession,
      newPBs: existingSessionIndex !== -1
        ? [...(existingSessions[existingSessionIndex].newPBs || []), ...newPBs]  // Combine PBs if updating
        : newPBs,
    };

    try {
      let updatedSessions: WorkoutSession[];
      if (existingSessionIndex !== -1) {
        // Update existing session
        updatedSessions = [...existingSessions];
        updatedSessions[existingSessionIndex] = session;
      } else {
        // Add new session
        updatedSessions = [...existingSessions, session];
      }

      await dataStore.setWorkoutSessions(updatedSessions);
    } catch (e) {
      console.error('Error saving workout session:', e);
      showErrorToast('Save Error', 'Failed to save workout session.');
    } finally {
      setCurrentSessionStart(null);
      setSessionInProgress(false); // Reset session in progress flag
      setShowPlanModal(false);
      setRestEvents([]);

      // Enhanced haptic feedback for workout completion
      if (Platform.OS !== 'web') {
        // Success notification with stronger vibration
        if (Haptics?.NotificationFeedbackType?.Success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        // Additional haptic for workout completion
        if (Haptics?.ImpactFeedbackStyle?.Heavy) {
          setTimeout(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          }, 300); // Delay to create a sequence effect
        }
      }

      // Show celebration for completed workout
      setCelebrationTitle('Workout Complete!');
      setCelebrationSubtitle(`Great job completing your ${selectedPlan?.name} workout!`);
      setShowCelebration(true);

      // Hide celebration after 3 seconds
      setTimeout(() => {
        setShowCelebration(false);
      }, 3000);

      playSound('success');
    }
  };

  const setExerciseSetCount = (planId: string, exerciseId: string, count: number, targetSets: number) => {
    const dateStr = getDateString(selectedDate);
    setExerciseSetCounts((prev) => {
      const idx = prev.findIndex((es) => es.planId === planId && es.exerciseId === exerciseId && es.date === dateStr);
      const next = [...prev];
      if (idx >= 0) {
        next[idx] = { ...next[idx], count };
      } else {
        next.push({ planId, exerciseId, date: dateStr, count });
      }
      return next;
    });

    // Auto-sync completion based on set count
    const done = count >= targetSets && targetSets > 0;
    const alreadyCompleted = isExerciseCompleted(planId, exerciseId, selectedDate);
    if (done && !alreadyCompleted) {
      setCompletedExercises((prev) => [...prev, { planId, exerciseId, date: dateStr }]);
      // Play sound when exercise is completed
      if (Platform.OS !== 'web') {
        playSound('complete');
      }
    } else if (!done && alreadyCompleted) {
      setCompletedExercises((prev) =>
        prev.filter((ce) => !(ce.planId === planId && ce.exerciseId === exerciseId && ce.date === dateStr))
      );
    }

    if (Platform.OS !== 'web' && typeof Haptics.selectionAsync === 'function') {
      Haptics.selectionAsync();
    }
  };

  const incrementSetCount = (planId: string, exerciseId: string, targetSets: number) => {
    const current = getExerciseSetCount(planId, exerciseId);
    const next = Math.min(current + 1, targetSets);
    setExerciseSetCount(planId, exerciseId, next, targetSets);
    // Start a rest timer after completing a set (configurable)
    if (autoRestOnIncrement) {
      startRestTimer(planId, exerciseId, restDefaultSec);
    }

    // Enhanced haptic feedback for set increment
    if (Platform.OS !== 'web') {
      // Light impact for set increment
      if (Haptics?.ImpactFeedbackStyle?.Light) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const decrementSetCount = (planId: string, exerciseId: string, targetSets: number) => {
    const current = getExerciseSetCount(planId, exerciseId);
    const next = Math.max(current - 1, 0);
    setExerciseSetCount(planId, exerciseId, next, targetSets);

    // Enhanced haptic feedback for set decrement
    if (Platform.OS !== 'web') {
      // Light impact for set decrement
      if (Haptics?.ImpactFeedbackStyle?.Light) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const getCompletionPercentage = (plan: WorkoutPlan, date?: Date) => {
    const dateStr = date ? getDateString(date) : getDateString(selectedDate);
    const total = plan.exercises.length;
    if (total === 0) return 0;

    const completedCount = plan.exercises.filter(ex => {
      // For duration/cardio exercises, check if duration was logged
      if (ex.type === 'cardio' || ex.type === 'duration') {
        const logs = getExerciseLogs(plan.id, ex.id, date);
        return logs.length > 0;
      } else {
        // For strength exercises, check if marked as completed
        return completedExercises.some(ce =>
          ce.planId === plan.id && ce.exerciseId === ex.id && ce.date === dateStr
        );
      }
    }).length;

    return Math.round((completedCount / total) * 100);
  };

  // Superset/Circuit Functions
  const toggleExerciseForGrouping = (exerciseId: string) => {
    setSelectedExercisesForGroup(prev => {
      if (prev.includes(exerciseId)) {
        return prev.filter(id => id !== exerciseId);
      } else {
        return [...prev, exerciseId];
      }
    });
  };

  const createExerciseGroup = () => {
    if (selectedExercisesForGroup.length < 2) {
      Alert.alert('Not Enough Exercises', 'Please select at least 2 exercises to create a group.');
      return;
    }

    const groupId = `group_${Date.now()}`;
    setExerciseGroups(prev => ({
      ...prev,
      [groupId]: [...selectedExercisesForGroup]
    }));

    // Clear selection
    setSelectedExercisesForGroup([]);

    // Provide feedback
    if (Platform.OS !== 'web' && Haptics?.NotificationFeedbackType?.Success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    showSuccessToast('Group Created', `Superset with ${selectedExercisesForGroup.length} exercises created!`);
  };

  const removeExerciseGroup = (groupId: string) => {
    setExerciseGroups(prev => {
      const newGroups = { ...prev };
      delete newGroups[groupId];
      return newGroups;
    });
  };


  const handleDayPress = (date: Date) => {
    setSelectedDate(date);
    if (Platform.OS !== 'web' && Haptics?.ImpactFeedbackStyle?.Light) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleExitWorkout = () => {
    // Simply exit without saving or showing a popup
    // Keep session data for analytics purposes
    setShowPlanModal(false);
  };

  const handlePlanPress = (plan: WorkoutPlan) => {
    setSelectedPlan(plan);
    // mark session start when opening the plan modal
    setCurrentSessionStart(Date.now());
    setSessionInProgress(true); // Mark that a session is in progress
    setShowPlanModal(true);
  };

  const handleExercisePress = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setShowExerciseDetail(true);
  };

  const handleAssignWorkout = () => {
    setShowWorkoutSelector(true);
  };

  const handleWorkoutSelection = (planId: string | null) => {
    assignWorkoutToDate(selectedDate, planId);
    if (Platform.OS !== 'web' && Haptics?.NotificationFeedbackType?.Success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const duplicateWorkout = (plan: WorkoutPlan) => {
    const newPlan = {
      ...plan,
      id: `duplicate_${plan.id}_${Date.now()}`, // Unique ID for the duplicate
      name: `${plan.name} (Copy)`, // Add "Copy" to distinguish it
      isCustom: true, // Mark as custom since it's a user-created duplicate
    };

    // Add to custom workout plans
    setCustomWorkoutPlans(prev => [...prev, newPlan as WorkoutPlan]);

    // Save to storage
    dataStore.setCustomWorkoutPlans([...customWorkoutPlans, newPlan]).catch(error => {
      console.error('Error saving duplicated workout:', error);
      showErrorToast('Save Error', 'Failed to save duplicated workout.');
    });

    // Provide feedback
    if (Platform.OS !== 'web' && Haptics?.NotificationFeedbackType?.Success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    showSuccessToast('Workout Duplicated', `${plan.name} has been duplicated successfully.`);
  };

  const AnimatedCheckbox = ({ checked, onPress }: { checked: boolean; onPress: () => void }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      if (checked) {
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [checked]);

    return (
      <TouchableOpacity
        onPress={() => {
          if (Platform.OS !== 'web' && Haptics?.ImpactFeedbackStyle?.Light) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          onPress();
        }}
        style={styles.checkboxContainer}
      >
        <Animated.View
          style={[
            styles.checkbox,
            checked && styles.checkboxChecked,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >
          {checked && (
            <IconSymbol name="checkmark" size={18} color={colors.card} />
          )}
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const ProgressRing = ({ percentage, size = 60, strokeWidth = 6, color = colors.primary }: { 
    percentage: number; 
    size?: number; 
    strokeWidth?: number;
    color?: string;
  }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = circumference - (percentage / 100) * circumference;

    return (
      <View style={[styles.progressRing, { width: size, height: size }]}>
        <View style={styles.progressRingBackground}>
          <View 
            style={[
              styles.progressRingCircle, 
              { 
                width: size, 
                height: size, 
                borderRadius: size / 2,
                borderWidth: strokeWidth,
                borderColor: colors.background,
              }
            ]} 
          />
        </View>
        <View style={styles.progressRingForeground}>
          <View 
            style={[
              styles.progressRingCircle, 
              { 
                width: size, 
                height: size, 
                borderRadius: size / 2,
                borderWidth: strokeWidth,
                borderColor: color,
                borderTopColor: percentage < 25 ? colors.background : color,
                borderRightColor: percentage < 50 ? colors.background : color,
                borderBottomColor: percentage < 75 ? colors.background : color,
                borderLeftColor: percentage < 100 ? (percentage < 25 ? colors.background : color) : color,
                transform: [{ rotate: '-45deg' }],
              }
            ]} 
          />
        </View>
        <View style={styles.progressRingText}>
          <AnimatedProgressText value={percentage} size={size / 3} />
        </View>
      </View>
    );
  };

  const selectedWorkout = getWorkoutForDate(selectedDate);
  const allWorkoutPlans = getAllWorkoutPlans();

  return (
    <>
      {Platform.OS === 'ios' && (
        <Stack.Screen
          options={{
            title: "Workout",
          }}
        />
      )}
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              Platform.OS !== 'ios' && styles.scrollContentWithTabBar
            ]}
            showsVerticalScrollIndicator={false}
          >
          <View style={styles.header}>
            <Text style={styles.title}>Weekly Workout Plan</Text>
            <Text style={styles.subtitle}>Select a day and assign your workout</Text>
          </View>

          {/* Onboarding helper for new users */}
          {showWorkoutOnboarding && (
            <View
              style={styles.onboardCard}
              accessible
              accessibilityRole="summary"
              accessibilityLabel="Quick start guide"
              accessibilityHint="Follow the steps to get started, then press Got it to hide this card"
            >
              <View style={styles.onboardHeader}>
                <IconSymbol name="hand.point.up.left.fill" size={18} color={colors.primary} />
                <Text style={styles.onboardTitle}>Quick Start</Text>
              </View>
              <View style={styles.onboardSteps}>
                <Text style={styles.onboardStep}>1. Pilih hari, lalu tekan tombol pensil untuk assign workout.</Text>
                <Text style={styles.onboardStep}>2. Buka workout-nya, tap + untuk catat set. Tombol set jadi timer istirahat.</Text>
                <Text style={styles.onboardStep}>3. Tekan lama timer untuk batalin kalau salah.</Text>
                <Text style={styles.onboardStep}>4. Atur durasi istirahat dari chip angka di atas daftar.</Text>
                <Text style={styles.onboardStep}>5. Cek Goals untuk target mingguan & reminder.</Text>
              </View>
              <View style={styles.onboardActions}>
                {!selectedWorkout ? (
                  <TouchableOpacity
                    style={[styles.onboardBtnPrimary, { backgroundColor: colors.primary }]}
                    onPress={handleAssignWorkout}
                    accessibilityLabel="Assign a workout to this day"
                    accessibilityHint="Opens workout list so you can pick one"
                  >
                    <IconSymbol name="plus.circle.fill" size={18} color={colors.card} />
                    <Text style={styles.onboardBtnPrimaryText}>Assign Workout</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={styles.onboardBtn}
                  onPress={async () => {
                    setShowWorkoutOnboarding(false);
                    try { await AsyncStorage.setItem('onb_workout_seen_v1', 'true'); } catch {}
                  }}
                  accessibilityLabel="Dismiss quick start"
                >
                  <Text style={styles.onboardBtnText}>Got it</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Week Day Tabs */}
          <View style={styles.weekContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.weekScrollContent}
            >
              {weekDates.map((date, index) => {
                const isSelected = isSameDay(date, selectedDate);
                const isTodayDate = isToday(date);
                const workout = getWorkoutForDate(date);

                return (
                  <TouchableOpacity
                    key={getDateString(date)}
                    style={[
                      styles.dayTab,
                      isSelected && styles.dayTabSelected,
                      isTodayDate && !isSelected && styles.dayTabToday,
                    ]}
                    onPress={() => handleDayPress(date)}
                  >
                    <Text style={[
                      styles.dayName,
                      isSelected && styles.dayNameSelected,
                      isTodayDate && !isSelected && styles.dayNameToday,
                    ]}>
                      {DAYS_OF_WEEK[date.getDay()]}
                    </Text>
                    <Text style={[
                      styles.dayDate,
                      isSelected && styles.dayDateSelected,
                      isTodayDate && !isSelected && styles.dayDateToday,
                    ]}>
                      {date.getDate()}
                    </Text>
                    {workout ? (
                      <View style={[styles.dayIndicator, { backgroundColor: (workout.color || colors.primary) }]} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Selected Day Info with Prominent Button */}
          <View style={styles.selectedDayInfo}>
            <View style={styles.selectedDayHeader}>
              <View style={styles.selectedDayTextContainer}>
                <Text style={styles.selectedDayTitle}>
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
                {selectedWorkout && (
                  <Text style={styles.selectedDaySubtitle}>
                    {selectedWorkout.name} - {selectedWorkout.subtitle}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.assignButtonLarge}
                onPress={handleAssignWorkout}
                accessible
                accessibilityLabel={selectedWorkout ? "Edit assigned workout" : "Assign a workout"}
                accessibilityHint={selectedWorkout ? "Edits the workout for this day" : "Opens the workout list to assign"}
              >
                <IconSymbol
                  name={selectedWorkout ? "pencil" : "plus"}
                  size={24}
                  color={colors.card}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Workout for Selected Day */}
          {selectedWorkout ? (
            <View style={styles.workoutSection}>
              <TouchableOpacity
                style={[styles.workoutCard, { borderLeftColor: selectedWorkout.color }]}
                onPress={() => handlePlanPress(selectedWorkout)}
                activeOpacity={0.8}
              >
                <View style={styles.workoutCardHeader}>
                  <View style={[styles.workoutIconContainer, { backgroundColor: selectedWorkout.color + '20' }]}>
                    <IconSymbol name={selectedWorkout.icon as any} size={32} color={selectedWorkout.color} />
                  </View>
                  <View style={styles.workoutInfo}>
                    <Text style={styles.workoutName}>{selectedWorkout.name}</Text>
                    <Text style={styles.workoutSubtitle}>{selectedWorkout.subtitle}</Text>
                    <Text style={styles.workoutExerciseCount}>
                      {selectedWorkout.exercises.length} exercises
                    </Text>
                  </View>
                  <ProgressRing
                    percentage={getCompletionPercentage(selectedWorkout)}
                    size={60}
                    color={selectedWorkout.color}
                  />
                </View>

                {getCompletionPercentage(selectedWorkout) > 0 && (
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${getCompletionPercentage(selectedWorkout)}%`,
                          backgroundColor: selectedWorkout.color
                        }
                      ]}
                    />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIconContainer}>
                <IconSymbol name="figure.strengthtraining.traditional" size={64} color={colors.primary} />
              </View>
              <Text style={styles.emptyStateTitle}>Ready to Train?</Text>
              <Text style={styles.emptyStateText}>
                No workout assigned for this day yet. Choose a workout to get started!
              </Text>
              <TouchableOpacity
                style={[styles.emptyAssignBtn, { backgroundColor: colors.primary }]}
                onPress={handleAssignWorkout}
                accessible
                accessibilityLabel="Assign workout for this day"
                accessibilityHint="Opens the workout list"
              >
                <IconSymbol name="plus.circle.fill" size={18} color={colors.card} />
                <Text style={styles.emptyAssignText}>Assign Workout</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* All Available Workouts */}
          <View style={styles.allWorkoutsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Available Workouts</Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => router.push('/create-workout')}
              >
                <IconSymbol name="plus.circle.fill" size={24} color={colors.primary} />
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
            {allWorkoutPlans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={styles.planCard}
                onPress={() => handlePlanPress(plan)}
              >
                <View style={styles.planCardContent}>
                  <View style={[styles.planIconSmall, { backgroundColor: plan.color + '20' }]}>
                    <IconSymbol name={plan.icon as any} size={24} color={plan.color} />
                  </View>
                  <View style={styles.planInfoSmall}>
                    <View style={styles.planNameRow}>
                      <Text style={styles.planNameSmall}>{plan.name}</Text>
                      {plan.isCustom && (
                        <View style={styles.customBadge}>
                          <Text style={styles.customBadgeText}>Custom</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.planSubtitleSmall}>{plan.subtitle}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {plan.isCustom && (
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert('Delete Workout', 'Remove this workout plan?', [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: () => {
                                deleteWorkoutPlan(plan.id);
                                showSuccessToast('Deleting', 'Workout plan will be removed.');
                              }
                            },
                          ]);
                        }}
                        style={{ padding: 8 }}
                      >
                        <IconSymbol name="trash.fill" size={20} color="#ef5350" />
                      </TouchableOpacity>
                    )}
                    <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quick Stats Summary */}
          <View style={styles.quickStatsSection}>
            <Text style={styles.sectionTitle}>Today's Summary</Text>
            <View style={styles.quickStatsGrid}>
              <View style={styles.quickStatCard}>
                <IconSymbol name="figure.run" size={28} color={colors.primary} />
                <Text style={styles.quickStatValue}>{workoutAssignments.filter(a => a.date === getDateString(new Date()) && a.planId !== null).length}</Text>
                <Text style={styles.quickStatLabel}>Workouts</Text>
              </View>
              <View style={styles.quickStatCard}>
                <IconSymbol name="checkmark.circle.fill" size={28} color={colors.primary} />
                <Text style={styles.quickStatValue}>{completedExercises.filter(ce => ce.date === getDateString(new Date())).length}</Text>
                <Text style={styles.quickStatLabel}>Exercises</Text>
              </View>
              <View style={styles.quickStatCard}>
                <IconSymbol name="flame.fill" size={28} color={colors.primary} />
                <Text style={styles.quickStatValue}>{customWorkoutPlans.length}</Text>
                <Text style={styles.quickStatLabel}>Custom Plans</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </View>

    {/* Workout Plan Modal */}
    <Modal
      visible={showPlanModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowPlanModal(false)}
    >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{selectedPlan?.name}</Text>
                  <Text style={styles.modalSubtitle}>{selectedPlan?.subtitle}</Text>
                </View>
                <View style={styles.modalActions}>
                  {selectedExercisesForGroup.length > 0 && (
                    <TouchableOpacity style={styles.groupButton} onPress={createExerciseGroup}>
                      <IconSymbol name="figure.superset" size={20} color={colors.card} />
                      <Text style={styles.groupButtonText}>Group ({selectedExercisesForGroup.length})</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={handleExitWorkout}>
                    <IconSymbol name="xmark.circle.fill" size={32} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              {selectedPlan && (
                <View style={styles.modalProgressSection}>
                  <Text style={styles.modalProgressText}>
                    {selectedPlan.exercises.filter(ex => isExerciseCompleted(selectedPlan.id, ex.id)).length} of {selectedPlan.exercises.length} completed
                  </Text>
                  <View style={styles.progressBarLarge}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${getCompletionPercentage(selectedPlan)}%`,
                          backgroundColor: selectedPlan.color
                        }
                      ]}
                    />
                  </View>
                </View>
              )}

              <View style={styles.restPresetContainer}>
                <Text style={styles.restPresetLabel}>Rest between sets</Text>
                <View style={styles.restPresetChipsRow}>
                  {REST_PRESET_OPTIONS.map((sec) => (
                    <TouchableOpacity
                      key={sec}
                      style={[styles.restPresetChip, restDefaultSec === sec && styles.restPresetChipActive]}
                      onPress={() => setRestDefaultSec(sec)}
                    >
                      <Text style={[styles.restPresetChipText, restDefaultSec === sec && styles.restPresetChipTextActive]}>{sec}s</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Custom rest time input */}
                <View style={styles.customRestContainer}>
                  <Text style={styles.customRestLabel}>Custom (seconds):</Text>
                  <View style={styles.customRestInputContainer}>
                    <TextInput
                      style={styles.customRestInput}
                      value={customRestSec.toString()}
                      onChangeText={(text) => {
                        const num = parseInt(text);
                        if (!isNaN(num) && num > 0) {
                          setCustomRestSec(num);
                          // Save the custom rest time preference
                          AsyncStorage.setItem('customRestTime', num.toString()).catch(() => {});
                        }
                      }}
                      keyboardType="numeric"
                      placeholder="Enter seconds"
                    />
                    <TouchableOpacity
                      style={[styles.restPresetChip, restDefaultSec === customRestSec && styles.restPresetChipActive]}
                      onPress={() => {
                        setRestDefaultSec(customRestSec);
                        // Also save as user preference
                        AsyncStorage.setItem('customRestTime', customRestSec.toString()).catch(() => {});
                      }}
                    >
                      <Text style={[styles.restPresetChipText, restDefaultSec === customRestSec && styles.restPresetChipTextActive]}>Set</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <ScrollView
                style={styles.exerciseList}
                showsVerticalScrollIndicator={false}
              >
                {selectedPlan ? selectedPlan.exercises.map((exercise) => {
                  const planId = selectedPlan.id;
                  const targetSets = parseTargetSets(exercise.sets);
                  const setCount = getExerciseSetCount(planId, exercise.id);
                  const isCompleted = isExerciseCompleted(planId, exercise.id);
                  const remainingRest = getRemainingRestSec(planId, exercise.id);
                  const logs = getExerciseLogs(planId, exercise.id);
                  const isSelectedForGrouping = selectedExercisesForGroup.includes(exercise.id);

                  return (
                    <View key={exercise.id} style={styles.exerciseItem}>
                      <TouchableOpacity
                        style={styles.groupSelectCheckbox}
                        onPress={() => toggleExerciseForGrouping(exercise.id)}
                      >
                        {isSelectedForGrouping && (
                          <IconSymbol name="checkmark.circle.fill" size={20} color={colors.primary} />
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.exerciseItemContent}
                        onPress={() => {
                          if (Platform.OS !== 'web' && Haptics?.ImpactFeedbackStyle?.Medium) {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          }
                          handleExercisePress(exercise);
                        }}
                      >
                        <View style={styles.exerciseItemLeft}>
                          <Text style={[styles.exerciseItemName, isCompleted && styles.exerciseItemNameCompleted, isSelectedForGrouping && styles.exerciseItemSelected]} numberOfLines={2} ellipsizeMode="tail">
                            {exercise.name}
                          </Text>
                          <View style={styles.exerciseDetailsRow}>
                            <Text style={styles.exerciseItemDetails} numberOfLines={1} ellipsizeMode="tail">
                              {exercise.type === 'strength'
                                ? `${targetSets} sets × ${exercise.reps || '0'} reps`
                                : `${exercise.hours || '0'}h ${exercise.minutes || '0'}m ${exercise.seconds || '0'}s`}
                            </Text>
                            <View style={[styles.exerciseTypeBadge, styles[`exerciseType${exercise.type || 'strength'}`]]}>
                              <Text style={styles.exerciseTypeText}>
                                {exercise.type === 'cardio' ? 'Cardio' :
                                 exercise.type === 'duration' ? 'Duration' : 'Strength'}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.exerciseItemRight}>
                          {exercise.type === 'strength' ? (
                            <>
                              <TouchableOpacity
                                onPress={() => {
                                  if (Platform.OS !== 'web' && Haptics?.ImpactFeedbackStyle?.Light) {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  }
                                  decrementSetCount(planId, exercise.id, targetSets);
                                }}
                                style={{ padding: 8 }}
                              >
                                <IconSymbol name="minus.circle.fill" size={22} color={colors.textSecondary} />
                              </TouchableOpacity>
                              <Text style={{ minWidth: 48, textAlign: 'center', color: colors.text, fontWeight: '600' }}>
                                {setCount}/{targetSets}
                              </Text>
                              <TouchableOpacity
                                onPress={() => {
                                  if (Platform.OS !== 'web' && Haptics?.ImpactFeedbackStyle?.Light) {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  }
                                  incrementSetCount(planId, exercise.id, targetSets);
                                }}
                                style={{ padding: 8 }}
                              >
                                <IconSymbol name="plus.circle.fill" size={22} color={colors.primary} />
                              </TouchableOpacity>
                            </>
                          ) : (
                            <View style={styles.cardioDurationContainer}>
                              <Text style={styles.cardioDurationText}>
                                {exercise.hours || '0'}h {exercise.minutes || '0'}m {exercise.seconds || '0'}s
                              </Text>
                            </View>
                          )}

                          {remainingRest > 0 ? (
                            <Pressable
                              style={[styles.activeRestChip, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                              onLongPress={() => {
                                cancelRestTimer(planId, exercise.id);
                                if (Platform.OS !== 'web' && Haptics?.NotificationFeedbackType?.Warning) {
                                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                }
                              }}
                              delayLongPress={300}
                            >
                              <IconSymbol name="timer" size={12} color={colors.primary} />
                              <Text style={[styles.restChipText, { color: colors.primary }]}>{formatSeconds(remainingRest)}</Text>
                            </Pressable>
                          ) : (
                            <TouchableOpacity
                              style={[
                                styles.restChip,
                                (isExerciseCompleted(planId, exercise.id) || getRemainingRestSec(planId, exercise.id) > 0) && { opacity: 0.5 } // Dim when exercise is completed or rest timer is active
                              ]}
                              onPress={() => {
                                // Only start rest timer if exercise is not completed and no rest timer is active
                                if (!isExerciseCompleted(planId, exercise.id) && getRemainingRestSec(planId, exercise.id) <= 0) {
                                  // Provide haptic feedback
                                  if (Platform.OS !== 'web' && Haptics?.ImpactFeedbackStyle?.Light) {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  }

                                  startRestTimer(planId, exercise.id, restDefaultSec);
                                }
                              }}
                              disabled={isExerciseCompleted(planId, exercise.id) || getRemainingRestSec(planId, exercise.id) > 0}
                            >
                              <IconSymbol name="timer" size={12} color={colors.text} />
                              <Text style={styles.restChipText}>Rest</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </TouchableOpacity>
                      {/* Inline logging inputs */}
                      <View style={styles.logInputContainer}>
                        <TouchableOpacity
                          style={[
                            styles.logButton,
                            (isExerciseCompleted(planId, exercise.id) || getRemainingRestSec(planId, exercise.id) > 0) && { opacity: 0.5 }
                          ]}
                          onPress={() => {
                            if (Platform.OS !== 'web' && Haptics?.ImpactFeedbackStyle?.Light) {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }

                            // For strength exercises, log a set
                            // For cardio/duration exercises, log the activity
                            onLogSet(planId, exercise.id, targetSets, parseDefaultReps(exercise.reps));
                          }}
                          disabled={isExerciseCompleted(planId, exercise.id) || getRemainingRestSec(planId, exercise.id) > 0}
                        >
                          <IconSymbol name="square.and.pencil" size={18} color={colors.card} />
                        </TouchableOpacity>

                        {/* Show weight for strength exercises */}
                        {exercise.type === 'strength' && (
                          <View style={styles.exerciseWeightContainer}>
                            <Text style={styles.exerciseWeightText}>0kg</Text>
                          </View>
                        )}

                        {/* Show duration for cardio/duration exercises */}
                        {(exercise.type === 'cardio' || exercise.type === 'duration') && (
                          <View style={styles.cardioDurationContainer}>
                            <Text style={styles.cardioDurationText}>
                              {exercise.hours || '0'}h {exercise.minutes || '0'}m {exercise.seconds || '0'}s
                            </Text>
                          </View>
                        )}
                      </View>

                    </View>
                  );
                }) : null}
              </ScrollView>

              <TouchableOpacity 
                style={[styles.completeButton, { backgroundColor: selectedPlan?.color || colors.primary }]}
                onPress={finishCurrentSession}
              >
                <IconSymbol name="checkmark.circle.fill" size={24} color={colors.card} />
                <Text style={styles.completeButtonText}>Finish Workout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Exercise Detail Modal */}
        <Modal
          visible={showExerciseDetail}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowExerciseDetail(false)}
        >
          <View style={styles.detailModalOverlay}>
            <Pressable 
              style={styles.detailModalBackdrop}
              onPress={() => setShowExerciseDetail(false)}
            />
            <View style={styles.detailModalContent}>
              <View style={styles.detailModalHeader}>
                <Text style={styles.detailModalTitle}>{selectedExercise?.name}</Text>
                <TouchableOpacity onPress={() => setShowExerciseDetail(false)}>
                  <IconSymbol name="xmark.circle.fill" size={28} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.detailSection}>
                <View style={styles.detailRow}>
                  <IconSymbol name="number" size={20} color={colors.primary} />
                  <Text style={styles.detailLabel}>Sets:</Text>
                  <Text style={styles.detailValue}>{selectedExercise?.sets}</Text>
                </View>
                {/* Exercise Type */}
                <View style={styles.detailRow}>
                  <IconSymbol name="figure.run" size={20} color={colors.primary} />
                  <Text style={styles.detailLabel}>Type:</Text>
                  <Text style={styles.detailValue}>
                    {selectedExercise?.type === 'cardio' ? 'Cardio' :
                     selectedExercise?.type === 'duration' ? 'Duration' : 'Strength'}
                  </Text>
                </View>

                {selectedExercise?.type === 'strength' && (
                  <>
                    {selectedExercise?.sets && (
                      <View style={styles.detailRow}>
                        <IconSymbol name="number" size={20} color={colors.primary} />
                        <Text style={styles.detailLabel}>Sets:</Text>
                        <Text style={styles.detailValue}>{selectedExercise.sets}</Text>
                      </View>
                    )}
                    {selectedExercise?.reps && (
                      <View style={styles.detailRow}>
                        <IconSymbol name="repeat" size={20} color={colors.secondary} />
                        <Text style={styles.detailLabel}>Reps:</Text>
                        <Text style={styles.detailValue}>{selectedExercise.reps}</Text>
                      </View>
                    )}
                  </>
                )}
                {(selectedExercise?.type === 'cardio' || selectedExercise?.type === 'duration') && (
                  <>
                    <View style={styles.detailRow}>
                      <IconSymbol name="clock.fill" size={20} color={colors.accent} />
                      <Text style={styles.detailLabel}>Hours:</Text>
                      <Text style={styles.detailValue}>{selectedExercise.hours || '0'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <IconSymbol name="clock.fill" size={20} color={colors.accent} />
                      <Text style={styles.detailLabel}>Minutes:</Text>
                      <Text style={styles.detailValue}>{selectedExercise.minutes || '0'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <IconSymbol name="clock.fill" size={20} color={colors.accent} />
                      <Text style={styles.detailLabel}>Seconds:</Text>
                      <Text style={styles.detailValue}>{selectedExercise.seconds || '0'}</Text>
                    </View>
                  </>
                )}

                {/* Previous workout data */}
                {selectedExercise && selectedPlan && (() => {
                  // Get all past sessions for this plan/exercise
                  const previousLogs = setLogs
                    .filter(log => log.planId === selectedPlan.id && log.exerciseId === selectedExercise.id)
                    .sort((a, b) => b.date.localeCompare(a.date)); // Sort by date descending

                  if (previousLogs.length === 0) {
                    return null; // Don't render anything if no previous data
                  }

                  // Get the most recent log
                  const latestLog = previousLogs[0];

                  return (
                    <View style={styles.previousDataSection}>
                      <Text style={styles.previousDataTitle}>Previous Data</Text>
                      <View style={styles.previousDataRow}>
                        <Text style={styles.previousDataText}>
                          Last: {latestLog.weight}kg × {latestLog.reps} reps
                        </Text>
                        <Text style={styles.previousDataDate}>
                          on {new Date(latestLog.date).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  );
                })()}
              </View>

              <View style={styles.detailTips}>
                <Text style={styles.detailTipsTitle}>Tips</Text>
                <Text style={styles.detailTipsText}>
                  - Maintain proper form throughout the exercise{'\n'}
                  - Control your breathing{'\n'}
                  - Rest 60-90 seconds between sets{'\n'}
                  - Stay hydrated
                </Text>
              </View>

              <TouchableOpacity 
                style={styles.detailCloseButton}
                onPress={() => setShowExerciseDetail(false)}
              >
                <Text style={styles.detailCloseButtonText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Workout Selector Modal */}
        <Modal
          visible={showWorkoutSelector}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowWorkoutSelector(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.selectorModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Workout</Text>
                <TouchableOpacity onPress={() => setShowWorkoutSelector(false)}>
                  <IconSymbol name="xmark.circle.fill" size={32} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {allWorkoutPlans.map((plan) => (
                  <TouchableOpacity
                    key={plan.id}
                    style={styles.selectorItem}
                    onPress={() => {
                      handleWorkoutSelection(plan.id);
                      // Immediately start the workout if one was selected
                      if (plan.id) {
                        const selectedPlan = allWorkoutPlans.find(p => p.id === plan.id);
                        if (selectedPlan) {
                          setSelectedPlan(selectedPlan);
                          setCurrentSessionStart(Date.now());
                          setSessionInProgress(true);
                          setShowPlanModal(true);
                        }
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.selectorIcon, { backgroundColor: plan.color + '20' }]}>
                      <IconSymbol name={plan.icon as any} size={28} color={plan.color} />
                    </View>
                    <View style={styles.selectorInfo}>
                      <View style={styles.selectorNameRow}>
                        <Text style={styles.selectorName}>{plan.name}</Text>
                        {plan.isCustom && (
                          <View style={styles.customBadgeSmall}>
                            <Text style={styles.customBadgeTextSmall}>Custom</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.selectorSubtitle}>{plan.subtitle}</Text>
                      <Text style={styles.selectorCount}>{plan.exercises.length} exercises</Text>
                    </View>
                    <View style={styles.selectorActions}>
                      <TouchableOpacity
                        style={styles.duplicateButton}
                        onPress={(e) => {
                          e.stopPropagation(); // Prevent triggering the parent onPress
                          duplicateWorkout(plan);
                        }}
                      >
                        <IconSymbol name="doc.on.doc" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <IconSymbol name="chevron.right" size={24} color={colors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                ))}

                {selectedWorkout && (
                  <TouchableOpacity
                    style={[styles.selectorItem, styles.removeItem]}
                    onPress={() => {
                      handleWorkoutSelection(null);
                      // Close the selector after removing
                      setShowWorkoutSelector(false);
                    }}
                  >
                    <View style={[styles.selectorIcon, { backgroundColor: '#ff525220' }]}>
                      <IconSymbol name="trash.fill" size={28} color="#ff5252" />
                    </View>
                    <View style={styles.selectorInfo}>
                      <Text style={[styles.selectorName, { color: '#ff5252' }]}>Remove Workout</Text>
                      <Text style={styles.selectorSubtitle}>Clear this day&apos;s assignment</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Simple Celebration Message */}
        {showCelebration && (
          <View style={styles.celebrationMessage}>
            <IconSymbol name="trophy.fill" size={24} color={colors.accent} />
            <Text style={styles.celebrationText}>{celebrationTitle}</Text>
          </View>
        )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  scrollContentWithTabBar: {
    paddingBottom: 100,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  weekContainer: {
    marginBottom: 20,
  },
  weekScrollContent: {
    paddingRight: 16,
  },
  dayTab: {
    width: 70,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  dayTabSelected: {
    backgroundColor: colors.primary,
  },
  dayTabToday: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dayName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dayNameSelected: {
    color: colors.card,
  },
  dayNameToday: {
    color: colors.primary,
  },
  dayDate: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  dayDateSelected: {
    color: colors.card,
  },
  dayDateToday: {
    color: colors.primary,
  },
  dayIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  selectedDayInfo: {
    backgroundColor: colors.card,
    borderRadius: 16, // Increased border radius for consistency
    padding: 16,
    marginBottom: 20,
    // Enhanced shadow for better depth perception
    boxShadow: '0px 6px 20px rgba(0, 0, 0, 0.12), 0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 5,
  },
  selectedDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedDayTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  selectedDayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  selectedDaySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  assignButtonLarge: {
    backgroundColor: colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 4px 12px rgba(100, 181, 246, 0.3)',
    elevation: 4,
  },
  workoutSection: {
    marginBottom: 24,
  },
  workoutCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    // Enhanced shadow for better depth perception
    boxShadow: '0px 6px 20px rgba(0, 0, 0, 0.12), 0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 5,
  },
  workoutCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  workoutSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  workoutExerciseCount: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + '15', // Light tint of primary color
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  emptyStateTip: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
    marginTop: 12,
  },
  allWorkoutsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 4,
  },
  planCard: {
    backgroundColor: colors.card,
    borderRadius: 16, // Increased border radius for consistency
    padding: 16,
    marginBottom: 12,
    // Enhanced shadow for better depth perception
    boxShadow: '0px 6px 20px rgba(0, 0, 0, 0.1), 0px 2px 6px rgba(0, 0, 0, 0.06)',
    elevation: 4,
  },
  planCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planIconSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planInfoSmall: {
    flex: 1,
  },
  planNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  planNameSmall: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginRight: 8,
  },
  planSubtitleSmall: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  customBadge: {
    backgroundColor: colors.accent + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  customBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
  },
  progressRing: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRingBackground: {
    position: 'absolute',
  },
  progressRingForeground: {
    position: 'absolute',
  },
  progressRingCircle: {
    borderStyle: 'solid',
  },
  progressRingText: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercentage: {
    fontWeight: '700',
    color: colors.text,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.background,
    borderRadius: 3,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    height: '80%',
    maxHeight: '85%',
  },
  selectorModalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    height: '70%',
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  groupButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.card,
    marginLeft: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  modalProgressSection: {
    marginBottom: 20,
  },
  modalProgressText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  progressBarLarge: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  exerciseList: {
    flex: 1,
    marginBottom: 16,
    paddingBottom: 8,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  exerciseItemContent: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
    minWidth: 0,
  },
  exerciseItemLeft: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    paddingRight: 4,
  },
  exerciseItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  exerciseItemNameCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  exerciseItemDetails: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  exerciseItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
    minWidth: 0,
    flexWrap: 'nowrap',
    flexShrink: 0,
  },
  groupSelectCheckbox: {
    marginRight: 12,
    padding: 4,
  },
  exerciseItemSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  exerciseDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  exerciseTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  exerciseTypestrength: {
    backgroundColor: colors.primary + '20',
  },
  exerciseTypecardio: {
    backgroundColor: colors.accent + '20',
  },
  exerciseTypeduration: {
    backgroundColor: colors.secondary + '20',
  },
  exerciseTypeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.card,
    marginLeft: 8,
  },
  detailModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  detailModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  detailModalContent: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.15)',
    elevation: 5,
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  detailModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: 12,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
    marginRight: 8,
  },
  detailValue: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  detailTips: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  detailTipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  detailTipsText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  detailCloseButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  detailCloseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.card,
  },
  selectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: 12,
  },
  removeItem: {
    marginTop: 8,
  },
  selectorIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  selectorInfo: {
    flex: 1,
  },
  selectorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  selectorName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginRight: 8,
  },
  selectorSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  selectorCount: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  customBadgeSmall: {
    backgroundColor: colors.accent + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  customBadgeTextSmall: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.accent,
  },
  restChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activeRestChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: colors.primary + '20',
    borderWidth: 1,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  restChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  logInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  logInput: {
    width: 56,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.background,
    paddingHorizontal: 8,
    color: colors.text,
    backgroundColor: colors.card,
  },
  logButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  setChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  setChipPB: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  setChipText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  exerciseWeightContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.primary + '20',
    marginLeft: 8,
  },
  exerciseWeightText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  cardioDurationContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardioDurationText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600',
  },

  restPresetContainer: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  restPresetLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  restPresetChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  restPresetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.background,
  },
  restPresetChipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  restPresetChipText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  restPresetChipTextActive: {
    color: colors.primary,
  },

  // Onboarding helper styles
  onboardCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  onboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  onboardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  onboardSteps: {
    gap: 4,
    marginBottom: 10,
  },
  onboardStep: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  onboardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  onboardBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.background,
  },
  onboardBtnText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  onboardBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  onboardBtnPrimaryText: {
    color: colors.card,
    fontWeight: '800',
    fontSize: 12,
  },

  // Empty state quick action
  emptyAssignBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  emptyAssignText: {
    color: colors.card,
    fontWeight: '800',
    fontSize: 14,
  },

  // Exercise detail modal styles
  exerciseDetailContent: {
    padding: 16,
    gap: 12,
  },
  exerciseDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  exerciseDetailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  exerciseDetailValue: {
    fontSize: 16,
    color: colors.text,
  },

  // Workout selector modal styles
  workoutSelectorContent: {
    padding: 16,
    gap: 12,
  },

  // Custom rest time input styles
  customRestContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  customRestLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  customRestInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customRestInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: colors.text,
    backgroundColor: colors.card,
    fontSize: 16,
  },

  // Workout selector duplicate button
  selectorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  duplicateButton: {
    padding: 6,
  },

  // Celebration message
  celebrationMessage: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    zIndex: 999,
    // Enhanced shadow for better depth perception
    boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.15), 0px 4px 12px rgba(0, 0, 0, 0.1)',
    elevation: 8,
  },
  celebrationText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },

  // Previous workout data
  previousDataSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  previousDataTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  previousDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previousDataText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  previousDataDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  previousDataEmpty: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },

  // Quick stats section
  quickStatsSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    // Enhanced shadow for better depth perception
    boxShadow: '0px 6px 20px rgba(0, 0, 0, 0.1), 0px 2px 6px rgba(0, 0, 0, 0.06)',
    elevation: 4,
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});


