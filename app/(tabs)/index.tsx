import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Flame,
  Dumbbell,
  Clock,
  CheckCheck,
  Timer,
  CheckCircle2,
  Plus,
  ChevronRight,
  Footprints,
  RotateCw,
  Check,
  User,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { format, startOfWeek, endOfWeek, addDays, isSameDay, isBefore, startOfDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';
import { useUserStore } from '@/store/useUserStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useStepStore } from '@/store/useStepStore';
import { openHealthConnectStore } from '@/utils/healthConnect';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { AppFonts } from '@/constants/theme';
import { updateWidget } from '@/utils/widgetBridge';

export default function DashboardScreen() {
  const router = useRouter();
  const name = useUserStore((state) => state.name);
  const streak = useUserStore((state) => state.streak);
  const checkStreakExpiry = useUserStore((state) => state.checkStreakExpiry);
  const weeklyGoal = useUserStore((state) => state.weeklyGoal);
  const hapticsEnabled = useUserStore((state) => state.hapticsEnabled);
  const sessions = useWorkoutStore((state) => state.sessions);
  const templates = useWorkoutStore((state) => state.templates);
  const scheduledWorkouts = useWorkoutStore((state) => state.scheduledWorkouts);
  const activeSession = useWorkoutStore((state) => state.activeSession);

  // Step Tracker Store
  const todaySteps = useStepStore((state) => state.todaySteps);
  const dailyStepGoal = useStepStore((state) => state.dailyStepGoal);
  const isConnected = useStepStore((state) => state.isConnected);
  const isAvailable = useStepStore((state) => state.isAvailable);
  const availabilityStatus = useStepStore((state) => state.availabilityStatus);
  const isSyncing = useStepStore((state) => state.isSyncing);
  const syncSteps = useStepStore((state) => state.syncSteps);
  const connectSteps = useStepStore((state) => state.connect);
  const checkStepStatus = useStepStore((state) => state.checkStatus);

  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { t, language } = useTranslation();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Keep selectedDate, streak, and steps synchronized on mount & app resume / across midnight
  useEffect(() => {
    checkStreakExpiry();
    checkStepStatus();

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        checkStreakExpiry();
        setSelectedDate((prev) => (isSameDay(prev, new Date()) ? prev : new Date()));
        if (useStepStore.getState().isConnected) {
          useStepStore.getState().syncSteps();
        }
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [checkStreakExpiry, checkStepStatus]);

  // Week Days (Mon - Sun): Active calendar week bounds (resets every Monday)
  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const weekEnd = useMemo(() => endOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)), [weekStart]);

  // Compute Real This-Week Workout Stats (strictly within the active Monday-Sunday calendar week)
  const thisWeekSessions = useMemo(() => {
    return sessions.filter((s) => {
      const sessionDate = new Date(s.date);
      return sessionDate >= weekStart && sessionDate <= weekEnd;
    });
  }, [sessions, weekStart, weekEnd]);

  const thisWeekSessionsCount = thisWeekSessions.length;

  // Number of distinct days the user completed workouts this week (for the "X / Y Hari" goal)
  const thisWeekWorkoutDaysCount = useMemo(() => {
    const uniqueDays = new Set(
      thisWeekSessions.map((s) => format(new Date(s.date), 'yyyy-MM-dd'))
    );
    return uniqueDays.size;
  }, [thisWeekSessions]);

  // Sync latest stats to Android Home Screen Widget
  useEffect(() => {
    updateWidget({
      streak,
      weeklyWorkoutsDone: thisWeekWorkoutDaysCount,
      weeklyGoal: weeklyGoal || 3,
      todaySteps,
    });
  }, [streak, thisWeekWorkoutDaysCount, weeklyGoal, todaySteps]);

  const thisWeekTotalMinutes = useMemo(() => {
    const totalSecs = thisWeekSessions.reduce((acc, s) => acc + (s.duration || 0), 0);
    return Math.round(totalSecs / 60);
  }, [thisWeekSessions]);

  const thisWeekVolumeLifted = useMemo(() => {
    return thisWeekSessions.reduce((totalVol, s) => {
      const template = templates.find((t) => t.id === s.templateId);
      const sessionVol = s.completedExercises?.reduce((exVol, cEx) => {
        const templateEx = template?.exercises.find((e) => e.id === cEx.exerciseId);
        const defaultWeight = templateEx?.weight || 0;

        const setsVol = (cEx.completedSets || []).reduce((setVol, reps, setIdx) => {
          const detail = cEx.setsDetails?.[setIdx];
          const actualReps = typeof detail?.reps === 'number' ? detail.reps : (typeof reps === 'number' ? reps : 0);
          const actualWeight = typeof detail?.weight === 'number' ? detail.weight : defaultWeight;
          return setVol + (actualReps * actualWeight);
        }, 0);

        return exVol + setsVol;
      }, 0) || 0;

      return totalVol + sessionVol;
    }, 0);
  }, [thisWeekSessions, templates]);

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

  const formatActiveTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} ${t('min_short')}`;
    }
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}j ${m}m` : `${h} ${t('hours_short')}`;
  };

  const formatVolume = (kg: number) => {
    if (kg >= 1000) {
      return `${(kg / 1000).toFixed(1)} ton`;
    }
    return `${kg.toLocaleString()} kg`;
  };

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

  const todayDateStr = format(new Date(), 'yyyy-MM-dd');
  const todayScheduledTemplateId = scheduledWorkouts[todayDateStr];
  const todayScheduledTemplate = templates.find((t) => t.id === todayScheduledTemplateId);

  const handleStartWorkout = () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (activeSession) {
      router.push('/workout/active');
    } else {
      router.push('/(tabs)/workout');
    }
  };

  // Weekly Goal Progress Percent
  const goalPercent = Math.min(100, Math.round((thisWeekWorkoutDaysCount / (weeklyGoal || 3)) * 100));

  return (
    <View style={styles.canvasContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Header (Top Bar: Greeting & Streak Badge) */}
        <View style={styles.headerBar}>
          <View style={styles.headerLeft}>
            <Text style={styles.greetingTitle}>
              {getGreeting()}
              {name && name !== 'Athlete' ? (
                <>
                  {', '}
                  <Text style={styles.userName}>{name}</Text>
                </>
              ) : (
                '!'
              )}
            </Text>
            <Text style={styles.dateSubtitle}>
              {format(selectedDate, 'EEEE, d MMMM yyyy', {
                locale: language === 'id' ? idLocale : undefined,
              })}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {streak > 0 && (
              <View style={styles.headerStreakBadge}>
                <Flame size={13} color="#F59E0B" />
                <Text style={styles.headerStreakText}>
                  {streak} {t('day_streak') || 'Hari'}
                </Text>
              </View>
            )}
            <Pressable
              onPress={() => router.push('/(tabs)/settings')}
              style={styles.avatarButton}
              accessibilityLabel={t('settings')}
            >
              {name && name !== 'Athlete' ? (
                <Text style={styles.avatarText}>
                  {name.charAt(0).toUpperCase()}
                </Text>
              ) : (
                <User size={16} color={colors.primaryAction} />
              )}
            </Pressable>
          </View>
        </View>

        {/* 2. 7-Day Horizon Strip with Glowing Today Ring & Emerald Dots */}
        <View style={styles.dateScrollerRow}>
          {weekDays.map((date, idx) => {
            const isSelected = isSameDay(date, selectedDate);
            const isCurrentToday = isSameDay(date, new Date());
            const dateStr = format(date, 'yyyy-MM-dd');
            const isPastDay = isBefore(startOfDay(date), startOfDay(new Date()));
            const isSessionCompleted = sessions.some(
              (s) => format(new Date(s.date), 'yyyy-MM-dd') === dateStr
            );
            const hasWorkout = isPastDay
              ? isSessionCompleted
              : (isSessionCompleted || !!scheduledWorkouts[dateStr]);
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
                    isCurrentToday && styles.dayNumberBadgeToday,
                    isSelected && styles.dayNumberBadgeSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumberText,
                      isCurrentToday && styles.dayNumberTextToday,
                      isSelected && styles.dayNumberTextSelected,
                    ]}
                  >
                    {format(date, 'd')}
                  </Text>
                </View>
                <View
                  style={[
                    styles.dot,
                    hasWorkout && { backgroundColor: isSelected ? '#000000' : '#10B981' },
                    !hasWorkout && { backgroundColor: 'transparent' },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>

        {/* 3. Hero Card: Weekly Target with Precision Linear Bar */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroGoalHeading}>
                {t('weekly_goal') || 'Target Mingguan'}: <Text style={styles.heroGoalValue}>{thisWeekWorkoutDaysCount} / {weeklyGoal}</Text> {t('days_count') || 'Latihan'}
              </Text>
            </View>
            <View style={styles.heroGoalPercentBadge}>
              <Text style={styles.heroGoalPercentText}>{goalPercent}%</Text>
            </View>
          </View>

          {/* Precision Linear Bar (h-1.5 rounded-full bg-slate-800 with emerald fill) */}
          <View style={styles.heroProgressTrack}>
            <View
              style={[
                styles.heroProgressFill,
                { width: `${goalPercent}%`, backgroundColor: '#10B981' },
              ]}
            />
          </View>

          <View style={styles.heroBottomMeta}>  
            <Text style={styles.heroProgressLabel}>{goalPercent}% {t('goal_reached') || 'tercapai'}</Text>
            <Text style={styles.heroTargetLabel}>
              {weeklyGoal - thisWeekWorkoutDaysCount > 0
                ? `${weeklyGoal - thisWeekWorkoutDaysCount} ${
                    weeklyGoal - thisWeekWorkoutDaysCount === 1 && language === 'en'
                      ? t('day_remaining')
                      : t('days_remaining')
                  }`
                : t('target_achieved')}
            </Text>
          </View>
        </View>

        {/* Step Tracker Card */}
        {(() => {
          const stepPercent = Math.min(100, Math.round((todaySteps / Math.max(1, dailyStepGoal)) * 100));
          const distanceKm = (todaySteps * 0.00075).toFixed(2);
          const caloriesKcal = Math.round(todaySteps * 0.04);
          const remainingSteps = Math.max(0, dailyStepGoal - todaySteps);

          return (
            <View style={styles.stepCard}>
              {isConnected ? (
                <>
                  <View style={styles.stepCardHeader}>
                    <View style={styles.stepCardHeaderLeft}>
                      <View style={[styles.stepIconBadge, { backgroundColor: 'rgba(249, 115, 22, 0.12)' }]}>
                        <Footprints size={18} color="#F97316" strokeWidth={2.2} />
                      </View>
                      <View>
                        <Text style={styles.stepCardTitle}>{t('steps_today')}</Text>
                        <Text style={styles.stepCardSub}>Google Health Connect</Text>
                      </View>
                    </View>
                    <View style={styles.stepCardHeaderRight}>
                      <Pressable
                        onPress={() => {
                          if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          syncSteps();
                        }}
                        disabled={isSyncing}
                        style={({ pressed }) => [
                          styles.stepSyncButton,
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <RotateCw
                          size={16}
                          color={isSyncing ? colors.textMuted : '#F97316'}
                          strokeWidth={2.2}
                        />
                      </Pressable>
                      <View style={styles.stepPercentBadge}>
                        <Text style={styles.stepPercentText}>{stepPercent}%</Text>
                      </View>
                    </View>
                  </View>

                  {/* Step Counts */}
                  <View style={styles.stepCountRow}>
                    <Text style={styles.stepCountBig}>
                      {todaySteps.toLocaleString()}{' '}
                      <Text style={styles.stepCountGoal}>
                        / {dailyStepGoal.toLocaleString()} {t('steps_goal_label')}
                      </Text>
                    </Text>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.stepProgressTrack}>
                    <View
                      style={[
                        styles.stepProgressFill,
                        { width: `${stepPercent}%`, backgroundColor: '#F97316' },
                      ]}
                    />
                  </View>

                  {/* Sub-metrics: Distance & Calories */}
                  <View style={styles.stepMetricsRow}>
                    <View style={styles.stepMetricItem}>
                      <Text style={styles.stepMetricValue}>{distanceKm}</Text>
                      <Text style={styles.stepMetricLabel}>{t('distance_km')}</Text>
                    </View>
                    <View style={styles.stepMetricDivider} />
                    <View style={styles.stepMetricItem}>
                      <Text style={styles.stepMetricValue}>{caloriesKcal}</Text>
                      <Text style={styles.stepMetricLabel}>{t('calories_kcal')}</Text>
                    </View>
                    <View style={styles.stepMetricDivider} />
                    <View style={styles.stepMetricItem}>
                      <Text style={styles.stepMetricValue}>{remainingSteps.toLocaleString()}</Text>
                      <Text style={styles.stepMetricLabel}>
                        {remainingSteps === 0 ? t('target_achieved') : `${t('steps_goal_label')} lagi`}
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.stepConnectContainer}>
                  <View style={styles.stepConnectLeft}>
                    <View style={[styles.stepIconBadge, { backgroundColor: 'rgba(249, 115, 22, 0.12)' }]}>
                      <Footprints size={20} color="#F97316" strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stepCardTitle}>{t('step_counter')}</Text>
                      <Text style={styles.stepConnectDesc}>
                        {availabilityStatus === 'update_required'
                          ? t('health_connect_unavailable')
                          : t('health_connect_desc')}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={async () => {
                      if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      if (availabilityStatus === 'update_required') {
                        openHealthConnectStore();
                      } else {
                        await connectSteps();
                      }
                    }}
                    style={({ pressed }) => [
                      styles.stepConnectBtn,
                      pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                    ]}
                  >
                    <Text style={styles.stepConnectBtnText}>
                      {availabilityStatus === 'update_required'
                        ? t('install_health_connect')
                        : t('connect_health_connect')}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })()}

        {/* 4. This Week's Snapshot (Bento Tiles) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('this_week_summary')}</Text>
        </View>

        <View style={styles.bentoGrid}>
          {/* Tile 1: Workouts Completed This Week */}
          <View style={styles.bentoTile}>
            <View style={styles.bentoHeader}>
              <Text style={styles.bentoCategory} numberOfLines={1}>
                {t('workouts_completed') || 'Latihan Selesai'}
              </Text>
              <View style={[styles.bentoIconBadge, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
                <Dumbbell size={16} color="#38BDF8" strokeWidth={2.2} />
              </View>
            </View>
            <Text style={styles.bentoValue} numberOfLines={1} adjustsFontSizeToFit>
              {thisWeekSessionsCount} <Text style={{ fontSize: 13, color: colors.textSecondary, fontFamily: AppFonts.semiBold }}>{t('workout') || 'Latihan'}</Text>
            </Text>
            <Text style={styles.bentoSubtext}>{t('this_week')}</Text>
          </View>

          {/* Tile 2: Active Training Time This Week */}
          <View style={styles.bentoTile}>
            <View style={styles.bentoHeader}>
              <Text style={styles.bentoCategory} numberOfLines={1}>
                {t('active_time')}
              </Text>
              <View style={[styles.bentoIconBadge, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                <Clock size={16} color="#F59E0B" strokeWidth={2.2} />
              </View>
            </View>
            <Text style={styles.bentoValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatActiveTime(thisWeekTotalMinutes)}
            </Text>
            <Text style={styles.bentoSubtext}>{t('this_week')}</Text>
          </View>

          {/* Tile 3: Total Sets This Week */}
          <View style={styles.bentoTile}>
            <View style={styles.bentoHeader}>
              <Text style={styles.bentoCategory} numberOfLines={1}>
                {t('sets')}
              </Text>
              <View style={[styles.bentoIconBadge, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
                <CheckCheck size={16} color="#22C55E" strokeWidth={2.2} />
              </View>
            </View>
            <Text style={styles.bentoValue}>{thisWeekSetsCount}</Text>
            <Text style={styles.bentoSubtext}>{t('total_sets_completed')}</Text>
          </View>

          {/* Tile 4: Avg Duration Per Session This Week */}
          <View style={styles.bentoTile}>
            <View style={styles.bentoHeader}>
              <Text style={styles.bentoCategory} numberOfLines={1}>
                {t('avg_per_session')}
              </Text>
              <View style={[styles.bentoIconBadge, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
                <Timer size={16} color="#6366F1" strokeWidth={2.2} />
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
                <CheckCircle2 size={22} color={colors.successBadge} strokeWidth={2} />
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
              <ChevronRight size={18} color={colors.textMuted} />
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Dumbbell size={28} color={colors.textMuted} strokeWidth={1.75} />
              <Text style={styles.emptyTitle}>{t('no_workouts_yet')}</Text>
              <Text style={styles.emptySub}>{t('tap_add_routine')}</Text>
            </View>
          )}
        </View>

        {/* 6. Hero Tactile CTA Button */}
        <Pressable
          onPress={handleStartWorkout}
          style={({ pressed }) => [
            styles.startWorkoutButton,
            pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
          ]}
        >
          <View style={styles.plusIconWrapper}>
            {activeSession ? (
              <RotateCw size={17} color="#000000" strokeWidth={2.5} />
            ) : (
              <Plus size={18} color="#000000" strokeWidth={2.6} />
            )}
          </View>
          <Text style={styles.startWorkoutButtonText}>
            {activeSession
              ? (t('resume_workout') || 'Lanjutkan Latihan')
              : todayScheduledTemplate
              ? `${t('start_workout') || 'Mulai Latihan'}: ${todayScheduledTemplate.name}`
              : (t('start_workout') || 'Mulai Latihan')}
          </Text>
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
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    headerLeft: {
      flex: 1,
      marginRight: 12,
    },
    greetingTitle: {
      fontFamily: AppFonts.bold,
      fontSize: 24,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.4,
    },
    userName: {
      color: c.primaryAction,
    },
    dateSubtitle: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      color: c.textMuted,
      marginTop: 2,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerStreakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.2)',
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 10,
    },
    headerStreakText: {
      fontFamily: AppFonts.bold,
      fontSize: 12,
      fontWeight: '800',
      color: '#F59E0B',
      fontVariant: ['tabular-nums'],
    },
    avatarButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.surfaceHighlight,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontFamily: AppFonts.bold,
      fontSize: 14,
      fontWeight: '800',
      color: c.textPrimary,
    },

    // Date Scroller
    dateScrollerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: c.cardSurface,
      borderRadius: 16,
      paddingVertical: 12,
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
      gap: 5,
    },
    dayAbbr: {
      fontFamily: AppFonts.semiBold,
      fontSize: 11,
      fontWeight: '600',
      color: c.textMuted,
      letterSpacing: 0.5,
    },
    dayAbbrToday: {
      color: c.primaryAction,
      fontWeight: '800',
    },
    dayNumberBadge: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    dayNumberBadgeToday: {
      borderWidth: 1.5,
      borderColor: c.primaryAction,
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
    },
    dayNumberBadgeSelected: {
      backgroundColor: c.primaryAction,
      borderColor: c.primaryAction,
    },
    dayNumberText: {
      fontFamily: AppFonts.bold,
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    dayNumberTextToday: {
      color: c.primaryAction,
      fontWeight: '800',
    },
    dayNumberTextSelected: {
      fontFamily: AppFonts.extraBold,
      fontWeight: '800',
      color: '#000000',
    },
    dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
    },

    // Hero Goal Card (Slim Target Box)
    heroCard: {
      backgroundColor: c.cardSurface,
      borderRadius: 14,
      padding: 12,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    heroTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    heroGoalHeading: {
      fontFamily: AppFonts.semiBold,
      fontSize: 13,
      color: c.textSecondary,
    },
    heroGoalValue: {
      fontFamily: AppFonts.bold,
      fontSize: 15,
      fontWeight: '800',
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    heroGoalPercentBadge: {
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      paddingHorizontal: 7,
      paddingVertical: 2.5,
      borderRadius: 6,
    },
    heroGoalPercentText: {
      fontFamily: AppFonts.bold,
      fontSize: 11,
      fontWeight: '800',
      color: '#10B981',
      fontVariant: ['tabular-nums'],
    },
    heroProgressTrack: {
      height: 5,
      backgroundColor: '#1E293B',
      borderRadius: 999,
      overflow: 'hidden',
      marginBottom: 6,
    },
    heroProgressFill: {
      height: '100%',
      borderRadius: 999,
    },
    heroBottomMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    heroProgressLabel: {
      fontFamily: AppFonts.semiBold,
      fontSize: 11,
      fontWeight: '600',
      color: '#10B981',
    },
    heroTargetLabel: {
      fontFamily: AppFonts.medium,
      fontSize: 11,
      fontWeight: '500',
      color: c.textMuted,
    },

    // Step Tracker Card
    stepCard: {
      backgroundColor: c.cardSurface,
      borderRadius: 14,
      padding: 12,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      ...Platform.select({
        ios: {
          shadowColor: c.shadowColor,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: c.shadowOpacity,
          shadowRadius: 3,
        },
        android: {
          elevation: c.elevation,
        },
      }),
    },
    stepCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    stepCardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    stepCardHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    stepIconBadge: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepCardTitle: {
      fontFamily: AppFonts.bold,
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
    },
    stepCardSub: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      color: c.textMuted,
      marginTop: 1,
    },
    stepSyncButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(249, 115, 22, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepPercentBadge: {
      backgroundColor: 'rgba(249, 115, 22, 0.12)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    stepPercentText: {
      fontFamily: AppFonts.bold,
      fontSize: 12,
      fontWeight: '700',
      color: '#F97316',
    },
    stepCountRow: {
      marginBottom: 6,
    },
    stepCountBig: {
      fontFamily: AppFonts.extraBold,
      fontSize: 20,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.3,
    },
    stepCountGoal: {
      fontFamily: AppFonts.medium,
      fontSize: 13,
      fontWeight: '500',
      color: c.textMuted,
    },
    stepProgressTrack: {
      height: 6,
      backgroundColor: c.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: 10,
    },
    stepProgressFill: {
      height: '100%',
      borderRadius: 3,
    },
    stepMetricsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 2,
    },
    stepMetricItem: {
      flex: 1,
      alignItems: 'center',
    },
    stepMetricDivider: {
      width: 1,
      height: 18,
      backgroundColor: c.borderSubtle,
    },
    stepMetricValue: {
      fontFamily: AppFonts.bold,
      fontSize: 13,
      fontWeight: '700',
      color: c.textPrimary,
    },
    stepMetricLabel: {
      fontFamily: AppFonts.medium,
      fontSize: 11,
      color: c.textMuted,
      marginTop: 1,
    },
    stepConnectContainer: {
      gap: 10,
    },
    stepConnectLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    stepConnectDesc: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      color: c.textMuted,
      marginTop: 2,
      lineHeight: 16,
    },
    stepConnectBtn: {
      backgroundColor: '#F97316',
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepConnectBtnText: {
      fontFamily: AppFonts.bold,
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    // Section Header
    sectionHeader: {
      marginBottom: 8,
    },
    sectionContainer: {
      marginBottom: 14,
    },
    sectionTitle: {
      fontFamily: AppFonts.bold,
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
      letterSpacing: -0.3,
      marginBottom: 8,
    },

    // Bento Grid
    bentoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 14,
    },
    bentoTile: {
      width: '48.5%',
      backgroundColor: c.cardSurface,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      justifyContent: 'space-between',
      ...Platform.select({
        ios: {
          shadowColor: c.shadowColor,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: c.shadowOpacity,
          shadowRadius: 3,
        },
        android: {
          elevation: c.elevation,
        },
      }),
    },
    bentoTileWide: {
      width: '100%',
    },
    bentoHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    bentoCategory: {
      fontFamily: AppFonts.bold,
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
      letterSpacing: 0.3,
      flex: 1,
      marginRight: 4,
    },
    bentoIconBadge: {
      width: 26,
      height: 26,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bentoValue: {
      fontFamily: AppFonts.extraBold,
      fontSize: 20,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.5,
      marginBottom: 2,
    },
    bentoUnit: {
      fontFamily: AppFonts.semiBold,
      fontSize: 12,
      fontWeight: '600',
      color: c.textSecondary,
    },
    bentoSubtext: {
      fontFamily: AppFonts.medium,
      fontSize: 11,
      fontWeight: '500',
      color: c.textMuted,
    },

    // Activity Card
    activityCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.cardSurface,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      gap: 10,
      ...Platform.select({
        ios: {
          shadowColor: c.shadowColor,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: c.shadowOpacity,
          shadowRadius: 3,
        },
        android: {
          elevation: c.elevation,
        },
      }),
    },
    activityIconBox: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: c.surfaceHighlight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activityTitle: {
      fontFamily: AppFonts.bold,
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
      marginBottom: 2,
    },
    activitySub: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: '500',
    },
    emptyCard: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.cardSurface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      borderStyle: 'dashed',
    },
    emptyTitle: {
      fontFamily: AppFonts.semiBold,
      fontSize: 15,
      fontWeight: '600',
      color: c.textPrimary,
      marginTop: 8,
    },
    emptySub: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
    },

    // Start Workout Button (Tactile Kinetic Gold CTA)
    startWorkoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 52,
      backgroundColor: c.primaryAction,
      borderRadius: 14,
      gap: 10,
      marginTop: 4,
      ...Platform.select({
        ios: {
          shadowColor: '#F59E0B',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 10,
        },
        android: {
          elevation: 6,
        },
      }),
    },
    plusIconWrapper: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(0, 0, 0, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    startWorkoutButtonText: {
      fontFamily: AppFonts.bold,
      fontSize: 15,
      fontWeight: '800',
      color: '#000000',
      letterSpacing: 0.2,
    },
  });
