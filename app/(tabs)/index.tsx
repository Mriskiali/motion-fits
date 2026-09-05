import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format, startOfWeek, addDays, isSameDay, subDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useUserStore } from '@/store/useUserStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { ThemeColors } from '@/constants/theme';

export default function DashboardScreen() {
  const router = useRouter();
  const streak = useUserStore((state) => state.streak);
  const weeklyGoal = useUserStore((state) => state.weeklyGoal);
  const hapticsEnabled = useUserStore((state) => state.hapticsEnabled);
  const sessions = useWorkoutStore((state) => state.sessions);
  const templates = useWorkoutStore((state) => state.templates);
  const colors = useThemeColors();
  const styles = getStyles(colors);
  const { t, language } = useTranslation();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Week Days (Mon - Sun)
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  // Compute Real This-Week Workout Stats
  const thisWeekSessions = useMemo(() => {
    return sessions.filter((s) => new Date(s.date) > subDays(new Date(), 7));
  }, [sessions]);

  const thisWeekSessionsCount = thisWeekSessions.length;

  const thisWeekTotalMinutes = useMemo(() => {
    const totalSecs = thisWeekSessions.reduce((acc, s) => acc + (s.duration || 0), 0);
    return Math.round(totalSecs / 60);
  }, [thisWeekSessions]);

  const thisWeekSetsCount = useMemo(() => {
    return thisWeekSessions.reduce((acc, s) => {
      const exerciseSets = s.completedExercises?.reduce(
        (sub, ex) => sub + (ex.completedSets?.length || 0),
        0
      ) || 0;
      return acc + exerciseSets;
    }, 0);
  }, [thisWeekSessions]);

  const thisWeekAvgDuration = useMemo(() => {
    if (thisWeekSessionsCount === 0) return 0;
    return Math.round(thisWeekTotalMinutes / thisWeekSessionsCount);
  }, [thisWeekTotalMinutes, thisWeekSessionsCount]);

  // Last Completed Session
  const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
  const lastSessionTemplate = lastSession
    ? templates.find((t) => t.id === lastSession.templateId)
    : null;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('good_morning');
    if (hour < 18) return t('good_afternoon');
    return t('good_evening');
  };

  const handleStartWorkout = () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/(tabs)/workout');
  };

  // Weekly Goal Progress Percent
  const goalPercent = Math.min(100, Math.round((thisWeekSessionsCount / (weeklyGoal || 3)) * 100));

  return (
    <View style={styles.canvasContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Header (Clean Greeting & Full Date, No Month Button, No Avatar) */}
        <View style={styles.headerBar}>
          <Text style={styles.greetingTitle}>{getGreeting()}</Text>
          <Text style={styles.dateSubtitle}>
            {format(selectedDate, 'EEEE, d MMMM yyyy', {
              locale: language === 'id' ? idLocale : undefined,
            })}
          </Text>
        </View>

        {/* 2. Weekly Date Scroller with High-Contrast Text */}
        <View style={styles.dateScrollerRow}>
          {weekDays.map((date, idx) => {
            const isSelected = isSameDay(date, selectedDate);
            const isCurrentToday = isSameDay(date, new Date());
            return (
              <Pressable
                key={idx}
                onPress={() => {
                  if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedDate(date);
                }}
                style={styles.dayColumn}
              >
                <Text style={[styles.dayAbbr, isCurrentToday && styles.dayAbbrToday]}>
                  {format(date, 'EEE', {
                    locale: language === 'id' ? idLocale : undefined,
                  }).toUpperCase()}
                </Text>
                <View
                  style={[
                    styles.dayNumberBadge,
                    isSelected && styles.dayNumberBadgeSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumberText,
                      isSelected && styles.dayNumberTextSelected,
                    ]}
                  >
                    {format(date, 'd')}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* 3. Hero Card: Weekly Goal & Real Training Progress */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroGoalHeading}>
                {thisWeekSessionsCount} / {weeklyGoal} {t('days_per_week')}
              </Text>
              <Text style={styles.heroGoalSub}>{t('weekly_goal')}</Text>
            </View>

            {streak > 0 && (
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={16} color={colors.warning} />
                <Text style={styles.streakText}>
                  {streak} {t('day_streak')}
                </Text>
              </View>
            )}
          </View>

          {/* Progress Bar */}
          <View style={styles.heroProgressTrack}>
            <View
              style={[
                styles.heroProgressFill,
                { width: `${goalPercent}%`, backgroundColor: colors.accentLime },
              ]}
            />
          </View>

          <View style={styles.heroBottomMeta}>  
            <Text style={styles.heroProgressLabel}>{goalPercent}% {t('exercises_completed')}</Text>
            <Text style={styles.heroTargetLabel}>
              {weeklyGoal - thisWeekSessionsCount > 0
                ? `${weeklyGoal - thisWeekSessionsCount} ${t('days_per_week')} left`
                : 'Target achieved! 🎉'}
            </Text>
          </View>
        </View>

        {/* 4. This Week's Snapshot (Bento Tiles) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('this_week_summary')}</Text>
        </View>

        <View style={styles.bentoGrid}>
          {/* Tile 1: Workouts This Week */}
          <View style={styles.bentoTile}>
            <View style={styles.bentoHeader}>
              <Text style={styles.bentoCategory}>{t('this_week')}</Text>
              <View style={[styles.bentoIconBadge, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                <Ionicons name="barbell-outline" size={16} color="#3B82F6" />
              </View>
            </View>
            <Text style={styles.bentoValue}>{thisWeekSessionsCount}</Text>
            <Text style={styles.bentoSubtext}>/ {weeklyGoal} {t('days_per_week')}</Text>
          </View>

          {/* Tile 2: Active Training Time This Week */}
          <View style={styles.bentoTile}>
            <View style={styles.bentoHeader}>
              <Text style={styles.bentoCategory}>{t('active_time')}</Text>
              <View style={[styles.bentoIconBadge, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                <Ionicons name="time-outline" size={16} color="#F59E0B" />
              </View>
            </View>
            <Text style={styles.bentoValue}>
              {thisWeekTotalMinutes} <Text style={styles.bentoUnit}>{t('min_short')}</Text>
            </Text>
            <Text style={styles.bentoSubtext}>{t('this_week')}</Text>
          </View>

          {/* Tile 3: Total Sets This Week */}
          <View style={styles.bentoTile}>
            <View style={styles.bentoHeader}>
              <Text style={styles.bentoCategory}>{t('sets')}</Text>
              <View style={[styles.bentoIconBadge, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
                <Ionicons name="checkmark-done-outline" size={16} color="#22C55E" />
              </View>
            </View>
            <Text style={styles.bentoValue}>{thisWeekSetsCount}</Text>
            <Text style={styles.bentoSubtext}>{t('total_sets_completed')}</Text>
          </View>

          {/* Tile 4: Avg Duration Per Session This Week */}
          <View style={styles.bentoTile}>
            <View style={styles.bentoHeader}>
              <Text style={styles.bentoCategory}>{t('avg_per_session')}</Text>
              <View style={[styles.bentoIconBadge, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
                <Ionicons name="timer-outline" size={16} color="#6366F1" />
              </View>
            </View>
            <Text style={styles.bentoValue}>
              {thisWeekAvgDuration} <Text style={styles.bentoUnit}>{t('min_short')}</Text>
            </Text>
            <Text style={styles.bentoSubtext}>per {t('workout')}</Text>
          </View>
        </View>

        {/* 5. Recent Session Activity */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t('recent_activity')}</Text>
          {lastSession ? (
            <View style={styles.activityCard}>
              <View style={[styles.activityIconBox, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
                <Ionicons name="checkmark-circle" size={22} color={colors.successBadge} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activityTitle}>
                  {lastSessionTemplate?.name || t('custom_workout')}
                </Text>
                <Text style={styles.activitySub}>
                  {format(new Date(lastSession.date), 'dd MMM yyyy')} •{' '}
                  {Math.round((lastSession.duration || 0) / 60)} {t('min_short')} •{' '}
                  {lastSession.completedExercises?.reduce((a, b) => a + (b.completedSets?.length || 0), 0) || 0} {t('set')}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="barbell-outline" size={28} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>{t('no_workouts_yet')}</Text>
              <Text style={styles.emptySub}>{t('tap_add_routine')}</Text>
            </View>
          )}
        </View>

        {/* 6. Start Workout CTA Button */}
        <Pressable
          onPress={handleStartWorkout}
          style={({ pressed }) => [
            styles.startWorkoutButton,
            pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 },
          ]}
        >
          <View style={styles.plusIconWrapper}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.startWorkoutButtonText}>{t('start_workout')}</Text>
        </Pressable>

        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
}

const getStyles = (c: ThemeColors) =>
  StyleSheet.create({
    canvasContainer: {
      flex: 1,
      backgroundColor: c.background,
    },
    scrollContent: {
      paddingTop: Platform.OS === 'ios' ? 60 : 44,
      paddingHorizontal: 20,
      paddingBottom: 24,
    },

    // Header Bar
    headerBar: {
      marginBottom: 20,
    },
    greetingTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.6,
    },
    dateSubtitle: {
      fontSize: 14,
      color: c.textSecondary,
      fontWeight: '500',
      marginTop: 4,
    },

    // Date Scroller
    dateScrollerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: c.cardSurface,
      borderRadius: 24,
      paddingVertical: 14,
      paddingHorizontal: 8,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      ...Platform.select({
        ios: {
          shadowColor: c.shadowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: c.shadowOpacity,
          shadowRadius: c.shadowRadius,
        },
        android: {
          elevation: c.elevation,
        },
      }),
    },
    dayColumn: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
    },
    dayAbbr: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textSecondary,
      letterSpacing: 0.3,
    },
    dayAbbrToday: {
      color: c.primaryAction,
      fontWeight: '700',
    },
    dayNumberBadge: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    dayNumberBadgeSelected: {
      backgroundColor: c.dateBadgeSelected,
    },
    dayNumberText: {
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
    },
    dayNumberTextSelected: {
      fontWeight: '800',
      color: c.dateTextSelected,
    },

    // Hero Goal Card
    heroCard: {
      backgroundColor: c.heroBackground,
      borderRadius: 24,
      padding: 20,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    heroTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    heroGoalHeading: {
      fontSize: 20,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -0.3,
    },
    heroGoalSub: {
      fontSize: 13,
      color: c.heroTextSecondary,
      fontWeight: '500',
      marginTop: 2,
    },
    streakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
    },
    streakText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    heroProgressTrack: {
      height: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 10,
    },
    heroProgressFill: {
      height: '100%',
      borderRadius: 4,
    },
    heroBottomMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    heroProgressLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: c.accentLime,
    },
    heroTargetLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: c.heroTextSecondary,
    },

    // Section Header
    sectionHeader: {
      marginBottom: 12,
    },
    sectionContainer: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: c.textPrimary,
      letterSpacing: -0.3,
      marginBottom: 12,
    },

    // Bento Grid
    bentoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 24,
    },
    bentoTile: {
      width: '48%',
      backgroundColor: c.cardSurface,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      justifyContent: 'space-between',
      ...Platform.select({
        ios: {
          shadowColor: c.shadowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: c.shadowOpacity,
          shadowRadius: c.shadowRadius,
        },
        android: {
          elevation: c.elevation,
        },
      }),
    },
    bentoHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    bentoCategory: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
      letterSpacing: 0.3,
      flex: 1,
      marginRight: 4,
    },
    bentoIconBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bentoValue: {
      fontSize: 24,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.5,
      marginBottom: 4,
    },
    bentoUnit: {
      fontSize: 14,
      fontWeight: '600',
      color: c.textSecondary,
    },
    bentoSubtext: {
      fontSize: 12,
      fontWeight: '500',
      color: c.textMuted,
    },

    // Activity Card
    activityCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.cardSurface,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      gap: 12,
      ...Platform.select({
        ios: {
          shadowColor: c.shadowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: c.shadowOpacity,
          shadowRadius: c.shadowRadius,
        },
        android: {
          elevation: c.elevation,
        },
      }),
    },
    activityIconBox: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: c.surfaceHighlight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activityTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
      marginBottom: 2,
    },
    activitySub: {
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: '500',
    },
    emptyCard: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.cardSurface,
      borderRadius: 18,
      padding: 24,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      borderStyle: 'dashed',
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: c.textPrimary,
      marginTop: 8,
    },
    emptySub: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
    },

    // Start Workout Button
    startWorkoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 56,
      backgroundColor: c.primaryAction,
      borderRadius: 20,
      gap: 8,
      ...Platform.select({
        ios: {
          shadowColor: c.primaryAction,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    plusIconWrapper: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    startWorkoutButtonText: {
      fontSize: 16,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.3,
    },
  });
