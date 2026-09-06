import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import {
  showActiveWorkoutNotification,
  dismissActiveWorkoutNotification,
} from '@/utils/notifications';

/**
 * Hook to monitor application background/foreground transitions
 * and maintain persistent active workout notification while minimized.
 */
export function useWorkoutBackgroundTracker() {
  const activeSession = useWorkoutStore((state) => state.activeSession);
  const templates = useWorkoutStore((state) => state.templates);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const prevAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (prevAppState === 'active' && (nextAppState === 'background' || nextAppState === 'inactive')) {
        // App went to background: show sticky persistent notification if workout is active
        if (activeSession) {
          const currentTemplate = templates.find((t) => t.id === activeSession.templateId);
          const workoutName = currentTemplate?.name || 'Workout';
          showActiveWorkoutNotification(workoutName).catch(() => {});
        }
      } else if ((prevAppState === 'background' || prevAppState === 'inactive') && nextAppState === 'active') {
        // App returned to foreground: dismiss sticky background notification
        dismissActiveWorkoutNotification().catch(() => {});
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // If active workout ends / is cancelled, dismiss notification immediately
    if (!activeSession) {
      dismissActiveWorkoutNotification().catch(() => {});
    }

    return () => {
      subscription.remove();
    };
  }, [activeSession, templates]);
}
