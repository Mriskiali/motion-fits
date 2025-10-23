
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
  Animated
} from "react-native";
import { IconSymbol } from "@/components/IconSymbol";
import { useTheme, useFocusEffect } from "@react-navigation/native";
import { colors } from "@/styles/commonStyles";
import * as Haptics from "expo-haptics";
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Exercise {
  id: string;
  name: string;
  sets: string;
  reps?: string;
  duration?: string;
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
};

const DAYS_OF_WEEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const defaultWorkoutPlans: WorkoutPlan[] = [
  {
    id: 'upper1',
    name: 'UPPER',
    subtitle: 'Chest, Shoulder, Triceps',
    icon: 'figure.strengthtraining.traditional',
    color: '#64b5f6',
    exercises: [
      { id: 'u1-1', name: 'Resistance Band Chest Press', sets: '4', reps: '12' },
      { id: 'u1-2', name: 'Incline Push-up / Pike Push-up', sets: '3', reps: '10' },
      { id: 'u1-3', name: 'Single Dumbbell Shoulder Press', sets: '3', reps: '12' },
      { id: 'u1-4', name: 'Resistance Band Lateral Raise', sets: '3', reps: '12–15' },
      { id: 'u1-5', name: 'Single Dumbbell Overhead Tricep Extension', sets: '3', reps: '12' },
      { id: 'u1-6', name: 'Resistance Band Tricep Pushdown', sets: '3', reps: '12' },
      { id: 'u1-7', name: 'Cooldown Cycling', sets: '1', duration: '5–15 minutes light' },
    ],
  },
  {
    id: 'lower',
    name: 'LOWER',
    subtitle: 'Legs + Glutes + Calves',
    icon: 'figure.strengthtraining.functional',
    color: '#aed581',
    exercises: [
      { id: 'l-1', name: 'Goblet Squat (with dumbbell)', sets: '4', reps: '12' },
      { id: 'l-2', name: 'Resistance Band Deadlift / Romanian Deadlift', sets: '3', reps: '12' },
      { id: 'l-3', name: 'Front Lunges', sets: '3', reps: '12' },
      { id: 'l-4', name: 'Glute Bridge', sets: '3', reps: '15' },
      { id: 'l-5', name: 'Standing Calf Raise', sets: '4', reps: '15–20' },
      { id: 'l-6', name: 'Cycling', sets: '1', duration: '10–20 minutes' },
    ],
  },
  {
    id: 'upper2',
    name: 'UPPER',
    subtitle: 'Back, Biceps, Forearm, Core',
    icon: 'figure.core.training',
    color: '#ffb74d',
    exercises: [
      { id: 'u2-1', name: 'Resistance Band Row', sets: '4', reps: '12' },
      { id: 'u2-2', name: 'Resistance Band Face Pull', sets: '3', reps: '12' },
      { id: 'u2-3', name: 'Single Dumbbell Bicep Curl', sets: '3', reps: '12' },
      { id: 'u2-4', name: 'Hammer Curl (alternate dumbbell)', sets: '3', reps: '12' },
      { id: 'u2-5', name: 'Resistance Band Reverse Curl', sets: '3', reps: '12' },
      { id: 'u2-6', name: 'Renegade Row (with dumbbell)', sets: '3', reps: '10' },
      { id: 'u2-7', name: 'Penguin Crunch', sets: '3', reps: '20' },
      { id: 'u2-8', name: 'Plank', sets: '3', duration: '30–45 seconds' },
      { id: 'u2-9', name: 'Hollow Position', sets: '3', duration: '30 seconds' },
      { id: 'u2-10', name: 'Cooldown Cycling', sets: '1', duration: '5–15 minutes easy' },
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
  const [autoRestOnIncrement, setAutoRestOnIncrement] = useState<boolean>(true);
  const [restEvents, setRestEvents] = useState<
    { planId: string; exerciseId: string; date: string; startedAt: number; durationSec: number }[]
  >([]);
  // Onboarding/helper states
  const [hasAnySession, setHasAnySession] = useState<boolean>(false);
  const [showWorkoutOnboarding, setShowWorkoutOnboarding] = useState<boolean>(false);
  
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

  // Notify when any rest timer finishes
  useEffect(() => {
    const due = restTimers.filter(t => !t.notified && t.endsAt <= now);
    if (due.length) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
    }
  };

  useEffect(() => {
    if (showPlanModal) {
      loadBest1RMMap();
    }
  }, [showPlanModal]);

  const loadData = async () => {
    try {
      const completedData = await AsyncStorage.getItem('completedExercises');
      const assignmentsData = await AsyncStorage.getItem('workoutAssignments');
      const customPlansData = await AsyncStorage.getItem('customWorkoutPlans');
      const setCountsData = await AsyncStorage.getItem('exerciseSetCounts');
      const restTimersData = await AsyncStorage.getItem('restTimers');
      const setLogsData = await AsyncStorage.getItem('setLogs');
      
      if (completedData) {
        setCompletedExercises(JSON.parse(completedData));
        console.log('Loaded completed exercises from storage');
      }
      
      if (assignmentsData) {
        setWorkoutAssignments(JSON.parse(assignmentsData));
        console.log('Loaded workout assignments from storage');
      }

      if (customPlansData) {
        setCustomWorkoutPlans(JSON.parse(customPlansData));
        console.log('Loaded custom workout plans from storage');
      }

      if (setCountsData) {
        setExerciseSetCounts(JSON.parse(setCountsData));
        console.log('Loaded exercise set counts from storage');
      }

      if (restTimersData) {
        setRestTimers(JSON.parse(restTimersData));
        console.log('Loaded rest timers from storage');
      }

      if (setLogsData) {
        setSetLogs(JSON.parse(setLogsData));
        console.log('Loaded set logs from storage');
      }

      // Has any session ever been saved? (for onboarding context)
      try {
        const sessionsStr = await AsyncStorage.getItem('workoutSessions');
        const arr = sessionsStr ? JSON.parse(sessionsStr) : [];
        setHasAnySession(Array.isArray(arr) && arr.length > 0);
      } catch {}

      const restDefaultSecData = await AsyncStorage.getItem('restDefaultSec');
      if (restDefaultSecData) {
        setRestDefaultSec(JSON.parse(restDefaultSecData));
        console.log('Loaded rest default sec from storage');
      }

      const autoRestStr = await AsyncStorage.getItem('autoRestOnIncrement_v1');
      if (autoRestStr !== null) {
        try {
          setAutoRestOnIncrement(JSON.parse(autoRestStr));
          console.log('Loaded autoRestOnIncrement from storage');
        } catch {}
      }

      // Show the quick-start helper until dismissed by the user
      try {
        const onbSeen = await AsyncStorage.getItem('onb_workout_seen_v1');
        if (onbSeen === null) {
          setShowWorkoutOnboarding(true);
        }
      } catch {}
    } catch (error) {
      console.log('Error loading data:', error);
    }
  };

  const saveData = async () => {
    try {
      await AsyncStorage.setItem('completedExercises', JSON.stringify(completedExercises));
      await AsyncStorage.setItem('workoutAssignments', JSON.stringify(workoutAssignments));
      await AsyncStorage.setItem('customWorkoutPlans', JSON.stringify(customWorkoutPlans));
      await AsyncStorage.setItem('exerciseSetCounts', JSON.stringify(exerciseSetCounts));
      await AsyncStorage.setItem('restTimers', JSON.stringify(restTimers));
      await AsyncStorage.setItem('setLogs', JSON.stringify(setLogs));
      console.log('Data saved to storage');
    } catch (error) {
      console.log('Error saving data:', error);
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
    return date.toISOString().split('T')[0];
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
    
    console.log('Workout assigned to', dateStr, ':', planId);
  };

  const deleteWorkoutPlan = async (planId: string) => {
    try {
      // Remove plan from custom plans
      const existingPlansData = await AsyncStorage.getItem('customWorkoutPlans');
      const existingPlans: WorkoutPlan[] = existingPlansData ? JSON.parse(existingPlansData) : [];
      const updatedPlans = existingPlans.filter(p => p.id !== planId);
      await AsyncStorage.setItem('customWorkoutPlans', JSON.stringify(updatedPlans));
      setCustomWorkoutPlans(updatedPlans);

      // Unassign any days referencing this plan
      setWorkoutAssignments(prev =>
        prev.map(a => (a.planId === planId ? { ...a, planId: null } : a))
      );

      // Remove completed exercises linked to this plan
      setCompletedExercises(prev => prev.filter(ce => ce.planId !== planId));

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      console.log('Workout plan deleted:', planId);
      Alert.alert('Deleted', 'Workout plan has been removed.');
    } catch (error) {
      console.log('Error deleting workout plan:', error);
      Alert.alert('Error', 'Failed to delete workout plan.');
    }
  };

  const isExerciseCompleted = (planId: string, exerciseId: string, date?: Date) => {
    const dateStr = date ? getDateString(date) : getDateString(selectedDate);
    return completedExercises.some(
      ce => ce.planId === planId && ce.exerciseId === exerciseId && ce.date === dateStr
    );
  };

  const toggleExerciseCompletion = (planId: string, exerciseId: string) => {
    const dateStr = getDateString(selectedDate);
    const isCompleted = isExerciseCompleted(planId, exerciseId);
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (isCompleted) {
      setCompletedExercises(prev =>
        prev.filter(ce => !(ce.planId === planId && ce.exerciseId === exerciseId && ce.date === dateStr))
      );
      console.log('Exercise unchecked:', exerciseId);
    } else {
      setCompletedExercises(prev => [...prev, { planId, exerciseId, date: dateStr }]);
      console.log('Exercise completed:', exerciseId);
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

  const REST_PRESET_OPTIONS = [30, 60, 90, 120];

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
    const dateStr = getDateString(selectedDate);
    const nextIndex = getNextSetIndex(planId, exerciseId);
    const weight = 0;
    const reps = Number(repsDefault || 0);

    // Persist log
    setSetLogs(prev => {
      const withoutDup = prev.filter(l => !(l.planId === planId && l.exerciseId === exerciseId && l.date === dateStr && l.setIndex === nextIndex));
      return [...withoutDup, { planId, exerciseId, date: dateStr, setIndex: nextIndex, weight, reps }];
    });

    // Increment set count and start rest
    const current = getExerciseSetCount(planId, exerciseId);
    const next = Math.min(current + 1, targetSets);
    setExerciseSetCount(planId, exerciseId, next, targetSets);
    startRestTimer(planId, exerciseId, restDefaultSec);

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    }

    // Compute new PBs for this session
    const newPBs: { exerciseId: string; name: string; metric: '1RM'; value: number }[] = [];
    selectedPlan.exercises.forEach(ex => {
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
    });

    // Rest stats for this session
    const restForSession = restEvents.filter(ev => ev.planId === selectedPlan.id && ev.date === dateStr);
    const restCount = restForSession.length;
    const restTotalSec = restForSession.reduce((sum, ev) => sum + (ev.durationSec || 0), 0);
    const restAvgSec = restCount ? Math.round(restTotalSec / restCount) : 0;

    const session: WorkoutSession = {
      id: `${dateStr}_${selectedPlan.id}_${endedAt}`,
      date: dateStr,
      planId: selectedPlan.id,
      planName: selectedPlan.name,
      color: selectedPlan.color,
      startedAt,
      endedAt,
      durationSec,
      exercises: exercisesSnapshot,
      completionPercent,
      totalSets,
      restCount,
      restAvgSec,
      setLogs: logsForSession,
      newPBs,
    };

    try {
      const existing = await AsyncStorage.getItem('workoutSessions');
      const arr: WorkoutSession[] = existing ? JSON.parse(existing) : [];
      arr.push(session);
      await AsyncStorage.setItem('workoutSessions', JSON.stringify(arr));
      console.log('Workout session saved:', session.id);
    } catch (e) {
      console.log('Error saving workout session:', e);
    } finally {
      setCurrentSessionStart(null);
      setShowPlanModal(false);
      setRestEvents([]);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
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
    } else if (!done && alreadyCompleted) {
      setCompletedExercises((prev) =>
        prev.filter((ce) => !(ce.planId === planId && ce.exerciseId === exerciseId && ce.date === dateStr))
      );
    }

    if (Platform.OS !== 'web') {
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
  };

  const decrementSetCount = (planId: string, exerciseId: string, targetSets: number) => {
    const current = getExerciseSetCount(planId, exerciseId);
    const next = Math.max(current - 1, 0);
    setExerciseSetCount(planId, exerciseId, next, targetSets);
  };

  const getCompletionPercentage = (plan: WorkoutPlan, date?: Date) => {
    const dateStr = date ? getDateString(date) : getDateString(selectedDate);
    const total = plan.exercises.length;
    if (total === 0) return 0;
    const completedCount = plan.exercises.filter(ex =>
      completedExercises.some(ce =>
        ce.planId === plan.id && ce.exerciseId === ex.id && ce.date === dateStr
      )
    ).length;
    return Math.round((completedCount / total) * 100);
  };

  const handleDayPress = (date: Date) => {
    console.log('Day selected:', getDateString(date));
    setSelectedDate(date);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePlanPress = (plan: WorkoutPlan) => {
    console.log('Workout plan selected:', plan.name);
    setSelectedPlan(plan);
    // mark session start when opening the plan modal
    setCurrentSessionStart(Date.now());
    setShowPlanModal(true);
  };

  const handleExercisePress = (exercise: Exercise) => {
    console.log('Exercise details opened:', exercise.name);
    setSelectedExercise(exercise);
    setShowExerciseDetail(true);
  };

  const handleAssignWorkout = () => {
    setShowWorkoutSelector(true);
  };

  const handleWorkoutSelection = (planId: string | null) => {
    assignWorkoutToDate(selectedDate, planId);
    setShowWorkoutSelector(false);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
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
      <TouchableOpacity onPress={onPress} style={styles.checkboxContainer}>
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
          <Text style={[styles.progressPercentage, { fontSize: size / 3 }]}>{percentage}%</Text>
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
              <IconSymbol name="calendar.badge.plus" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyStateTitle}>No Workout Assigned</Text>
              <Text style={styles.emptyStateText}>
                Tap the button above to assign a workout to this day
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
                            { text: 'Delete', style: 'destructive', onPress: () => deleteWorkoutPlan(plan.id) },
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
        </ScrollView>

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
                <TouchableOpacity onPress={() => setShowPlanModal(false)}>
                  <IconSymbol name="xmark.circle.fill" size={32} color={colors.textSecondary} />
                </TouchableOpacity>
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
                  return (
                    <View key={exercise.id} style={styles.exerciseItem}>
                      <AnimatedCheckbox
                        checked={isCompleted}
                        onPress={() => toggleExerciseCompletion(planId, exercise.id)}
                      />
                      <TouchableOpacity
                        style={styles.exerciseItemContent}
                        onPress={() => handleExercisePress(exercise)}
                      >
                        <View style={styles.exerciseItemLeft}>
                          <Text style={[styles.exerciseItemName, isCompleted && styles.exerciseItemNameCompleted]} numberOfLines={2} ellipsizeMode="tail">
                            {exercise.name}
                          </Text>
                          <Text style={styles.exerciseItemDetails} numberOfLines={1} ellipsizeMode="tail">
                            {targetSets} sets × {exercise.reps || exercise.duration}
                          </Text>
                        </View>

                        <View style={styles.exerciseItemRight}>
                          <TouchableOpacity
                            onPress={() => decrementSetCount(planId, exercise.id, targetSets)}
                            style={{ padding: 8 }}
                          >
                            <IconSymbol name="minus.circle.fill" size={22} color={colors.textSecondary} />
                          </TouchableOpacity>
                          <Text style={{ minWidth: 48, textAlign: 'center', color: colors.text, fontWeight: '600' }}>
                            {setCount}/{targetSets}
                          </Text>
                          <TouchableOpacity
                            onPress={() => incrementSetCount(planId, exercise.id, targetSets)}
                            style={{ padding: 8 }}
                          >
                            <IconSymbol name="plus.circle.fill" size={22} color={colors.primary} />
                          </TouchableOpacity>

                          {remainingRest > 0 ? (
                            <Pressable
                              style={[styles.restChip]}
                              onLongPress={() => {
                                cancelRestTimer(planId, exercise.id);
                                if (Platform.OS !== 'web') {
                                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                }
                              }}
                              delayLongPress={300}
                            >
                              <Text style={styles.restChipText}>{formatSeconds(remainingRest)}</Text>
                            </Pressable>
                          ) : (
                            <TouchableOpacity
                              style={styles.restChip}
                              onPress={() => startRestTimer(planId, exercise.id, restDefaultSec)}
                            >
                              <Text style={styles.restChipText}>{setCount}</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </TouchableOpacity>
                      {/* Inline logging inputs */}
                      <View style={styles.logInputContainer}>
                        <TouchableOpacity
                          style={styles.logButton}
                          onPress={() => onLogSet(planId, exercise.id, targetSets, parseDefaultReps(exercise.reps))}
                        >
                          <IconSymbol name="square.and.pencil" size={18} color={colors.card} />
                        </TouchableOpacity>
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
                {selectedExercise?.reps && (
                  <View style={styles.detailRow}>
                    <IconSymbol name="repeat" size={20} color={colors.secondary} />
                    <Text style={styles.detailLabel}>Reps:</Text>
                    <Text style={styles.detailValue}>{selectedExercise.reps}</Text>
                  </View>
                )}
                {selectedExercise?.duration && (
                  <View style={styles.detailRow}>
                    <IconSymbol name="clock.fill" size={20} color={colors.accent} />
                    <Text style={styles.detailLabel}>Duration:</Text>
                    <Text style={styles.detailValue}>{selectedExercise.duration}</Text>
                  </View>
                )}
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
                    onPress={() => handleWorkoutSelection(plan.id)}
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
                    <IconSymbol name="chevron.right" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}

                {selectedWorkout && (
                  <TouchableOpacity
                    style={[styles.selectorItem, styles.removeItem]}
                    onPress={() => handleWorkoutSelection(null)}
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
      </View>
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
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
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
    elevation: 3,
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
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 2,
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
});
