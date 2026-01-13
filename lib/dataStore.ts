import AsyncStorage from '@react-native-async-storage/async-storage';

// Define types for our data
export type CompletedExercise = {
  planId: string;
  exerciseId: string;
  date: string;
};

export type DayWorkoutAssignment = {
  date: string;
  planId: string | null;
};

export type ExerciseSetCount = {
  planId: string;
  exerciseId: string;
  date: string;
  count: number;
};

export type RestTimer = {
  planId: string;
  exerciseId: string;
  date: string;
  endsAt: number;
  durationSec: number;
  notified?: boolean;
};

export type SetLog = {
  planId: string;
  exerciseId: string;
  date: string;
  setIndex: number;
  weight: number;
  reps: number;
};

export type PersonalBest = {
  exerciseId: string;
  name: string;
  metric: '1RM';
  value: number;
};

export type SessionExercise = {
  exerciseId: string;
  name: string;
  targetSets: number;
  completedSets: number;
  completed: boolean;
};

export type WorkoutSession = {
  id: string;
  date: string;
  planId: string;
  planName: string;
  color: string;
  startedAt: number;
  endedAt: number;
  durationSec: number;
  exercises: SessionExercise[];
  completionPercent: number;
  totalSets: number;
  restCount?: number;
  restAvgSec?: number;
  setLogs?: SetLog[];
  newPBs?: PersonalBest[];
};

export type WorkoutPlan = {
  id: string;
  name: string;
  subtitle: string;
  exercises: any[];
  icon: string;
  color: string;
  isCustom?: boolean;
};

// Data store class to encapsulate AsyncStorage operations
class DataStore {
  // Keys for AsyncStorage
  private readonly COMPLETED_EXERCISES_KEY = 'completedExercises';
  private readonly WORKOUT_ASSIGNMENTS_KEY = 'workoutAssignments';
  private readonly CUSTOM_WORKOUT_PLANS_KEY = 'customWorkoutPlans';
  private readonly EXERCISE_SET_COUNTS_KEY = 'exerciseSetCounts';
  private readonly REST_TIMERS_KEY = 'restTimers';
  private readonly SET_LOGS_KEY = 'setLogs';
  private readonly WORKOUT_SESSIONS_KEY = 'workoutSessions';
  private readonly REST_DEFAULT_SEC_KEY = 'restDefaultSec';
  private readonly AUTO_REST_INCREMENT_KEY = 'autoRestOnIncrement_v1';
  private readonly ONBOARDING_SEEN_KEY = 'onb_workout_seen_v1';
  private readonly GOALS_SETTINGS_KEY = 'goalsSettings_v1';
  private readonly HISTORY_SETTINGS_KEY = 'historySettings_v1';
  private readonly FITNESS_GOALS_KEY = 'fitnessGoals';

  // Completed Exercises
  async getCompletedExercises(): Promise<CompletedExercise[]> {
    try {
      const data = await AsyncStorage.getItem(this.COMPLETED_EXERCISES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting completed exercises:', error);
      return [];
    }
  }

  async setCompletedExercises(exercises: CompletedExercise[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.COMPLETED_EXERCISES_KEY, JSON.stringify(exercises));
    } catch (error) {
      console.error('Error setting completed exercises:', error);
    }
  }

  // Workout Assignments
  async getWorkoutAssignments(): Promise<DayWorkoutAssignment[]> {
    try {
      const data = await AsyncStorage.getItem(this.WORKOUT_ASSIGNMENTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting workout assignments:', error);
      return [];
    }
  }

  async setWorkoutAssignments(assignments: DayWorkoutAssignment[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.WORKOUT_ASSIGNMENTS_KEY, JSON.stringify(assignments));
    } catch (error) {
      console.error('Error setting workout assignments:', error);
    }
  }

  // Custom Workout Plans
  async getCustomWorkoutPlans(): Promise<WorkoutPlan[]> {
    try {
      const data = await AsyncStorage.getItem(this.CUSTOM_WORKOUT_PLANS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting custom workout plans:', error);
      return [];
    }
  }

  async setCustomWorkoutPlans(plans: WorkoutPlan[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.CUSTOM_WORKOUT_PLANS_KEY, JSON.stringify(plans));
    } catch (error) {
      console.error('Error setting custom workout plans:', error);
    }
  }

  // Exercise Set Counts
  async getExerciseSetCounts(): Promise<ExerciseSetCount[]> {
    try {
      const data = await AsyncStorage.getItem(this.EXERCISE_SET_COUNTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting exercise set counts:', error);
      return [];
    }
  }

  async setExerciseSetCounts(counts: ExerciseSetCount[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.EXERCISE_SET_COUNTS_KEY, JSON.stringify(counts));
    } catch (error) {
      console.error('Error setting exercise set counts:', error);
    }
  }

  // Rest Timers
  async getRestTimers(): Promise<RestTimer[]> {
    try {
      const data = await AsyncStorage.getItem(this.REST_TIMERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting rest timers:', error);
      return [];
    }
  }

  async setRestTimers(timers: RestTimer[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.REST_TIMERS_KEY, JSON.stringify(timers));
    } catch (error) {
      console.error('Error setting rest timers:', error);
    }
  }

