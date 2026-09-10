import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'en' | 'id';

interface UserState {
  name: string;
  weeklyGoal: number; // number of workouts per week
  theme: 'light' | 'dark' | 'system';
  language: Language;
  defaultRestTimer: number; // in seconds
  autoStartTimer: boolean;
  hapticsEnabled: boolean;
  streak: number;
  lastWorkoutDate: string | null;
  remindersEnabled: boolean;
  reminderTime: string; // ISO time or 'HH:mm'
  audioNotification: string;
  customAudioName: string;
  keepScreenAwake: boolean;
  hasCompletedOnboarding: boolean;
  setName: (name: string) => void;
  setWeeklyGoal: (goal: number) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (lang: Language) => void;
  setDefaultRestTimer: (seconds: number) => void;
  setAutoStartTimer: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setKeepScreenAwake: (enabled: boolean) => void;
  setHasCompletedOnboarding: (completed: boolean) => void;
  resetOnboarding: () => void;
  setRemindersEnabled: (enabled: boolean) => void;
  setReminderTime: (time: string) => void;
  setAudioNotification: (val: string, customName?: string) => void;
  setCustomAudioName: (name: string) => void;
  updateStreak: (date: string) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      name: 'Athlete',
      weeklyGoal: 3,
      theme: 'system',
      language: 'en',
      defaultRestTimer: 90, // 1m30s
      autoStartTimer: true,
      hapticsEnabled: true,
      keepScreenAwake: true,
      hasCompletedOnboarding: false,
      streak: 0,
      lastWorkoutDate: null,
      remindersEnabled: false,
      reminderTime: '09:00', // Default 9 AM
      audioNotification: 'default_notification',
      customAudioName: 'Custom Sound',
      setName: (name) => set({ name }),
      setWeeklyGoal: (goal) => set({ weeklyGoal: goal }),
      setTheme: (theme) => set({ theme }),
      setLanguage: (lang) => set({ language: lang }),
      setDefaultRestTimer: (seconds) => set({ defaultRestTimer: seconds }),
      setAutoStartTimer: (enabled) => set({ autoStartTimer: enabled }),
      setHapticsEnabled: (enabled) => set({ hapticsEnabled: enabled }),
      setKeepScreenAwake: (enabled) => set({ keepScreenAwake: enabled }),
      setHasCompletedOnboarding: (completed) => set({ hasCompletedOnboarding: completed }),
      resetOnboarding: () => set({ hasCompletedOnboarding: false }),
      setRemindersEnabled: (enabled) => set({ remindersEnabled: enabled }),
      setReminderTime: (time) => set({ reminderTime: time }),
      setAudioNotification: (val, customName) => set((state) => ({ audioNotification: val, customAudioName: customName || state.customAudioName })),
      setCustomAudioName: (name) => set({ customAudioName: name }),
      updateStreak: (date) => {
        const { lastWorkoutDate, streak } = get();
        if (!lastWorkoutDate) {
          set({ streak: 1, lastWorkoutDate: date });
          return;
        }

        const lastDate = new Date(lastWorkoutDate);
        const newDate = new Date(date);
        
        // Reset time to compare just the dates
        lastDate.setHours(0, 0, 0, 0);
        newDate.setHours(0, 0, 0, 0);
        
        const diffTime = Math.abs(newDate.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Consecutive day
          set({ streak: streak + 1, lastWorkoutDate: date });
        } else if (diffDays > 1) {
          // Streak broken
          set({ streak: 1, lastWorkoutDate: date });
        }
        // If diffDays === 0, same day, do nothing to streak
      },
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
