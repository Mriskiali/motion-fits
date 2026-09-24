import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useWorkoutStore, flushWorkoutPartition } from '@/store/useWorkoutStore';
import { flushStepPartition } from '@/store/useStepStore';
import { flushUserPartition } from '@/store/useUserStore';
import {
  showActiveWorkoutNotification,
  dismissActiveWorkoutNotification,
} from '@/utils/notifications';

/**
 * Hook to monitor application background/foreground transitions
 * and maintain persistent active workout notification while minimized.
 */
export function useWorkoutBackgroundTracker() {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // NOTE: This hook lives in the app root (RootLayoutNav). It must NOT subscribe
  // reactively to activeSession/templates — an active workout updates activeSession
  // every second, which would re-render the entire app tree on each tick. Instead we
  // read the latest state imperatively from the store inside the handler.
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const prevAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (prevAppState === 'active' && (nextAppState === 'background' || nextAppState === 'inactive')) {
        // Flush any pending debounced partition writes so nothing is lost if the OS
        // kills the app while backgrounded.
        flushWorkoutPartition();
        flushStepPartition();
        flushUserPartition();

        // App went to background: show sticky persistent notification if workout is active
        const { activeSession, templates } = useWorkoutStore.getState();
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

    // If there is no active workout at mount, make sure no stale notification lingers.
    if (!useWorkoutStore.getState().activeSession) {
      dismissActiveWorkoutNotification().catch(() => {});
    }

    return () => {
      subscription.remove();
    };
  }, []);
}
