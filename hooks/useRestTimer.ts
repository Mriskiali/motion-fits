import { useState, useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { useUserStore } from '../store/useUserStore';

export function useRestTimer() {
  const { defaultRestTimer, hapticsEnabled } = useUserStore();
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(defaultRestTimer);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = (duration?: number) => {
    setTimeLeft(duration ?? defaultRestTimer);
    setIsActive(true);
  };

  const stopTimer = () => {
    setIsActive(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const addTime = (seconds: number) => {
    setTimeLeft((prev) => prev + seconds);
  };

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopTimer();
            if (hapticsEnabled) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            return 0;
          }
          
          if (prev <= 4 && hapticsEnabled) {
            // Pulse at 3, 2, 1 seconds left
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          }
          
          return prev - 1;
        });
      }, 1000);
    } else if (!isActive && intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, hapticsEnabled, timeLeft]);

  return {
    isActive,
    timeLeft,
    startTimer,
    stopTimer,
    addTime,
    setIsActive
  };
}
