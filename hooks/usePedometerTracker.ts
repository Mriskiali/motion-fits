import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Pedometer } from 'expo-sensors';
import { useStepStore } from '@/store/useStepStore';
import { format } from 'date-fns';

export function usePedometerTracker() {
  const {
    todaySteps,
    dailyStepGoal,
    isPedometerAvailable,
    stepTrackingEnabled,
    setTodaySteps,
    setIsPedometerAvailable,
    saveDaySteps,
  } = useStepStore();

  const subscriptionRef = useRef<Pedometer.Subscription | null>(null);
  const baseStepsRef = useRef<number>(todaySteps);

  useEffect(() => {
    baseStepsRef.current = todaySteps;
  }, [todaySteps]);

  const stopTracker = () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
  };

  const initTracker = async () => {
    if (!useStepStore.getState().stepTrackingEnabled) {
      stopTracker();
      return;
    }

    try {
      const isAvailable = await Pedometer.isAvailableAsync();
      setIsPedometerAvailable(isAvailable);

      if (!isAvailable) {
        stopTracker();
        return;
      }

      const perm = await Pedometer.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        setIsPedometerAvailable(false);
        stopTracker();
        return;
      }

      setIsPedometerAvailable(true);

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

      // 1. Fetch today's historical steps from hardware sensor (00:00 to now)
      try {
        const result = await Pedometer.getStepCountAsync(startOfDay, now);
        if (result && typeof result.steps === 'number') {
          const todayStr = format(now, 'yyyy-MM-dd');
          baseStepsRef.current = result.steps;
          setTodaySteps(result.steps);
          saveDaySteps(todayStr, result.steps);
        }
      } catch (err) {
        console.log('getStepCountAsync fallback to live listener:', err);
      }

      // 2. Start hardware live step listener
      stopTracker();

      if (!useStepStore.getState().stepTrackingEnabled) return;

      const initialBase = baseStepsRef.current;
      subscriptionRef.current = Pedometer.watchStepCount((result) => {
        if (!useStepStore.getState().stepTrackingEnabled) {
          stopTracker();
          return;
        }
        if (result && typeof result.steps === 'number') {
          const updatedSteps = initialBase + result.steps;
          const todayStr = format(new Date(), 'yyyy-MM-dd');
          setTodaySteps(updatedSteps);
          saveDaySteps(todayStr, updatedSteps);
        }
      });
    } catch (e) {
      console.warn('Pedometer initialization error:', e);
      setIsPedometerAvailable(false);
      stopTracker();
    }
  };

  useEffect(() => {
    if (!stepTrackingEnabled) {
      stopTracker();
      return;
    }

    initTracker();

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && useStepStore.getState().stepTrackingEnabled) {
        initTracker();
      }
    };

    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      stopTracker();
      appStateSub.remove();
    };
  }, [stepTrackingEnabled]);

  // Derived metrics:
  // Average stride length: ~0.75m -> 1 step ~= 0.00075 km
  const distanceKm = Number((todaySteps * 0.00075).toFixed(2));
  // Average calories: ~0.04 kcal per step
  const caloriesBurned = Math.round(todaySteps * 0.04);
  const goalProgress = dailyStepGoal > 0 ? Math.min(1, todaySteps / dailyStepGoal) : 0;
  const goalPercent = Math.round(goalProgress * 100);

  return {
    todaySteps,
    dailyStepGoal,
    distanceKm,
    caloriesBurned,
    goalProgress,
    goalPercent,
    isPedometerAvailable,
    stepTrackingEnabled,
    refreshSteps: initTracker,
  };
}
