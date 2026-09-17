import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type WeightMode = 'weighted' | 'bodyweight' | 'none';

export type Exercise = {
  id: string;
  name: string;
  type?: 'reps' | 'time';
  weightMode?: WeightMode;
  sets: number;
  reps?: number | string; // e.g., '10' or '8-12'
  duration?: number; // duration in seconds
  weight?: number; 
};

export type WorkoutTemplate = {
  id: string;
  name: string;
  subtitle?: string;
  icon: string;
  color: string;
  exercises: Exercise[];
  defaultRestTime: number; // in seconds
};

export type WorkoutSession = {
  id: string;
  templateId: string;
  date: string; // ISO string
  duration: number; // in seconds
  completedExercises: {
    exerciseId: string;
    completedSets: number[]; // Array of completed reps per set
    setsDetails?: Record<number, { reps?: number; weight?: number }>;
  }[];
};

export type ActiveRestTimer = {
  targetEndTime: number; // Unix timestamp in ms
  totalDuration: number; // total duration in seconds
  exerciseId: string;
  setIndex: number;
};

export type ActiveWorkoutSession = WorkoutSession & {
  startTime: number;
  completedSetsMap: Record<string, number[]>;
  actualValuesMap: Record<string, Record<number, string>>;
  actualWeightsMap?: Record<string, Record<number, string>>;
  activeRestTimer?: ActiveRestTimer | null;
};

interface WorkoutState {
  templates: WorkoutTemplate[];
  sessions: WorkoutSession[];
  activeSession: ActiveWorkoutSession | null;
  scheduledWorkouts: Record<string, string>;
  scheduleWorkout: (date: string, templateId: string | null) => void;
  addTemplate: (template: WorkoutTemplate) => void;
  updateTemplate: (id: string, template: WorkoutTemplate) => void;
  deleteTemplate: (id: string) => void;
  startSession: (templateId: string) => void;
  updateActiveSession: (
    completedSetsMap: Record<string, number[]>,
    actualValuesMap: Record<string, Record<number, string>>,
    activeRestTimer?: ActiveRestTimer | null,
    actualWeightsMap?: Record<string, Record<number, string>>
  ) => void;
  startRestTimer: (exerciseId: string, setIndex: number, durationSeconds: number) => void;
  adjustRestTimer: (amountSeconds: number) => void;
  clearRestTimer: () => void;
  completeRestTimer: () => void;
  logSession: (session: WorkoutSession) => void;
  deleteSession: (id: string) => void;
  clearActiveSession: () => void;
}

