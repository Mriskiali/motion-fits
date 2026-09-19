import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  checkHealthConnectAvailability,
  checkStepPermissionGranted,
  requestStepPermissionSafe,
  fetchTodayStepsFromHealthConnect,
  fetchStepsHistoryFromHealthConnect,
  HealthConnectAvailability,
} from '../utils/healthConnect';

export interface StepMilestoneData {
  type: 50 | 100;
  steps: number;
  goal: number;
  percent: number;
  distanceKm: string;
  caloriesKcal: number;
}

interface StepState {
  isAvailable: boolean;
  availabilityStatus: HealthConnectAvailability;
  isConnected: boolean;
  todaySteps: number;
  dailyStepGoal: number;
  lastSyncTime: number | null;
  isSyncing: boolean;
  stepHistory: Record<string, number>; // dateStr 'YYYY-MM-DD' -> steps
  activeMilestone: StepMilestoneData | null;
  lastCelebratedDate: string | null;
  lastCelebratedLevel: number; // 0, 50, or 100

  // Actions
  checkStatus: () => Promise<void>;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  syncSteps: () => Promise<number>;
  fetchHistory: (days?: number) => Promise<void>;
  setDailyStepGoal: (goal: number) => void;
  setTodayStepsManual: (steps: number) => void;
  recordDailyStep: (dateStr: string, steps: number) => void;
  checkMilestones: (steps: number, goal: number) => void;
  dismissMilestone: () => void;
}

export const useStepStore = create<StepState>()((set, get) => ({
      isAvailable: false,
      availabilityStatus: 'unavailable',
      isConnected: false,
      todaySteps: 0,
      dailyStepGoal: 10000,
      lastSyncTime: null,
      isSyncing: false,
      stepHistory: {},
      activeMilestone: null,
      lastCelebratedDate: null,
      lastCelebratedLevel: 0,

      checkStatus: async () => {
        const availability = await checkHealthConnectAvailability();
        const isAvailable = availability.available;
        let isConnected = get().isConnected;

        if (isAvailable && isConnected) {
          const hasPerm = await checkStepPermissionGranted();
          isConnected = hasPerm;
        }

        set({
          isAvailable,
          availabilityStatus: availability.status,
          isConnected,
        });

        if (isConnected) {
          get().syncSteps();
          get().fetchHistory(14);
        }
      },

      connect: async () => {
        set({ isSyncing: true });
        try {
          const granted = await requestStepPermissionSafe();
          if (granted) {
            set({ isConnected: true, isSyncing: false });
            await get().syncSteps();
            get().fetchHistory(14);
            return true;
          } else {
            set({ isConnected: false, isSyncing: false });
            return false;
          }
        } catch {
          set({ isSyncing: false });
          return false;
        }
      },

      disconnect: () => {
        set({ isConnected: false });
      },

      syncSteps: async () => {
        if (!get().isConnected) return get().todaySteps;

        set({ isSyncing: true });
        try {
          const steps = await fetchTodayStepsFromHealthConnect();
          const now = new Date();
          const y = now.getFullYear();
          const m = String(now.getMonth() + 1).padStart(2, '0');
          const d = String(now.getDate()).padStart(2, '0');
          const todayKey = `${y}-${m}-${d}`;

          set((state) => ({
            todaySteps: steps,
            lastSyncTime: Date.now(),
            isSyncing: false,
            stepHistory: {
              ...state.stepHistory,
              [todayKey]: steps,
            },
          }));
          get().checkMilestones(steps, get().dailyStepGoal);
          return steps;
        } catch {
          set({ isSyncing: false });
          return get().todaySteps;
        }
      },

      fetchHistory: async (days: number = 14) => {
        if (!get().isConnected) return;
        try {
          const hist = await fetchStepsHistoryFromHealthConnect(days);
          if (hist && Object.keys(hist).length > 0) {
            set((state) => ({
              stepHistory: {
                ...state.stepHistory,
                ...hist,
              },
            }));
          }
        } catch (e) {
          console.warn('Failed to fetch historical steps in store:', e);
        }
      },

      setDailyStepGoal: (goal: number) => {
        const nextGoal = Math.max(1000, goal);
        set({ dailyStepGoal: nextGoal });
        get().checkMilestones(get().todaySteps, nextGoal);
      },

      setTodayStepsManual: (steps: number) => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const todayKey = `${y}-${m}-${d}`;

        set((state) => ({
          todaySteps: steps,
          lastSyncTime: Date.now(),
          stepHistory: {
            ...state.stepHistory,
            [todayKey]: steps,
          },
        }));
        get().checkMilestones(steps, get().dailyStepGoal);
      },

      recordDailyStep: (dateStr: string, steps: number) => {
        set((state) => ({
          stepHistory: {
            ...state.stepHistory,
            [dateStr]: steps,
          },
        }));
      },

      checkMilestones: (steps: number, goal: number) => {
        if (goal <= 0 || steps <= 0) return;
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const lastDate = get().lastCelebratedDate;
        const lastLevel = lastDate === todayStr ? get().lastCelebratedLevel : 0;

        const percent = Math.round((steps / goal) * 100);
        const distanceKm = (steps * 0.00075).toFixed(2);
        const caloriesKcal = Math.round(steps * 0.04);

        if (steps >= goal && lastLevel < 100) {
          set({
            activeMilestone: {
              type: 100,
              steps,
              goal,
              percent,
              distanceKm,
              caloriesKcal,
            },
            lastCelebratedDate: todayStr,
            lastCelebratedLevel: 100,
          });
        } else if (steps >= goal * 0.5 && lastLevel < 50) {
          set({
            activeMilestone: {
              type: 50,
              steps,
              goal,
              percent,
              distanceKm,
              caloriesKcal,
            },
            lastCelebratedDate: todayStr,
            lastCelebratedLevel: 50,
          });
        }
      },

      dismissMilestone: () => {
        set({ activeMilestone: null });
      },
    })
);

