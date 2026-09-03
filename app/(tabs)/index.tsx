import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Play, Activity, Flame, Trophy } from 'lucide-react-native';
import { useUserStore } from '@/store/useUserStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { format, subDays, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useTranslation } from '@/hooks/useTranslation';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function DashboardScreen() {
  const router = useRouter();
  const userName = useUserStore((state) => state.name);
  const streak = useUserStore((state) => state.streak);
  const hapticsEnabled = useUserStore((state) => state.hapticsEnabled);
  const sessions = useWorkoutStore((state) => state.sessions);
  const templates = useWorkoutStore((state) => state.templates);
  const colors = useThemeColors();
  const styles = getStyles(colors);
  const { t, language } = useTranslation();

  const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
  const thisWeekSessions = sessions.filter(
    (s) => new Date(s.date) > subDays(new Date(), 7)
  ).length;

  const handleQuickWorkout = () => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/workout');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return {
        title: t('good_morning'),
        subtitle: t('good_morning_sub'),
      };
    } else if (hour < 18) {
      return {
        title: t('good_afternoon'),
        subtitle: t('good_afternoon_sub'),
      };
    } else {
      return {
        title: t('good_evening'),
        subtitle: t('good_evening_sub'),
      };
    }
  };

  const greeting = getGreeting();

  const renderStatsRow = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(0, 229, 255, 0.2)' }]}>
          <Activity color={colors.accent} size={24} />
        </View>
        <Text style={styles.statValue}>{thisWeekSessions}</Text>
        <Text style={styles.statLabel}>{t('this_week')}</Text>
      </View>
      
      <View style={styles.statCard}>
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 184, 0, 0.2)' }]}>
          <Flame color={colors.warning} size={24} />
        </View>
        <Text style={styles.statValue}>{streak}</Text>
        <Text style={styles.statLabel}>{t('day_streak')}</Text>
      </View>

      <View style={styles.statCard}>
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(204, 255, 0, 0.2)' }]}>
          <Trophy color={colors.primary} size={24} />
        </View>
        <Text style={styles.statValue}>{sessions.length}</Text>
        <Text style={styles.statLabel}>{t('total')}</Text>
      </View>
    </View>
  );

  const renderCalendarStrip = () => {
    const startDate = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
    const days = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

    return (
      <View style={styles.calendarStrip}>
        {days.map((day, idx) => {
          const isCurrentDay = isToday(day);
          const hasWorkout = sessions.some(s => isSameDay(new Date(s.date), day));
          
          return (
            <View key={idx} style={styles.calendarDay}>
              <Text style={[styles.calendarDayText, isCurrentDay && { color: colors.primary }]}>
                {format(day, 'EEE', { locale: language === 'id' ? idLocale : undefined }).substring(0, 3)}
              </Text>
              <View style={[
                styles.calendarDot,
                hasWorkout ? { backgroundColor: colors.primary } : { backgroundColor: colors.border },
                isCurrentDay && !hasWorkout && { borderWidth: 2, borderColor: colors.primary, backgroundColor: 'transparent' }
              ]} />
            </View>
          );
        })}
      </View>
    );
  };

  const renderRecentActivity = () => {
    if (!lastSession) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>{t('no_workouts_yet')}</Text>
        </View>
      );
    }

    const template = templates.find((t) => t.id === lastSession.templateId);

    return (
      <View style={styles.recentCard}>
        <View style={styles.recentHeader}>
          <Text style={styles.recentDate}>
            {format(new Date(lastSession.date), 'EEEE, d MMM', { locale: language === 'id' ? idLocale : undefined })}
          </Text>
          <Text style={styles.recentDuration}>
            {Math.round(lastSession.duration / 60)} {t('min_short')}
          </Text>
        </View>
        <Text style={styles.recentTitle}>{template?.name || t('custom_workout')}</Text>
        <Text style={styles.recentSubtitle}>
          {lastSession.completedExercises.length} {t('exercises_completed')}
        </Text>
      </View>
    );
  };

  // Fab Animation
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Top Header */}
        <View style={styles.heroSection}>
          <View style={styles.streakBadge}>
            <Flame color={colors.warning} size={16} />
            <Text style={styles.streakBadgeText}>{streak} {t('day_streak')}</Text>
          </View>
          <Text style={styles.greeting}>{greeting.title}</Text>
          <Text style={styles.subGreeting}>{greeting.subtitle}</Text>
        </View>

        {renderCalendarStrip()}

        {renderStatsRow()}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('recent_activity')}</Text>
          {renderRecentActivity()}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <AnimatedPressable 
        style={[styles.fab, animatedStyle]} 
        onPressIn={() => { scale.value = withSpring(0.96) }}
        onPressOut={() => { scale.value = withSpring(1) }}
        onPress={handleQuickWorkout}
      >
        <Play color={colors.textPrimaryOnVolt || '#000'} size={24} fill={colors.textPrimaryOnVolt || '#000'} />
        <Text style={styles.fabText}>{t('start_workout')}</Text>
      </AnimatedPressable>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, 
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
  },
  heroSection: {
    marginBottom: 24,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  streakBadgeText: {
    color: colors.warning,
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 14,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subGreeting: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  calendarStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calendarDay: {
    alignItems: 'center',
    gap: 8,
  },
  calendarDayText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  calendarDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card, 
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptyState: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  recentCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
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
    color: colors.accent,
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
    bottom: 110, 
    left: 24,
    right: 24,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 100,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: {
    color: colors.textPrimaryOnVolt || '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    textTransform: 'uppercase',
  },
});
