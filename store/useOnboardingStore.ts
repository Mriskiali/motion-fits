import { create } from 'zustand';
import { useUserStore } from './useUserStore';
import { useWorkoutStore } from './useWorkoutStore';

export type OnboardingStep =
  | 'idle'
  | 'welcome'
  | 'dashboard_overview'
  | 'workout_planner'
  | 'active_session'
  | 'rest_timer'
  | 'history_analytics'
  | 'completed';

interface OnboardingState {
  currentStep: OnboardingStep;
  isTourActive: boolean;
  startTour: () => void;
  setStep: (step: OnboardingStep) => void;
  nextStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  currentStep: 'idle',
  isTourActive: false,

  startTour: () => {
    // Auto-schedule default template if none scheduled for today so "Mulai Latihan" is ready
    const todayStr = new Date().toISOString().split('T')[0];
    const workoutStore = useWorkoutStore.getState();
    if (!workoutStore.scheduledWorkouts[todayStr] && workoutStore.templates.length > 0) {
      workoutStore.scheduleWorkout(todayStr, workoutStore.templates[0].id);
    }
    set({ currentStep: 'dashboard_overview', isTourActive: true });
  },

  setStep: (step) => set({ currentStep: step, isTourActive: step !== 'idle' && step !== 'completed' }),

  nextStep: () => {
    const { currentStep } = get();
    if (currentStep === 'welcome') {
      get().startTour();
    } else if (currentStep === 'dashboard_overview') {
      set({ currentStep: 'workout_planner' });
    } else if (currentStep === 'workout_planner') {
      set({ currentStep: 'active_session' });
    } else if (currentStep === 'active_session') {
      set({ currentStep: 'rest_timer' });
    } else if (currentStep === 'rest_timer') {
      set({ currentStep: 'history_analytics' });
    } else if (currentStep === 'history_analytics') {
      get().completeTour();
    }
  },

  skipTour: () => {
    useUserStore.getState().setHasCompletedOnboarding(true);
    set({ currentStep: 'idle', isTourActive: false });
  },

  completeTour: () => {
    useUserStore.getState().setHasCompletedOnboarding(true);
    set({ currentStep: 'completed', isTourActive: false });
  },
}));
