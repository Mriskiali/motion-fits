
import React, { useState, useEffect } from "react";
import { useTheme } from "@react-navigation/native";
import { StyleSheet, View, Text, Platform, ScrollView, TouchableOpacity } from "react-native";
import { Stack } from "expo-router";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CompletedExercise {
  planId: string;
  exerciseId: string;
  date: string;
}

interface DayWorkoutAssignment {
  date: string;
  planId: string | null;
}

interface WorkoutPlan {
  id: string;
  name: string;
  subtitle: string;
  exercises: any[];
  icon: string;
  color: string;
  isCustom?: boolean;
}

const defaultWorkoutPlans: WorkoutPlan[] = [
  {
    id: 'upper1',
    name: 'UPPER',
    subtitle: 'Chest, Shoulder, Triceps',
    icon: 'figure.strengthtraining.traditional',
    color: '#64b5f6',
    exercises: [
      { id: 'u1-1', name: 'Resistance Band Chest Press', sets: '4', reps: '12' },
      { id: 'u1-2', name: 'Incline Push-up / Pike Push-up', sets: '3', reps: '10' },
      { id: 'u1-3', name: 'Single Dumbbell Shoulder Press', sets: '3', reps: '12' },
      { id: 'u1-4', name: 'Resistance Band Lateral Raise', sets: '3', reps: '12–15' },
      { id: 'u1-5', name: 'Single Dumbbell Overhead Tricep Extension', sets: '3', reps: '12' },
      { id: 'u1-6', name: 'Resistance Band Tricep Pushdown', sets: '3', reps: '12' },
      { id: 'u1-7', name: 'Cooldown Cycling', sets: '1', duration: '5–15 minutes light' },
    ],
  },
  {
    id: 'lower',
    name: 'LOWER',
    subtitle: 'Legs + Glutes + Calves',
    icon: 'figure.strengthtraining.functional',
    color: '#aed581',
    exercises: [
      { id: 'l-1', name: 'Goblet Squat (with dumbbell)', sets: '4', reps: '12' },
      { id: 'l-2', name: 'Resistance Band Deadlift / Romanian Deadlift', sets: '3', reps: '12' },
      { id: 'l-3', name: 'Front Lunges', sets: '3', reps: '12' },
      { id: 'l-4', name: 'Glute Bridge', sets: '3', reps: '15' },
      { id: 'l-5', name: 'Standing Calf Raise', sets: '4', reps: '15–20' },
      { id: 'l-6', name: 'Cycling', sets: '1', duration: '10–20 minutes' },
    ],
  },
  {
    id: 'upper2',
    name: 'UPPER',
    subtitle: 'Back, Biceps, Forearm, Core',
    icon: 'figure.core.training',
    color: '#ffb74d',
    exercises: [
      { id: 'u2-1', name: 'Resistance Band Row', sets: '4', reps: '12' },
      { id: 'u2-2', name: 'Resistance Band Face Pull', sets: '3', reps: '12' },
      { id: 'u2-3', name: 'Single Dumbbell Bicep Curl', sets: '3', reps: '12' },
      { id: 'u2-4', name: 'Hammer Curl (alternate dumbbell)', sets: '3', reps: '12' },
      { id: 'u2-5', name: 'Resistance Band Reverse Curl', sets: '3', reps: '12' },
      { id: 'u2-6', name: 'Renegade Row (with dumbbell)', sets: '3', reps: '10' },
      { id: 'u2-7', name: 'Penguin Crunch', sets: '3', reps: '20' },
      { id: 'u2-8', name: 'Plank', sets: '3', duration: '30–45 seconds' },
      { id: 'u2-9', name: 'Hollow Position', sets: '3', duration: '30 seconds' },
      { id: 'u2-10', name: 'Cooldown Cycling', sets: '1', duration: '5–15 minutes easy' },
    ],
  },
];

