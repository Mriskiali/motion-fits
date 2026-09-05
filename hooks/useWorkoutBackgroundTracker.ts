import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useWorkoutStore } from '@/store/useWorkoutStore';

/**
 * Hook to monitor application background/foreground transitions
 * and maintain workout session state integrity across app switches.
 */
export function useWorkoutBackgroundTracker() {
  const activeSession = useWorkoutStore((state) => state.activeSession);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const backgroundTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const prevAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (prevAppState === 'active' && (nextAppState === 'background' || nextAppState === 'inactive')) {
        // App went to background
        if (activeSession) {
          backgroundTimeRef.current = Date.now();
        }
      } else if ((prevAppState === 'background' || prevAppState === 'inactive') && nextAppState === 'active') {
        // App returned to foreground
        if (activeSession && backgroundTimeRef.current) {
          const backgroundDuration = Math.floor((Date.now() - backgroundTimeRef.current) / 1000);
          backgroundTimeRef.current = null;
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [activeSession]);
}
