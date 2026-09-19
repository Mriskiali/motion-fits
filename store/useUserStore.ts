import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateStreakFromDates } from '@/utils/streak';

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
  customAudioUri: string | null;
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
  setCustomAudioUri: (uri: string | null) => void;
  setCustomAudioName: (name: string) => void;
  setCustomAudioDuration: (seconds: number) => void;
  setCustomAudioStartOffset: (seconds: number) => void;
  updateStreak: (date: string) => void;
  checkStreakExpiry: () => void;
  recalculateStreak: (sessionDates: string[]) => void;
}

export const useUserStore = create<UserState>()((set, get) => ({
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
      customAudioUri: null,
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
      setAudioNotification: (val, customName) =>
        set((state) => ({
          audioNotification: val,
          customAudioName: customName || state.customAudioName,
          customAudioUri:
            val !== 'default_notification' && val !== 'none' && val !== 'silent'
              ? val
              : state.customAudioUri,
        })),
      setCustomAudioUri: (uri) => set({ customAudioUri: uri }),
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
        const result = calculateStreakFromDates(sessionDateStrings);
        set({ streak: result.streak, lastWorkoutDate: result.lastWorkoutDate });
      },
    })
);

let activeProfileUserId: string | null = null;

const serializeUserPartition = (state: UserState) => ({
  name: state.name,
  weeklyGoal: state.weeklyGoal,
  streak: state.streak,
  lastWorkoutDate: state.lastWorkoutDate,
  theme: state.theme,
  language: state.language,
  defaultRestTimer: state.defaultRestTimer,
  autoStartTimer: state.autoStartTimer,
  hapticsEnabled: state.hapticsEnabled,
  keepScreenAwake: state.keepScreenAwake,
  hasCompletedOnboarding: state.hasCompletedOnboarding,
  remindersEnabled: state.remindersEnabled,
  reminderTime: state.reminderTime,
  audioNotification: state.audioNotification,
  customAudioUri: state.customAudioUri,
  customAudioName: state.customAudioName,
  customAudioDuration: state.customAudioDuration,
  customAudioStartOffset: state.customAudioStartOffset,
});

// Reactive subscriber: automatically saves profile into the active user's partition
useUserStore.subscribe((state) => {
  if (activeProfileUserId) {
    const partition = serializeUserPartition(state);
    AsyncStorage.setItem(`user_partition_${activeProfileUserId}`, JSON.stringify(partition)).catch(() => {});
  }
});