  // Set Logs
  async getSetLogs(): Promise<SetLog[]> {
    try {
      const data = await AsyncStorage.getItem(this.SET_LOGS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting set logs:', error);
      return [];
    }
  }

  async setSetLogs(logs: SetLog[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.SET_LOGS_KEY, JSON.stringify(logs));
    } catch (error) {
      console.error('Error setting set logs:', error);
    }
  }

  // Workout Sessions
  async getWorkoutSessions(): Promise<WorkoutSession[]> {
    try {
      const data = await AsyncStorage.getItem(this.WORKOUT_SESSIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting workout sessions:', error);
      return [];
    }
  }

  async setWorkoutSessions(sessions: WorkoutSession[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.WORKOUT_SESSIONS_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('Error setting workout sessions:', error);
    }
  }

  // Rest Default Seconds
  async getRestDefaultSec(): Promise<number> {
    try {
      const data = await AsyncStorage.getItem(this.REST_DEFAULT_SEC_KEY);
      return data ? JSON.parse(data) : 60;
    } catch (error) {
      console.error('Error getting rest default seconds:', error);
      return 60;
    }
  }

  async setRestDefaultSec(seconds: number): Promise<void> {
    try {
      await AsyncStorage.setItem(this.REST_DEFAULT_SEC_KEY, JSON.stringify(seconds));
    } catch (error) {
      console.error('Error setting rest default seconds:', error);
    }
  }

  // Auto Rest on Increment
  async getAutoRestOnIncrement(): Promise<boolean> {
    try {
      const data = await AsyncStorage.getItem(this.AUTO_REST_INCREMENT_KEY);
      return data !== null ? JSON.parse(data) : true;
    } catch (error) {
      console.error('Error getting auto rest on increment:', error);
      return true;
    }
  }

  async setAutoRestOnIncrement(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(this.AUTO_REST_INCREMENT_KEY, JSON.stringify(enabled));
    } catch (error) {
      console.error('Error setting auto rest on increment:', error);
    }
  }

  // Onboarding Seen
  async getOnboardingSeen(): Promise<boolean> {
    try {
      const data = await AsyncStorage.getItem(this.ONBOARDING_SEEN_KEY);
      return data !== null ? JSON.parse(data) : false;
    } catch (error) {
      console.error('Error getting onboarding seen status:', error);
      return false;
    }
  }

  async setOnboardingSeen(seen: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(this.ONBOARDING_SEEN_KEY, JSON.stringify(seen));
    } catch (error) {
      console.error('Error setting onboarding seen status:', error);
    }
  }

  // Goals Settings
  async getGoalsSettings(): Promise<any> {
    try {
      const data = await AsyncStorage.getItem(this.GOALS_SETTINGS_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting goals settings:', error);
      return null;
    }
  }

  async setGoalsSettings(settings: any): Promise<void> {
    try {
      await AsyncStorage.setItem(this.GOALS_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error setting goals settings:', error);
    }
  }

  // History Settings
  async getHistorySettings(): Promise<any> {
    try {
      const data = await AsyncStorage.getItem(this.HISTORY_SETTINGS_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting history settings:', error);
      return null;
    }
  }

  async setHistorySettings(settings: any): Promise<void> {
    try {
      await AsyncStorage.setItem(this.HISTORY_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error setting history settings:', error);
    }
  }

  // Fitness Goals
  async getFitnessGoals(): Promise<any> {
    try {
      const data = await AsyncStorage.getItem(this.FITNESS_GOALS_KEY);
      return data ? JSON.parse(data) : { weeklyTarget: 3 }; // Default to 3 workouts per week
    } catch (error) {
      console.error('Error getting fitness goals:', error);
      return { weeklyTarget: 3 };
    }
  }

  async setFitnessGoals(goals: any): Promise<void> {
    try {
      await AsyncStorage.setItem(this.FITNESS_GOALS_KEY, JSON.stringify(goals));
    } catch (error) {
      console.error('Error setting fitness goals:', error);
    }
  }

  // Clear all data (for debugging purposes)
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.COMPLETED_EXERCISES_KEY,
        this.WORKOUT_ASSIGNMENTS_KEY,
        this.CUSTOM_WORKOUT_PLANS_KEY,
        this.EXERCISE_SET_COUNTS_KEY,
        this.REST_TIMERS_KEY,
        this.SET_LOGS_KEY,
        this.WORKOUT_SESSIONS_KEY,
        this.REST_DEFAULT_SEC_KEY,
        this.AUTO_REST_INCREMENT_KEY,
        this.ONBOARDING_SEEN_KEY,
        this.GOALS_SETTINGS_KEY,
        this.HISTORY_SETTINGS_KEY,
        this.FITNESS_GOALS_KEY,
      ]);
    } catch (error) {
      console.error('Error clearing all data:', error);
    }
  }
}

// Export a singleton instance
export const dataStore = new DataStore();