const defaultTemplates: WorkoutTemplate[] = [
  {
    id: '1',
    name: 'Push Day',
    subtitle: 'Chest, Shoulders, Triceps',
    icon: 'dumbbell',
    color: '#F59E0B', // amber-500 brand
    defaultRestTime: 90,
    exercises: [
      { id: 'e1', name: 'Bench Press', sets: 4, reps: '8-10' },
      { id: 'e2', name: 'Overhead Press', sets: 3, reps: '8-12' },
      { id: 'e3', name: 'Tricep Extensions', sets: 3, reps: '12-15' },
    ]
  },
  {
    id: '2',
    name: 'Pull Day',
    subtitle: 'Back, Biceps',
    icon: 'activity',
    color: '#10b981', // emerald-500
    defaultRestTime: 90,
    exercises: [
      { id: 'e4', name: 'Pull Ups', sets: 4, reps: '8-10' },
      { id: 'e5', name: 'Barbell Rows', sets: 4, reps: '8-12' },
      { id: 'e6', name: 'Bicep Curls', sets: 3, reps: '10-15' },
    ]
  }
];

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set) => ({
      templates: defaultTemplates,
      sessions: [],
      activeSession: null,
      scheduledWorkouts: {},
      scheduleWorkout: (date, templateId) =>
        set((state) => {
          const updated = { ...state.scheduledWorkouts };
          if (templateId) {
            updated[date] = templateId;
          } else {
            delete updated[date];
          }
          return { scheduledWorkouts: updated };
        }),
      addTemplate: (template) =>
        set((state) => ({ templates: [...state.templates, template] })),
      updateTemplate: (id, template) =>
        set((state) => ({
          templates: state.templates.map((t) => (t.id === id ? template : t)),
        })),
      deleteTemplate: (id) =>
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        })),
      startSession: (templateId) =>
        set(() => ({
          activeSession: {
            id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            templateId,
            date: new Date().toISOString(),
            duration: 0,
            completedExercises: [],
            startTime: Date.now(),
            completedSetsMap: {},
            actualValuesMap: {},
            actualWeightsMap: {},
          },
        })),
      updateActiveSession: (completedSetsMap, actualValuesMap, activeRestTimer, actualWeightsMap) =>
        set((state) => ({
          activeSession: state.activeSession
            ? {
                ...state.activeSession,
                completedSetsMap,
                actualValuesMap,
                actualWeightsMap:
                  actualWeightsMap !== undefined
                    ? actualWeightsMap
                    : state.activeSession.actualWeightsMap || {},
                activeRestTimer:
                  activeRestTimer !== undefined
                    ? activeRestTimer
                    : state.activeSession.activeRestTimer,
              }
            : null,
        })),
      startRestTimer: (exerciseId, setIndex, durationSeconds) =>
        set((state) => {
          if (!state.activeSession) return state;
          return {
            activeSession: {
              ...state.activeSession,
              activeRestTimer: {
                targetEndTime: Date.now() + durationSeconds * 1000,
                totalDuration: durationSeconds,
                exerciseId,
                setIndex,
              },
            },
          };
        }),
      adjustRestTimer: (amountSeconds) =>
        set((state) => {
          if (!state.activeSession || !state.activeSession.activeRestTimer) return state;
          const current = state.activeSession.activeRestTimer;
          const remainingMs = Math.max(0, current.targetEndTime - Date.now());
          const newRemainingMs = Math.max(0, remainingMs + amountSeconds * 1000);
          if (newRemainingMs <= 0) {
            return {
              activeSession: {
                ...state.activeSession,
                activeRestTimer: null,
              },
            };
          }
          const newTargetEndTime = Date.now() + newRemainingMs;
          const newTotalDuration = Math.max(current.totalDuration, Math.ceil(newRemainingMs / 1000));
          return {
            activeSession: {
              ...state.activeSession,
              activeRestTimer: {
                ...current,
                targetEndTime: newTargetEndTime,
                totalDuration: newTotalDuration,
              },
            },
          };
        }),
      clearRestTimer: () =>
        set((state) => {
          if (!state.activeSession) return state;
          return {
            activeSession: {
              ...state.activeSession,
              activeRestTimer: null,
            },
          };
        }),
      completeRestTimer: () =>
        set((state) => {
          if (!state.activeSession || !state.activeSession.activeRestTimer) return state;
          const { exerciseId, setIndex } = state.activeSession.activeRestTimer;
          const currentSets = state.activeSession.completedSetsMap[exerciseId] || [];
          const updatedSets = currentSets.includes(setIndex)
            ? currentSets
            : [...currentSets, setIndex];
          return {
            activeSession: {
              ...state.activeSession,
              completedSetsMap: {
                ...state.activeSession.completedSetsMap,
                [exerciseId]: updatedSets,
              },
              activeRestTimer: null,
            },
          };
        }),
      logSession: (session) =>
        set((state) => ({
          sessions: [...state.sessions, session],
          activeSession: null,
        })),
      deleteSession: (id) =>
        set((state) => {
          const sessionToDelete = state.sessions.find((s) => s.id === id);
          const remainingSessions = state.sessions.filter((s) => s.id !== id);

          const updatedScheduled = { ...state.scheduledWorkouts };
          if (sessionToDelete) {
            const dt = new Date(sessionToDelete.date);
            const yr = dt.getFullYear();
            const mo = String(dt.getMonth() + 1).padStart(2, '0');
            const da = String(dt.getDate()).padStart(2, '0');
            const sessionDateKey = `${yr}-${mo}-${da}`;
            const isoPrefix = sessionToDelete.date.split('T')[0];

            delete updatedScheduled[sessionDateKey];
            delete updatedScheduled[isoPrefix];
          }

          // Purge any past scheduled workout dates that do not have a completed workout in remainingSessions
          const now = new Date();
          const todayYr = now.getFullYear();
          const todayMo = String(now.getMonth() + 1).padStart(2, '0');
          const todayDa = String(now.getDate()).padStart(2, '0');
          const todayKey = `${todayYr}-${todayMo}-${todayDa}`;

          Object.keys(updatedScheduled).forEach((dateKey) => {
            if (dateKey < todayKey) {
              const hasSession = remainingSessions.some((s) => {
                const sDt = new Date(s.date);
                const sKey = `${sDt.getFullYear()}-${String(sDt.getMonth() + 1).padStart(2, '0')}-${String(sDt.getDate()).padStart(2, '0')}`;
                return sKey === dateKey;
              });
              if (!hasSession) {
                delete updatedScheduled[dateKey];
              }
            }
          });

          try {
            const { useUserStore } = require('./useUserStore');
            useUserStore.getState().recalculateStreak(remainingSessions.map((s: WorkoutSession) => s.date));
          } catch {
            // safely ignore if circular load
          }

          return {
            sessions: remainingSessions,
            scheduledWorkouts: updatedScheduled,
          };
        }),
      clearActiveSession: () => set({ activeSession: null }),
    }),
    {
      name: 'workout-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