let activeStepUserId: string | null = null;

// Reactive subscriber: automatically saves steps into the active user's partition
useStepStore.subscribe((state) => {
  if (activeStepUserId) {
    const partition = {
      isConnected: state.isConnected,
      todaySteps: state.todaySteps,
      dailyStepGoal: state.dailyStepGoal,
      lastSyncTime: state.lastSyncTime,
      stepHistory: state.stepHistory,
      lastCelebratedDate: state.lastCelebratedDate,
      lastCelebratedLevel: state.lastCelebratedLevel,
    };
    AsyncStorage.setItem(`step_partition_${activeStepUserId}`, JSON.stringify(partition)).catch(() => {});
  }
});

export const loadStepPartition = async (userId: string): Promise<void> => {
  if (activeStepUserId === userId) return;

  if (activeStepUserId && activeStepUserId !== userId) {
    const state = useStepStore.getState();
    await AsyncStorage.setItem(
      `step_partition_${activeStepUserId}`,
      JSON.stringify({
        isConnected: state.isConnected,
        todaySteps: state.todaySteps,
        dailyStepGoal: state.dailyStepGoal,
        lastSyncTime: state.lastSyncTime,
        stepHistory: state.stepHistory,
        lastCelebratedDate: state.lastCelebratedDate,
        lastCelebratedLevel: state.lastCelebratedLevel,
      })
    ).catch(() => {});
  }

  activeStepUserId = userId;

  try {
    const raw = await AsyncStorage.getItem(`step_partition_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      useStepStore.setState({
        isConnected: Boolean(parsed.isConnected),
        todaySteps: Number(parsed.todaySteps) || 0,
        dailyStepGoal: Number(parsed.dailyStepGoal) || 10000,
        lastSyncTime: parsed.lastSyncTime || null,
        stepHistory: parsed.stepHistory || {},
        lastCelebratedDate: parsed.lastCelebratedDate || null,
        lastCelebratedLevel: Number(parsed.lastCelebratedLevel) || 0,
        activeMilestone: null,
      });
      return;
    }

    // Backward compatibility: If no partition yet, check if legacy step-storage belongs to this user
    const lastUserId = await AsyncStorage.getItem('lastActiveUserId');
    if (lastUserId === userId) {
      const legacyRaw = await AsyncStorage.getItem('step-storage');
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw);
        const legacyState = legacyParsed?.state;
        if (legacyState) {
          useStepStore.setState({
            isConnected: Boolean(legacyState.isConnected),
            todaySteps: Number(legacyState.todaySteps) || 0,
            dailyStepGoal: Number(legacyState.dailyStepGoal) || 10000,
            lastSyncTime: legacyState.lastSyncTime || null,
            stepHistory: legacyState.stepHistory || {},
            lastCelebratedDate: legacyState.lastCelebratedDate || null,
            lastCelebratedLevel: Number(legacyState.lastCelebratedLevel) || 0,
            activeMilestone: null,
          });

          await AsyncStorage.setItem(`step_partition_${userId}`, JSON.stringify(legacyState)).catch(() => {});
          await AsyncStorage.removeItem('step-storage').catch(() => {});
          return;
        }
      }
    }
  } catch (e) {
    console.warn('[StepStore] Error loading user partition:', e);
  }

  // Fresh user: reset steps
  useStepStore.setState({
    todaySteps: 0,
    dailyStepGoal: 10000,
    lastSyncTime: null,
    stepHistory: {},
    activeMilestone: null,
    lastCelebratedDate: null,
    lastCelebratedLevel: 0,
  });
};

export const unloadStepPartition = async (): Promise<void> => {
  if (activeStepUserId) {
    const state = useStepStore.getState();
    await AsyncStorage.setItem(
      `step_partition_${activeStepUserId}`,
      JSON.stringify({
        isConnected: state.isConnected,
        todaySteps: state.todaySteps,
        dailyStepGoal: state.dailyStepGoal,
        lastSyncTime: state.lastSyncTime,
        stepHistory: state.stepHistory,
        lastCelebratedDate: state.lastCelebratedDate,
        lastCelebratedLevel: state.lastCelebratedLevel,
      })
    ).catch(() => {});
  }
  activeStepUserId = null;

  useStepStore.setState({
    todaySteps: 0,
    dailyStepGoal: 10000,
    lastSyncTime: null,
    stepHistory: {},
    activeMilestone: null,
    lastCelebratedDate: null,
    lastCelebratedLevel: 0,
  });
  await AsyncStorage.removeItem('step-storage').catch(() => {});
};
