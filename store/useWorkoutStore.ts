import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from './useUserStore';

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
  deletedTemplateIds?: string[];
  scheduleWorkout: (date: string, templateId: string | null) => void;
  addTemplate: (template: WorkoutTemplate) => void;
  updateTemplate: (id: string, template: WorkoutTemplate) => void;
  deleteTemplate: (id: string) => void;
  clearDeletedTemplateId: (id: string) => void;
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

export const defaultTemplates: WorkoutTemplate[] = [];

export const useWorkoutStore = create<WorkoutState>()((set) => ({
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
      deletedTemplateIds: [],
      deleteTemplate: (id) =>
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
          deletedTemplateIds: Array.from(new Set([...(state.deletedTemplateIds || []), id])),
        })),
      clearDeletedTemplateId: (id) =>
        set((state) => ({
          deletedTemplateIds: (state.deletedTemplateIds || []).filter((item) => item !== id),
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

          useUserStore.getState().recalculateStreak(remainingSessions.map((s: WorkoutSession) => s.date));

          return {
            sessions: remainingSessions,
            scheduledWorkouts: updatedScheduled,
          };
        }),
      clearActiveSession: () => set({ activeSession: null }),
    })
);

let activeWorkoutUserId: string | null = null;

// Reactive subscriber: automatically saves changes into the active user's partition
useWorkoutStore.subscribe((state) => {
  if (activeWorkoutUserId) {
    const partition = {
      templates: state.templates,
      sessions: state.sessions,
      scheduledWorkouts: state.scheduledWorkouts,
      deletedTemplateIds: state.deletedTemplateIds || [],
      activeSession: state.activeSession,
    };
    AsyncStorage.setItem(`workout_partition_${activeWorkoutUserId}`, JSON.stringify(partition)).catch(() => {});
  }
});

export const loadWorkoutPartition = async (userId: string): Promise<void> => {
  if (activeWorkoutUserId === userId) return;

  // Persist previous user's partition if switching accounts
  if (activeWorkoutUserId && activeWorkoutUserId !== userId) {
    const state = useWorkoutStore.getState();
    await AsyncStorage.setItem(
      `workout_partition_${activeWorkoutUserId}`,
      JSON.stringify({
        templates: state.templates,
        sessions: state.sessions,
        scheduledWorkouts: state.scheduledWorkouts,
        deletedTemplateIds: state.deletedTemplateIds || [],
        activeSession: state.activeSession,
      })
    ).catch(() => {});
  }

  activeWorkoutUserId = userId;

  try {
    const raw = await AsyncStorage.getItem(`workout_partition_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);

      // Restore active session with sanity check (discard if older than 24 hours)
      let restoredActiveSession = parsed.activeSession || null;
      if (restoredActiveSession && restoredActiveSession.startTime) {
        const sessionAgeMs = Date.now() - restoredActiveSession.startTime;
        if (sessionAgeMs > 24 * 60 * 60 * 1000) {
          restoredActiveSession = null;
        }
      }

      useWorkoutStore.setState({
        templates: parsed.templates || defaultTemplates,
        sessions: parsed.sessions || [],
        scheduledWorkouts: parsed.scheduledWorkouts || {},
        deletedTemplateIds: parsed.deletedTemplateIds || [],
        activeSession: restoredActiveSession,
      });
      return;
    }

    // Backward compatibility: If no partition yet, check if legacy workout-storage belongs to this user
    const lastUserId = await AsyncStorage.getItem('lastActiveUserId');
    if (lastUserId === userId) {
      const legacyRaw = await AsyncStorage.getItem('workout-storage');
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw);
        const legacyState = legacyParsed?.state;
        if (legacyState) {
          const templates = legacyState.templates || defaultTemplates;
          const sessions = legacyState.sessions || [];
          const scheduledWorkouts = legacyState.scheduledWorkouts || {};
          const deletedTemplateIds = legacyState.deletedTemplateIds || [];
          const activeSession = legacyState.activeSession || null;

          useWorkoutStore.setState({
            templates,
            sessions,
            scheduledWorkouts,
            deletedTemplateIds,
            activeSession,
          });

          await AsyncStorage.setItem(
            `workout_partition_${userId}`,
            JSON.stringify({ templates, sessions, scheduledWorkouts, deletedTemplateIds, activeSession })
          ).catch(() => {});
          await AsyncStorage.removeItem('workout-storage').catch(() => {});
          return;
        }
      }
    }
  } catch (e) {
    console.warn('[WorkoutStore] Error loading user partition:', e);
  }

  // Brand new user: initialize pristine clean state
  useWorkoutStore.setState({
    templates: defaultTemplates,
    sessions: [],
    scheduledWorkouts: {},
    deletedTemplateIds: [],
    activeSession: null,
  });
};

export const unloadWorkoutPartition = async (discardActiveSession: boolean = false): Promise<void> => {
  if (activeWorkoutUserId) {
    const state = useWorkoutStore.getState();
    await AsyncStorage.setItem(
      `workout_partition_${activeWorkoutUserId}`,
      JSON.stringify({
        templates: state.templates,
        sessions: state.sessions,
        scheduledWorkouts: state.scheduledWorkouts,
        deletedTemplateIds: state.deletedTemplateIds || [],
        activeSession: discardActiveSession ? null : state.activeSession,
      })
    ).catch(() => {});
  }
  activeWorkoutUserId = null;

  // Reset in-memory state to clean empty sandbox
  useWorkoutStore.setState({
    templates: defaultTemplates,
    sessions: [],
    scheduledWorkouts: {},
    deletedTemplateIds: [],
    activeSession: null,
  });
  await AsyncStorage.removeItem('workout-storage').catch(() => {});
};
