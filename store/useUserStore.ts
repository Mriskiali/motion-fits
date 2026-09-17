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
  customAudioDuration: number; // Duration in seconds (e.g. 5)
  customAudioStartOffset: number; // Start offset in seconds (e.g. 0)
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
  setCustomAudioDuration: (seconds: number) => void;
  setCustomAudioStartOffset: (seconds: number) => void;
  updateStreak: (date: string) => void;
  checkStreakExpiry: () => void;
  recalculateStreak: (sessionDates: string[]) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      name: '',
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
      customAudioDuration: 5, // Default 5 seconds
      customAudioStartOffset: 0, // Default start at 0s
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
      setCustomAudioDuration: (seconds) => set({ customAudioDuration: Math.max(1, seconds) }),
      setCustomAudioStartOffset: (seconds) => set({ customAudioStartOffset: Math.max(0, seconds) }),
      updateStreak: (date) => {
        const { lastWorkoutDate, streak } = get();
        if (!lastWorkoutDate) {
          set({ streak: 1, lastWorkoutDate: date });
          return;
        }

        // Same date workout: streak already counted for today
        if (lastWorkoutDate === date) {
          return;
        }

        const lastDate = new Date(lastWorkoutDate);
        const newDate = new Date(date);
        
        // Reset time to compare just the calendar dates
        lastDate.setHours(0, 0, 0, 0);
        newDate.setHours(0, 0, 0, 0);
        
        const diffTime = newDate.getTime() - lastDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Consecutive day: increment streak
          set({ streak: streak + 1, lastWorkoutDate: date });
        } else if (diffDays > 1) {
          // Streak broken: reset to 1 for today's new workout
          set({ streak: 1, lastWorkoutDate: date });
        }
      },
      checkStreakExpiry: () => {
        const { lastWorkoutDate, streak } = get();
        if (!lastWorkoutDate || streak <= 0) return;

        const lastDate = new Date(lastWorkoutDate);
        const today = new Date();
        lastDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const diffTime = today.getTime() - lastDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        // If last workout was before yesterday (2 or more days ago), streak has broken
        if (diffDays > 1) {
          set({ streak: 0 });
        }
      },
      recalculateStreak: (sessionDateStrings) => {
        if (!sessionDateStrings || sessionDateStrings.length === 0) {
          set({ streak: 0, lastWorkoutDate: null });
          return;
        }

        const uniqueDayStrings = Array.from(
          new Set(
            sessionDateStrings.map((d) => {
              const dt = new Date(d);
              const yr = dt.getFullYear();
              const mo = String(dt.getMonth() + 1).padStart(2, '0');
              const da = String(dt.getDate()).padStart(2, '0');
              return `${yr}-${mo}-${da}`;
            })
          )
        ).sort((a, b) => b.localeCompare(a));

        if (uniqueDayStrings.length === 0) {
          set({ streak: 0, lastWorkoutDate: null });
          return;
        }

        const mostRecentDateStr = uniqueDayStrings[0];
        const [mY, mM, mD] = mostRecentDateStr.split('-').map(Number);
        const mostRecentDate = new Date(mY, mM - 1, mD);

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const diffFromToday = Math.round((today.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffFromToday > 1) {
          set({ streak: 0, lastWorkoutDate: mostRecentDateStr });
          return;
        }

        let currentStreak = 1;
        let prevDate = mostRecentDate;

        for (let i = 1; i < uniqueDayStrings.length; i++) {
          const [cY, cM, cD] = uniqueDayStrings[i].split('-').map(Number);
          const checkDate = new Date(cY, cM - 1, cD);

          const dayDiff = Math.round((prevDate.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24));
          if (dayDiff === 1) {
            currentStreak++;
            prevDate = checkDate;
          } else {
            break;
          }
        }

        set({ streak: currentStreak, lastWorkoutDate: mostRecentDateStr });
      },
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
