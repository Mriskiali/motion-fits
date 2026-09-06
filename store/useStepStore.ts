import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StepState {
  todaySteps: number;
  dailyStepGoal: number;
  isPedometerAvailable: boolean;
  stepTrackingEnabled: boolean;
  history: Record<string, number>; // { '2026-09-06': 8540 }
  setDailyStepGoal: (goal: number) => void;
  setStepTrackingEnabled: (enabled: boolean) => void;
  setTodaySteps: (steps: number) => void;
  setIsPedometerAvailable: (available: boolean) => void;
  saveDaySteps: (dateStr: string, steps: number) => void;
}

export const useStepStore = create<StepState>()(
  persist(
    (set, get) => ({
      todaySteps: 0,
      dailyStepGoal: 10000,
      isPedometerAvailable: true,
      stepTrackingEnabled: true,
      history: {},

      setDailyStepGoal: (goal: number) => set({ dailyStepGoal: Math.max(1000, goal) }),
      setStepTrackingEnabled: (enabled: boolean) => set({ stepTrackingEnabled: enabled }),
      setTodaySteps: (steps: number) => set({ todaySteps: Math.max(0, steps) }),
      setIsPedometerAvailable: (available: boolean) => set({ isPedometerAvailable: available }),
      saveDaySteps: (dateStr: string, steps: number) => {
        const history = { ...get().history, [dateStr]: Math.max(0, steps) };
        set({ history });
      },
    }),
    {
      name: 'step-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