export const loadUserPartition = async (userId: string): Promise<void> => {
  if (activeProfileUserId === userId) return;

  if (activeProfileUserId && activeProfileUserId !== userId) {
    const state = useUserStore.getState();
    await AsyncStorage.setItem(
      `user_partition_${activeProfileUserId}`,
      JSON.stringify(serializeUserPartition(state))
    ).catch(() => {});
  }

  activeProfileUserId = userId;

  try {
    const raw = await AsyncStorage.getItem(`user_partition_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      useUserStore.setState({
        name: parsed.name || '',
        weeklyGoal: Number(parsed.weeklyGoal) || 3,
        streak: Number(parsed.streak) || 0,
        lastWorkoutDate: parsed.lastWorkoutDate || null,
        theme: parsed.theme || 'system',
        language: parsed.language || 'id',
        defaultRestTimer: Number(parsed.defaultRestTimer) || 90,
        autoStartTimer: parsed.autoStartTimer !== undefined ? Boolean(parsed.autoStartTimer) : true,
        hapticsEnabled: parsed.hapticsEnabled !== undefined ? Boolean(parsed.hapticsEnabled) : true,
        keepScreenAwake: parsed.keepScreenAwake !== undefined ? Boolean(parsed.keepScreenAwake) : true,
        hasCompletedOnboarding: parsed.hasCompletedOnboarding !== undefined ? Boolean(parsed.hasCompletedOnboarding) : false,
        remindersEnabled: parsed.remindersEnabled !== undefined ? Boolean(parsed.remindersEnabled) : false,
        reminderTime: parsed.reminderTime || '08:00',
        audioNotification: parsed.audioNotification || 'default_notification',
        customAudioUri: parsed.customAudioUri || null,
        customAudioName: parsed.customAudioName || '',
        customAudioDuration: Number(parsed.customAudioDuration) || 5,
        customAudioStartOffset: Number(parsed.customAudioStartOffset) || 0,
      });
      return;
    }

    // Backward compatibility: check legacy user-storage
    const lastUserId = await AsyncStorage.getItem('lastActiveUserId');
    if (lastUserId === userId) {
      const legacyRaw = await AsyncStorage.getItem('user-storage');
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw);
        const legacyState = legacyParsed?.state;
        if (legacyState) {
          useUserStore.setState({
            name: legacyState.name || '',
            weeklyGoal: Number(legacyState.weeklyGoal) || 3,
            streak: Number(legacyState.streak) || 0,
            lastWorkoutDate: legacyState.lastWorkoutDate || null,
            theme: legacyState.theme || 'system',
            language: legacyState.language || 'id',
            defaultRestTimer: Number(legacyState.defaultRestTimer) || 90,
            autoStartTimer: legacyState.autoStartTimer !== undefined ? Boolean(legacyState.autoStartTimer) : true,
            hapticsEnabled: legacyState.hapticsEnabled !== undefined ? Boolean(legacyState.hapticsEnabled) : true,
            keepScreenAwake: legacyState.keepScreenAwake !== undefined ? Boolean(legacyState.keepScreenAwake) : true,
            hasCompletedOnboarding: legacyState.hasCompletedOnboarding !== undefined ? Boolean(legacyState.hasCompletedOnboarding) : false,
            remindersEnabled: legacyState.remindersEnabled !== undefined ? Boolean(legacyState.remindersEnabled) : false,
            reminderTime: legacyState.reminderTime || '08:00',
            audioNotification: legacyState.audioNotification || 'default_notification',
            customAudioUri: legacyState.customAudioUri || null,
            customAudioName: legacyState.customAudioName || '',
            customAudioDuration: Number(legacyState.customAudioDuration) || 5,
            customAudioStartOffset: Number(legacyState.customAudioStartOffset) || 0,
          });

          await AsyncStorage.setItem(`user_partition_${userId}`, JSON.stringify(legacyState)).catch(() => {});
          await AsyncStorage.removeItem('user-storage').catch(() => {});
          return;
        }
      }
    }
  } catch (e) {
    console.warn('[UserStore] Error loading user partition:', e);
  }

  // Fresh user: reset profile to clean state
  useUserStore.setState({
    name: '',
    weeklyGoal: 3,
    streak: 0,
    lastWorkoutDate: null,
    theme: 'system',
    language: 'id',
    defaultRestTimer: 90,
    autoStartTimer: true,
    hapticsEnabled: true,
    keepScreenAwake: true,
    hasCompletedOnboarding: false,
    remindersEnabled: false,
    reminderTime: '08:00',
    audioNotification: 'default_notification',
    customAudioUri: null,
    customAudioName: '',
    customAudioDuration: 5,
    customAudioStartOffset: 0,
  });
};

export const unloadUserPartition = async (): Promise<void> => {
  if (activeProfileUserId) {
    const state = useUserStore.getState();
    await AsyncStorage.setItem(
      `user_partition_${activeProfileUserId}`,
      JSON.stringify(serializeUserPartition(state))
    ).catch(() => {});
  }
  activeProfileUserId = null;

  useUserStore.setState({
    name: '',
    weeklyGoal: 3,
    streak: 0,
    lastWorkoutDate: null,
    theme: 'system',
    language: 'id',
    defaultRestTimer: 90,
    autoStartTimer: true,
    hapticsEnabled: true,
    keepScreenAwake: true,
    hasCompletedOnboarding: false,
    remindersEnabled: false,
    reminderTime: '08:00',
    audioNotification: 'default_notification',
    customAudioUri: null,
    customAudioName: '',
    customAudioDuration: 5,
    customAudioStartOffset: 0,
  });
  await AsyncStorage.removeItem('user-storage').catch(() => {});
};