export default function HomeScreen() {
  const theme = useTheme();
  const [completedExercises, setCompletedExercises] = useState<CompletedExercise[]>([]);
  const [workoutAssignments, setWorkoutAssignments] = useState<DayWorkoutAssignment[]>([]);
  const [customWorkoutPlans, setCustomWorkoutPlans] = useState<WorkoutPlan[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [completedExercises, workoutAssignments]);

  const loadData = async () => {
    try {
      const completedData = await AsyncStorage.getItem('completedExercises');
      const assignmentsData = await AsyncStorage.getItem('workoutAssignments');
      const customPlansData = await AsyncStorage.getItem('customWorkoutPlans');
      
      if (completedData) {
        setCompletedExercises(JSON.parse(completedData));
      }
      
      if (assignmentsData) {
        setWorkoutAssignments(JSON.parse(assignmentsData));
      }

      if (customPlansData) {
        setCustomWorkoutPlans(JSON.parse(customPlansData));
      }
    } catch (error) {
      }
  };

  const getDateString = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getWeekDates = () => {
    const dates: Date[] = [];
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  };

  const getMonthDates = () => {
    const dates: Date[] = [];
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }
    
    return dates;
  };

  const getWorkoutPlans = () => {
    return [...defaultWorkoutPlans, ...customWorkoutPlans];
  };

  const calculateStats = () => {
    const weekDates = getWeekDates();
    const monthDates = getMonthDates();
    
    const weekTotal = getTotalExercisesCompleted(weekDates);
    const monthTotal = getTotalExercisesCompleted(monthDates);
    
    };

  const getTotalExercisesCompleted = (dates: Date[]) => {
    const dateStrings = dates.map(d => getDateString(d));
    return completedExercises.filter(ce => dateStrings.includes(ce.date)).length;
  };

  const getWeeklyPercentage = () => {
    const weekDates = getWeekDates();
    const assignedDays = weekDates.filter(date => {
      const dateStr = getDateString(date);
      return workoutAssignments.some(a => a.date === dateStr && a.planId !== null);
    });
    
    if (assignedDays.length === 0) return 0;
    
    const completedDays = assignedDays.filter(date => {
      const dateStr = getDateString(date);
      const assignment = workoutAssignments.find(a => a.date === dateStr);
      if (!assignment || !assignment.planId) return false;
      
      const plan = getWorkoutPlans().find(p => p.id === assignment.planId);
      if (!plan) return false;
      
      const completedCount = plan.exercises.filter(ex => 
        completedExercises.some(ce => 
          ce.planId === plan.id && ce.exerciseId === ex.id && ce.date === dateStr
        )
      ).length;
      
      return completedCount === plan.exercises.length;
    });
    
    return Math.round((completedDays.length / assignedDays.length) * 100);
  };

  const getMonthlyPercentage = () => {
    const monthDates = getMonthDates();
    const assignedDays = monthDates.filter(date => {
      const dateStr = getDateString(date);
      return workoutAssignments.some(a => a.date === dateStr && a.planId !== null);
    });
    
    if (assignedDays.length === 0) return 0;
    
    const completedDays = assignedDays.filter(date => {
      const dateStr = getDateString(date);
      const assignment = workoutAssignments.find(a => a.date === dateStr);
      if (!assignment || !assignment.planId) return false;
      
      const plan = getWorkoutPlans().find(p => p.id === assignment.planId);
      if (!plan) return false;
      
      const completedCount = plan.exercises.filter(ex => 
        completedExercises.some(ce => 
          ce.planId === plan.id && ce.exerciseId === ex.id && ce.date === dateStr
        )
      ).length;
      
      return completedCount === plan.exercises.length;
    });
    
    return Math.round((completedDays.length / assignedDays.length) * 100);
  };

  const getRecentWorkouts = () => {
    const recentDates = completedExercises
      .map(ce => ce.date)
      .filter((date, index, self) => self.indexOf(date) === index)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .slice(0, 5);
    
    return recentDates.map(dateStr => {
      const assignment = workoutAssignments.find(a => a.date === dateStr);
      const planId = assignment?.planId;
      const plan = planId ? getWorkoutPlans().find(p => p.id === planId) : null;
      
      return {
        date: dateStr,
        planName: plan?.name || 'Unknown',
        planColor: plan?.color || colors.primary,
      };
    });
  };

  const getDaysAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  const getWorkoutName = (planId: string) => {
    const plan = getWorkoutPlans().find(p => p.id === planId);
    return plan?.name || 'Unknown';
  };

  const weeklyPercentage = getWeeklyPercentage();
  const monthlyPercentage = getMonthlyPercentage();
  const recentWorkouts = getRecentWorkouts();
  const weekTotal = getTotalExercisesCompleted(getWeekDates());
  const monthTotal = getTotalExercisesCompleted(getMonthDates());

  return (
    <>
      {Platform.OS === 'ios' && (
        <Stack.Screen
          options={{
            title: "Home",
          }}
        />
      )}
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView 
          contentContainerStyle={[
            styles.scrollContent,
            Platform.OS !== 'ios' && styles.scrollContentWithTabBar
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.subtitle}>Track your fitness progress</Text>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <IconSymbol name="calendar" size={24} color={colors.primary} />
                <Text style={styles.statLabel}>This Week</Text>
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>{weekTotal}</Text>
                <Text style={styles.statUnit}>exercises</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        width: `${weeklyPercentage}%`,
                        backgroundColor: colors.primary 
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>{weeklyPercentage}% complete</Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <IconSymbol name="calendar.badge.clock" size={24} color={colors.secondary} />
                <Text style={styles.statLabel}>This Month</Text>
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>{monthTotal}</Text>
                <Text style={styles.statUnit}>exercises</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        width: `${monthlyPercentage}%`,
                        backgroundColor: colors.secondary 
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>{monthlyPercentage}% complete</Text>
              </View>
            </View>
          </View>

          {/* Recent Activity */}
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {recentWorkouts.length === 0 ? (
              <View style={styles.emptyState}>
                <IconSymbol name="figure.walk" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyStateText}>No recent workouts</Text>
                <Text style={styles.emptyStateSubtext}>
                  Start tracking your workouts to see your progress here
                </Text>
              </View>
            ) : (
              <View style={styles.activityList}>
                {recentWorkouts.map((workout, index) => (
                  <View key={index} style={styles.activityItem}>
                    <View 
                      style={[
                        styles.activityIndicator, 
                        { backgroundColor: workout.planColor }
                      ]} 
                    />
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityName}>{workout.planName}</Text>
                      <Text style={styles.activityDate}>{getDaysAgo(workout.date)}</Text>
                    </View>
                    <IconSymbol name="checkmark.circle.fill" size={24} color={colors.primary} />
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Quick Stats */}
          <View style={styles.quickStatsSection}>
            <Text style={styles.sectionTitle}>Quick Stats</Text>
            <View style={styles.quickStatsGrid}>
              <View style={styles.quickStatCard}>
                <IconSymbol name="flame.fill" size={32} color="#ef5350" />
                <Text style={styles.quickStatValue}>{weekTotal}</Text>
                <Text style={styles.quickStatLabel}>Week Total</Text>
              </View>
              <View style={styles.quickStatCard}>
                <IconSymbol name="chart.bar.fill" size={32} color={colors.accent} />
                <Text style={styles.quickStatValue}>{monthTotal}</Text>
                <Text style={styles.quickStatLabel}>Month Total</Text>
              </View>
              <View style={styles.quickStatCard}>
                <IconSymbol name="star.fill" size={32} color="#ffd700" />
                <Text style={styles.quickStatValue}>{customWorkoutPlans.length}</Text>
                <Text style={styles.quickStatLabel}>Custom Plans</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  scrollContentWithTabBar: {
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  statsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.text,
    marginRight: 8,
  },
  statUnit: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  recentSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  emptyState: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 20,
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  activityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  quickStatsSection: {
    marginBottom: 20,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  quickStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
