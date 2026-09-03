import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Play, Activity, Flame, Trophy } from 'lucide-react-native';
import { useUserStore } from '@/store/useUserStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { format, subDays } from 'date-fns';

export default function DashboardScreen() {
  const router = useRouter();
  const userName = useUserStore((state) => state.name);
  const streak = useUserStore((state) => state.streak);
  const sessions = useWorkoutStore((state) => state.sessions);
  const templates = useWorkoutStore((state) => state.templates);
  const colors = useThemeColors();
  const styles = getStyles(colors);

  const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
  const thisWeekSessions = sessions.filter(
    (s) => new Date(s.date) > subDays(new Date(), 7)
  ).length;

  const handleQuickWorkout = () => {
    // For quick workout, we might just start the first template or navigate to workout tab
    router.push('/(tabs)/workout');
  };

  const renderStatsRow = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
          <Activity color="#3b82f6" size={24} />
        </View>
        <Text style={styles.statValue}>{thisWeekSessions}</Text>
        <Text style={styles.statLabel}>This Week</Text>
      </View>
      
      <View style={styles.statCard}>
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(249, 115, 22, 0.2)' }]}>
          <Flame color="#f97316" size={24} />
        </View>
        <Text style={styles.statValue}>{streak}</Text>
        <Text style={styles.statLabel}>Day Streak</Text>
      </View>

      <View style={styles.statCard}>
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
          <Trophy color="#10b981" size={24} />
        </View>
        <Text style={styles.statValue}>{sessions.length}</Text>
        <Text style={styles.statLabel}>Total</Text>
      </View>
    </View>
  );

  const renderRecentActivity = () => {
    if (!lastSession) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No workouts yet</Text>
          <Text style={styles.emptyStateSubtitle}>Your fitness journey starts here.</Text>
        </View>
      );
    }

    const template = templates.find((t) => t.id === lastSession.templateId);

    return (
      <View style={styles.recentCard}>
        <View style={styles.recentHeader}>
          <Text style={styles.recentDate}>{format(new Date(lastSession.date), 'EEEE, MMM do')}</Text>
          <Text style={styles.recentDuration}>
            {Math.round(lastSession.duration / 60)} min
          </Text>
        </View>
        <Text style={styles.recentTitle}>{template?.name || 'Custom Workout'}</Text>
        <Text style={styles.recentSubtitle}>
          {lastSession.completedExercises.length} exercises completed
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroSection}>
          <Text style={styles.greeting}>Hello, {userName}</Text>
          <Text style={styles.subGreeting}>Ready to crush your goals?</Text>
        </View>

        {renderStatsRow()}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {renderRecentActivity()}
        </View>

        {/* Padding for bottom tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button (above navbar) */}
      <TouchableOpacity style={styles.fab} onPress={handleQuickWorkout}>
        <Play color="#fff" size={24} fill="#fff" />
        <Text style={styles.fabText}>Start Quick Workout</Text>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, // slate-900
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
  },
  heroSection: {
    marginBottom: 32,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subGreeting: {
    fontSize: 16,
    color: colors.textSecondary, // slate-400
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card, // slate-800
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  recentCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recentDate: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  recentDuration: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  recentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  recentSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  fab: {
    position: 'absolute',
    bottom: 110, // Above the 72px tab bar + 24px margin
    left: 24,
    right: 24,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
