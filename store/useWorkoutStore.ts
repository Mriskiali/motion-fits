import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Exercise = {
  id: string;
  name: string;
  type?: 'reps' | 'time';
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
  }[];
};

export type ActiveWorkoutSession = WorkoutSession & {
  startTime: number;
  completedSetsMap: Record<string, number[]>;
  actualValuesMap: Record<string, Record<number, string>>;
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
  updateActiveSession: (completedSetsMap: Record<string, number[]>, actualValuesMap: Record<string, Record<number, string>>) => void;
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
    color: '#3b82f6', // blue-500
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
          },
        })),
      updateActiveSession: (completedSetsMap, actualValuesMap) =>
        set((state) => ({
          activeSession: state.activeSession
            ? { ...state.activeSession, completedSetsMap, actualValuesMap }
            : null,
        })),
      logSession: (session) =>
        set((state) => ({
          sessions: [...state.sessions, session],
          activeSession: null,
        })),
      deleteSession: (id) =>
        set((state) => ({
          sessions: state.sessions.filter(s => s.id !== id),
        })),
      clearActiveSession: () => set({ activeSession: null }),
    }),
    {
      name: 'workout-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
