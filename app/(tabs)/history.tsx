import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Platform, TextInput, ScrollView } from 'react-native';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useAlertStore } from '@/store/useAlertStore';
import { useStepStore } from '@/store/useStepStore';
import { useAuth } from '@clerk/expo';
import { deleteWorkoutSessionFromCloud } from '@/services/syncService';
import { markPendingSync } from '@/services/syncState';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, subDays, subMonths, isSameMonth, isSameDay, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';
import { Trash2, Calendar as CalendarIcon, BarChart3, Clock, CheckCircle2, Dumbbell, Share2, Search, ChevronRight, Sparkles, BookOpen, Footprints, TrendingUp, Target, Flame, Check, Trophy, X } from 'lucide-react-native';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { useTranslation } from '@/hooks/useTranslation';
import { AppFonts } from '@/constants/theme';
import { triggerButtonVibration } from '@/utils/soundPlayer';
import { useUserStore } from '@/store/useUserStore';
import WorkoutSummaryModal from '@/components/WorkoutSummaryModal';
import WorkoutDetailModal from '@/components/WorkoutDetailModal';
import { useRenderProfiler } from '@/hooks/useRenderProfiler';

export default function HistoryScreen() {
  useRenderProfiler('HistoryScreen', 8);
  const { userId } = useAuth();
  const hapticsEnabled = useUserStore((s) => s.hapticsEnabled);
  const sessions = useWorkoutStore((state) => state.sessions);
  const templates = useWorkoutStore((state) => state.templates);
  const deleteSession = useWorkoutStore((state) => state.deleteSession);
  const showAlert = useAlertStore((state) => state.showAlert);
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { t, language } = useTranslation();

  // Step Store
  const todaySteps = useStepStore((state) => state.todaySteps);
  const dailyStepGoal = useStepStore((state) => state.dailyStepGoal);
  const stepHistory = useStepStore((state) => state.stepHistory);
  const isStepConnected = useStepStore((state) => state.isConnected);
  const fetchStepHistory = useStepStore((state) => state.fetchHistory);

  useEffect(() => {
    if (isStepConnected) {
      fetchStepHistory(14);
    }
  }, [isStepConnected, fetchStepHistory]);

  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'steps'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'this_month' | 'last_month'>('all');
  const [selectedTemplateFilter, setSelectedTemplateFilter] = useState<string>('all');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  const [selectedStepPeriod, setSelectedStepPeriod] = useState<'1y' | '6m' | '3m' | '1m'>('1y');
  const [selectedStepDayKey, setSelectedStepDayKey] = useState<string | null>(null);

  const [selectedShareSession, setSelectedShareSession] = useState<{
    visible: boolean;
    workoutName: string;
    duration: number;
    exercises: any[];
    streak: number;
    totalReps?: number;
    maxWeight?: number;
    date?: string;
  } | null>(null);

  const [selectedDetailSession, setSelectedDetailSession] = useState<any>(null);

  const handleOpenSessionDetail = useCallback((session: any) => {
    triggerButtonVibration(hapticsEnabled);
    setSelectedDetailSession(session);
  }, []);

  const handleShareSession = useCallback((session: any) => {
    triggerButtonVibration(hapticsEnabled);
    const template = templates.find((tpl) => tpl.id === session.templateId);

    let sessionTotalReps = 0;
    let sessionMaxWeight = 0;

    const exercisesSummary = (session.completedExercises || []).map((cEx: any) => {
      const targetEx = template?.exercises.find((e) => e.id === cEx.exerciseId);
      const isTimeBased = targetEx?.type === 'time';
      const numSets = Math.max(
        cEx.completedSets?.length || 0,
        cEx.setsDetails ? Object.keys(cEx.setsDetails).length : 0
      );
      const sets: { setNumber: number; reps: number; weight?: number; isTimeBased?: boolean }[] = [];
      let exMaxWeight = 0;
      let exTotalReps = 0;

      for (let sIdx = 0; sIdx < numSets; sIdx++) {
        const detail = cEx.setsDetails?.[sIdx];
        let reps = 0;
        if (typeof detail?.reps === 'number') {
          reps = detail.reps;
        } else if (typeof cEx.completedSets?.[sIdx] === 'number') {
          reps = cEx.completedSets[sIdx];
        } else if (typeof targetEx?.reps === 'number') {
          reps = targetEx.reps;
        } else if (typeof targetEx?.reps === 'string') {
          reps = parseInt(targetEx.reps.split('-')[0], 10) || 10;
        } else if (isTimeBased) {
          reps = targetEx?.duration || 0;
        } else {
          reps = 10;
        }

        let weight: number | undefined = undefined;
        if (typeof detail?.weight === 'number' && detail.weight > 0) {
          weight = detail.weight;
        } else if (targetEx?.weight && targetEx.weight > 0) {
          weight = targetEx.weight;
        }

        if (weight && weight > exMaxWeight) exMaxWeight = weight;
        if (weight && weight > sessionMaxWeight) sessionMaxWeight = weight;

        exTotalReps += reps;
        sessionTotalReps += reps;

        sets.push({
          setNumber: sIdx + 1,
          reps,
          weight,
          isTimeBased,
        });
      }

      return {
        name: targetEx?.name || 'Exercise',
        setsCount: sets.length,
        weight: exMaxWeight > 0 ? exMaxWeight : undefined,
        totalReps: exTotalReps,
        sets,
      };
    });

    setSelectedShareSession({
      visible: true,
      workoutName: template?.name || 'Workout',
      duration: session.duration || 0,
      exercises: exercisesSummary,
      streak: 1,
      totalReps: sessionTotalReps,
      maxWeight: sessionMaxWeight > 0 ? sessionMaxWeight : undefined,
      date: session.date,
    });
  }, [templates]);

  const handleDelete = useCallback(
    (id: string) => {
      triggerButtonVibration(hapticsEnabled);
      showAlert(
        t('delete_workout'),
        t('delete_workout_confirm'),
        [
          { text: t('cancel'), style: 'cancel' },
          {
            text: t('delete'),
            style: 'destructive',
            onPress: () => {
              deleteSession(id);
              if (userId) {
                deleteWorkoutSessionFromCloud(userId, id).catch(() => {
                  markPendingSync();
                });
              }
            },
          },
        ]
      );
    },
    [showAlert, deleteSession, t, userId]
  );

  // Memoized month dates & grid padding
  const { days, paddingDays } = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    const monthDays = eachDayOfInterval({ start, end });
    const startDayOfWeek = monthDays[0].getDay(); // 0 is Sunday
    const pad = Array.from({ length: startDayOfWeek }).map((_, i) => i);
    return { days: monthDays, paddingDays: pad };
  }, []);

  // Precompute the set of dates that have a session ONCE per sessions change.
  // Avoids an O(days x sessions) date-fns `format` sweep on every calendar render
  // (and on every theme change that rebuilds the memoized calendar).
  const sessionDateSet = useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions) {
      set.add(format(new Date(s.date), 'yyyy-MM-dd'));
    }
    return set;
  }, [sessions]);

  // Memoized stats calculation
  const { totalWorkouts, totalDurationSeconds, avgDurationMins, totalCompletedSets, totalCompletedReps } = useMemo(() => {
    const count = sessions.length;
    const duration = sessions.reduce((acc, curr) => acc + (curr.duration || 0), 0);
    const avgMins = count ? Math.round(duration / count / 60) : 0;
    let sets = 0;
    let repsCount = 0;

    sessions.forEach((s) => {
      s.completedExercises?.forEach((cEx) => {
        sets += cEx.completedSets?.length || 0;
        (cEx.completedSets || []).forEach((reps, setIdx) => {
          const detail = cEx.setsDetails?.[setIdx];
          const actualReps = typeof detail?.reps === 'number' ? detail.reps : (typeof reps === 'number' ? reps : 0);
          repsCount += actualReps;
        });
      });
    });

    return {
      totalWorkouts: count,
      totalDurationSeconds: duration,
      avgDurationMins: avgMins,
      totalCompletedSets: sets,
      totalCompletedReps: repsCount,
    };
  }, [sessions]);

  const formatVolume = (kg: number) => {
    if (kg >= 1000) {
      return `${(kg / 1000).toFixed(1)} ton`;
    }
    return `${kg.toLocaleString()} kg`;
  };

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), 6 - i));
    return last7Days.map((date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const count = sessions.filter((s) => sessionDateSet.has(format(new Date(s.date), 'yyyy-MM-dd')) && format(new Date(s.date), 'yyyy-MM-dd') === dateStr).length;
      return {
        day: format(date, 'EE', { locale: language === 'id' ? idLocale : undefined }).charAt(0),
        count,
      };
    });
  }, [sessions, sessionDateSet, language]);

  const weeklyWorkoutCount = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.count, 0);
  }, [chartData]);

  // Deduplicated & reversed sessions array memoized
  const allReversedSessions = useMemo(() => {
    const seen = new Set<string>();
    const unique = [];
    for (let i = sessions.length - 1; i >= 0; i--) {
      const s = sessions[i];
      const sid = s.id || `sess_${i}`;
      if (!seen.has(sid)) {
        seen.add(sid);
        unique.push(s);
      }
    }
    return unique;
  }, [sessions]);

  // Filtered sessions for "logs" tab (search + month filter + template filter)
  const filteredLogsSessions = useMemo(() => {
    const now = new Date();
    const lastMonthDate = subMonths(now, 1);

    return allReversedSessions.filter((session) => {
      // Template filter
      if (selectedTemplateFilter !== 'all') {
        if (session.templateId !== selectedTemplateFilter) return false;
      }

      // Month filter
      if (selectedFilter === 'this_month') {
        if (!isSameMonth(new Date(session.date), now)) return false;
      } else if (selectedFilter === 'last_month') {
        if (!isSameMonth(new Date(session.date), lastMonthDate)) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const template = templates.find((tpl) => tpl.id === session.templateId);
        const name = (template?.name || t('workout')).toLowerCase();
        const dateStr = format(new Date(session.date), 'dd MMMM yyyy', {
          locale: language === 'id' ? idLocale : undefined,
        }).toLowerCase();
        return name.includes(query) || dateStr.includes(query);
      }

      return true;
    });
  }, [allReversedSessions, selectedFilter, selectedTemplateFilter, searchQuery, templates, language, t]);

  // Memoized template session counts to prevent repeated filtering in list header
  const templateSessionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < allReversedSessions.length; i++) {
      const tid = allReversedSessions[i].templateId;
      if (tid) counts[tid] = (counts[tid] || 0) + 1;
    }
    return counts;
  }, [allReversedSessions]);

  // Step History Data (up to 365 days / 1 year)
  const stepYearlyBase = useMemo(() => {
    const list: Array<{
      date: Date;
      dateKey: string;
      dayOfWeek: number;
      isToday: boolean;
    }> = [];
    const now = new Date();
    for (let i = 0; i < 365; i++) {
      const d = subDays(now, i);
      list.push({
        date: d,
        dateKey: format(d, 'yyyy-MM-dd'),
        dayOfWeek: d.getDay(),
        isToday: i === 0,
      });
    }
    return list;
  }, []);

  const stepYearlyData = useMemo(() => {
    const goal = Math.max(1000, dailyStepGoal);
    return stepYearlyBase.map((base) => {
      const steps = base.isToday ? Math.max(stepHistory[base.dateKey] || 0, todaySteps) : (stepHistory[base.dateKey] || 0);
      const percent = Math.min(100, Math.round((steps / goal) * 100));
      const isGoalMet = steps >= goal;
      let category: 'empty' | 'low' | 'medium' | 'goal' = 'empty';
      if (steps > 0) {
        category = isGoalMet ? 'goal' : steps >= 5000 ? 'medium' : 'low';
      }
      return {
        ...base,
        steps,
        goal,
        percent,
        distanceKm: (steps * 0.00075).toFixed(2),
        caloriesKcal: Math.round(steps * 0.04),
        isGoalMet,
        category,
      };
    });
  }, [stepYearlyBase, stepHistory, todaySteps, dailyStepGoal]);

  // Bar chart data: group steps by weeks based on selected period
  const { barChartWeeks, barChartMonths } = useMemo(() => {
    const daysCount =
      selectedStepPeriod === '1m'
        ? 28
        : selectedStepPeriod === '6m'
        ? 182
        : selectedStepPeriod === '3m'
        ? 91
        : 365;

    const slice = [...stepYearlyData.slice(0, daysCount)].reverse();
    const weeks: Array<{
      weekLabel: string;
      weekStart: Date;
      weekEnd: Date;
      totalSteps: number;
      avgSteps: number;
      goal: number;
      days: Array<{ dateKey: string; steps: number; goal: number; isGoalMet: boolean }>;
    }> = [];

    const months: Array<{ monthKey: string; label: string; weeksCount: number }> = [];

    let currentWeek: typeof slice = [];
    let lastMonth = -1;

    slice.forEach((item, idx) => {
      const month = item.date.getMonth();
      if (currentWeek.length === 0) {
        lastMonth = month;
      }

      currentWeek.push(item);
      if (currentWeek.length === 7 || idx === slice.length - 1) {
        const weekStart = currentWeek[0].date;
        const weekEnd = currentWeek[currentWeek.length - 1].date;
        const totalSteps = currentWeek.reduce((acc, c) => acc + c.steps, 0);
        const avgSteps = Math.round(totalSteps / currentWeek.length);
        const goal = currentWeek[0].goal;
        const monthKey = format(weekEnd, 'yyyy-MM');
        const monthLabel = format(weekEnd, 'MMM', {
          locale: language === 'id' ? idLocale : undefined,
        });

        weeks.push({
          weekLabel: `${format(weekStart, 'd')}-${format(weekEnd, 'd')}`,
          weekStart,
          weekEnd,
          totalSteps,
          avgSteps,
          goal: goal * currentWeek.length,
          days: currentWeek.map((d) => ({
            dateKey: d.dateKey,
            steps: d.steps,
            goal: d.goal,
            isGoalMet: d.isGoalMet,
          })),
        });

        const lastMonthEntry = months[months.length - 1];
        if (!lastMonthEntry || lastMonthEntry.monthKey !== monthKey) {
          months.push({
            monthKey,
            label: monthLabel,
            weeksCount: 1,
          });
        } else {
          lastMonthEntry.weeksCount += 1;
        }

        currentWeek = [];
      }
    });

    return { barChartWeeks: weeks, barChartMonths: months };
  }, [stepYearlyData, selectedStepPeriod, language]);

  const selectedStepDay = useMemo(() => {
    if (!selectedStepDayKey) {
      return stepYearlyData[0] || null;
    }
    return stepYearlyData.find((d) => d.dateKey === selectedStepDayKey) || stepYearlyData[0] || null;
  }, [stepYearlyData, selectedStepDayKey]);

  const stepPeriodStats = useMemo(() => {
    const daysCount =
      selectedStepPeriod === '1m'
        ? 28
        : selectedStepPeriod === '3m'
        ? 91
        : selectedStepPeriod === '6m'
        ? 182
        : 365;

    const slice = stepYearlyData.slice(0, daysCount);
    const totalSteps = slice.reduce((acc, curr) => acc + curr.steps, 0);
    const avgSteps = Math.round(totalSteps / daysCount);
    const goalsMetCount = slice.filter((item) => item.isGoalMet).length;
    const totalDistKm = (totalSteps * 0.00075).toFixed(1);
    const totalCalories = Math.round(totalSteps * 0.04);

    return {
      daysCount,
      totalSteps,
      avgSteps,
      goalsMetCount,
      totalDistKm,
      totalCalories,
    };
  }, [stepYearlyData, selectedStepPeriod]);

  // Data to display in FlatList
  const displayedData = useMemo(() => {
    if (activeTab === 'logs') {
      return filteredLogsSessions; // Full filtered workout logs directly in main feed
    }
    return []; // 'overview' and 'steps' are displayed fully in ListHeaderComponent
  }, [activeTab, filteredLogsSessions]);

  const selectedDaySessions = useMemo(() => {
    const targetKey = format(selectedCalendarDate, 'yyyy-MM-dd');
    return sessions.filter((s) => {
      const sKey = format(new Date(s.date), 'yyyy-MM-dd');
      return sKey === targetKey;
    });
  }, [sessions, selectedCalendarDate]);

  const calendarComponent = useMemo(() => (
    <View style={styles.cardWrapper}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconBox}>
          <CalendarIcon size={18} color={colors.primaryAction} />
        </View>
        <Text style={styles.cardHeaderTitle}>
          {format(new Date(), 'MMMM yyyy', {
            locale: language === 'id' ? idLocale : undefined,
          })}
        </Text>
      </View>

      <View style={styles.weekDaysHeader}>
        {(language === 'id'
          ? ['M', 'S', 'S', 'R', 'K', 'J', 'S']
          : ['S', 'M', 'T', 'W', 'T', 'F', 'S']
        ).map((d, i) => (
          <Text key={`wd-${i}`} style={styles.weekDayText}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {paddingDays.map((_, i) => (
          <View key={`pad-${i}`} style={styles.dayCell} />
        ))}
        {days.map((date, i) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const hasWorkout = sessionDateSet.has(dateStr);
          const today = isToday(date);
          const isSelected = selectedCalendarDate && isSameDay(date, selectedCalendarDate);

          return (
            <TouchableOpacity
              key={`day-${i}`}
              style={styles.dayCell}
              onPress={() => {
                triggerButtonVibration(hapticsEnabled);
                setSelectedCalendarDate(date);
              }}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.dayCircle,
                  today && !isSelected && styles.todayCircle,
                  today && isSelected && styles.todayCircleSelected,
                  !today && isSelected && styles.dayCircleSelected,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    today && !isSelected && styles.todayText,
                    today && isSelected && styles.todayTextSelected,
                    !today && isSelected && styles.dayTextSelected,
                  ]}
                >
                  {format(date, 'd')}
                </Text>
              </View>
              {hasWorkout && <View style={styles.workoutDot} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected Day Workout Inspection Card */}
      {selectedCalendarDate && (
        <View style={styles.calendarDetailCard}>
          <View style={styles.calendarDetailHeader}>
            <View style={styles.calendarDetailDateRow}>
              <Clock size={14} color={colors.primaryAction} />
              <Text style={styles.calendarDetailDateText}>
                {format(selectedCalendarDate, 'EEEE, dd MMMM yyyy', {
                  locale: language === 'id' ? idLocale : undefined,
                })}
              </Text>
            </View>
            <View
              style={[
                styles.calendarDetailBadge,
                {
                    backgroundColor:
                      selectedDaySessions.length > 0
                        ? colors.actionIconBg
                        : colors.surfaceHighlight,
                },
              ]}
            >
              <Text
                style={[
                  styles.calendarDetailBadgeText,
                  {
                    color:
                      selectedDaySessions.length > 0
                        ? colors.successBadge
                        : colors.textSecondary,
                  },
                ]}
              >
                {selectedDaySessions.length > 0
                  ? `${selectedDaySessions.length} ${t('workout') || 'Latihan'}`
                  : language === 'id'
                  ? 'Istirahat'
                  : 'Rest Day'}
              </Text>
            </View>
          </View>

          {selectedDaySessions.length > 0 ? (
            <View style={styles.calendarSessionsList}>
              {selectedDaySessions.map((sess, idx) => {
                const tmpl = templates.find((t) => t.id === sess.templateId);
                const durationMins = Math.round((sess.duration || 0) / 60);
                const exCount = sess.completedExercises?.length || 0;
                return (
                  <TouchableOpacity
                    key={sess.id || idx}
                    style={styles.calendarSessionRow}
                    onPress={() => handleOpenSessionDetail(sess)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.calendarSessionIconBox}>
                      <CheckCircle2 size={16} color={colors.successBadge} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.calendarSessionName}>
                        {tmpl?.name || t('workout')}
                      </Text>
                      <Text style={styles.calendarSessionMeta}>
                        {durationMins} {t('min_short') || 'mnt'} • {exCount} {t('exercises_completed') || 'gerakan'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontFamily: AppFonts.bold, fontSize: 11, color: colors.primaryAction }}>
                        {language === 'id' ? 'Detail' : 'Details'}
                      </Text>
                      <ChevronRight size={14} color={colors.primaryAction} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.calendarRestDayBox}>
              <Sparkles size={14} color={colors.textMuted} />
              <Text style={styles.calendarRestDayText}>
                {language === 'id'
                  ? 'Tidak ada sesi latihan selesai pada tanggal ini.'
                  : 'No completed workouts on this date.'}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  ), [days, paddingDays, sessions, selectedCalendarDate, selectedDaySessions, templates, language, colors, styles, t, handleShareSession, handleOpenSessionDetail]);

  const barChartComponent = useMemo(() => {
    const maxCount = Math.max(...chartData.map((d) => d.count), 3);
    const chartHeight = 70;
    const barWidth = 20;
    const spacing = 14;
    const chartWidth = chartData.length * (barWidth + spacing) - spacing;

    return (
      <View style={styles.cardWrapper}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconBox}>
            <BarChart3 size={18} color={colors.primaryAction} />
          </View>
          <Text style={styles.cardHeaderTitle}>{t('weekly_activity')}</Text>
        </View>

        <View style={{ alignItems: 'center', marginTop: 4 }}>
          <Svg width={chartWidth} height={chartHeight + 24}>
            {chartData.map((d, i) => {
              const barHeight = (d.count / maxCount) * chartHeight;
              const x = i * (barWidth + spacing);
              const y = chartHeight - barHeight;
              return (
                <React.Fragment key={`bar-${i}`}>
                  <Rect
                    x={x}
                    y={0}
                    width={barWidth}
                    height={chartHeight}
                    rx={5}
                    fill={colors.surfaceHighlight}
                  />
                  <Rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx={5}
                    fill={d.count > 0 ? colors.accentLime : 'transparent'}
                  />
                  <SvgText
                    x={x + barWidth / 2}
                    y={chartHeight + 17}
                    fontSize="11"
                    fill={colors.textSecondary}
                    textAnchor="middle"
                    fontWeight="700"
                  >
                    {d.day}
                  </SvgText>
                  {d.count > 0 && (
                    <SvgText
                      x={x + barWidth / 2}
                      y={Math.max(10, y - 4)}
                      fontSize="11"
                      fill={colors.textPrimary}
                      textAnchor="middle"
                      fontWeight="800"
                    >
                      {d.count}
                    </SvgText>
                  )}
                </React.Fragment>
              );
            })}
          </Svg>
        </View>
      </View>
    );
  }, [chartData, colors, styles, t]);

  const handleSelectStepDay = useCallback((dateKey: string) => {
    triggerButtonVibration(hapticsEnabled);
    setSelectedStepDayKey(dateKey);
  }, []);

  const stepInspectionCardComponent = useMemo(() => {
    if (!selectedStepDay) return null;
    return (
      <View style={styles.stepInspectionCard}>
        <View style={styles.stepInspectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepInspectionDate}>
              {format(selectedStepDay.date, 'EEEE, dd MMMM yyyy', {
                locale: language === 'id' ? idLocale : undefined,
              })}
            </Text>
            <Text style={styles.stepInspectionSub}>
              Target: {selectedStepDay.goal.toLocaleString()} {t('steps_goal_label') || 'langkah'}
            </Text>
          </View>
          <View
            style={[
              styles.stepGoalPill,
              selectedStepDay.isGoalMet ? styles.stepGoalPillMet : styles.stepGoalPillUnmet,
            ]}
          >
            {selectedStepDay.isGoalMet ? (
              <View style={styles.stepGoalPillContent}>
                <Check size={11} color={colors.successBadge} strokeWidth={3} />
                <Text style={styles.stepGoalPillTextMet}>
                  {t('goal_reached') || 'Tercapai'}
                </Text>
              </View>
            ) : (
              <Text style={styles.stepGoalPillTextUnmet}>
                {`${selectedStepDay.percent}%`}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.stepCountRow}>
          <Text style={styles.stepCountLarge}>
            {selectedStepDay.steps.toLocaleString()}
          </Text>
          <Text style={styles.stepCountUnit}>
            / {selectedStepDay.goal.toLocaleString()} {t('steps_goal_label') || 'langkah'}
          </Text>
        </View>

        <View style={styles.stepProgressTrack}>
          <View
            style={[
              styles.stepProgressFill,
              {
                width: `${Math.min(100, selectedStepDay.percent)}%`,
                backgroundColor: selectedStepDay.isGoalMet ? colors.successBadge : colors.accentSecondary,
              },
            ]}
          />
        </View>

        <View style={styles.stepMetaRow}>
          <View style={styles.stepMetaBadge}>
            <TrendingUp size={11} color={colors.textSecondary} />
            <Text style={styles.stepMetaText}>{selectedStepDay.distanceKm} km</Text>
          </View>
          <View style={styles.stepMetaBadge}>
            <Flame size={11} color={colors.textSecondary} />
            <Text style={styles.stepMetaText}>{selectedStepDay.caloriesKcal} kcal</Text>
          </View>
        </View>
      </View>
    );
  }, [selectedStepDay, colors, styles, language, t]);

  const stepActivityComponent = useMemo(() => {
    return (
      <View style={styles.cardWrapper}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIconBox, { backgroundColor: colors.actionIconBg }]}>
            <Footprints size={14} color={colors.accentSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardHeaderTitle}>
              {language === 'id' ? 'Aktivitas Langkah' : 'Step Activity'}
            </Text>
            <Text style={styles.stepGoalHint}>
              {selectedStepPeriod === '1y'
                ? language === 'id' ? '365 Hari (1 Tahun)' : '365 Days (1 Year)'
                : selectedStepPeriod === '6m'
                ? language === 'id' ? '6 Bulan Terakhir' : 'Past 6 Months'
                : selectedStepPeriod === '3m'
                ? language === 'id' ? '3 Bulan Terakhir' : 'Past 3 Months'
                : language === 'id' ? 'Bulan Ini' : 'This Month'}
            </Text>
          </View>
        </View>

        {/* Period Filter Chips */}
        <View style={styles.stepPeriodChipsRow}>
          {[
            { id: '1y', label: language === 'id' ? '1 Tahun' : '1 Year' },
            { id: '6m', label: '6 ' + (language === 'id' ? 'Bulan' : 'Months') },
            { id: '3m', label: '3 ' + (language === 'id' ? 'Bulan' : 'Months') },
            { id: '1m', label: language === 'id' ? '1 Bulan' : '1 Month' },
          ].map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.stepPeriodChip,
                selectedStepPeriod === item.id && styles.stepPeriodChipActive,
              ]}
              onPress={() => {
                triggerButtonVibration(hapticsEnabled);
                setSelectedStepPeriod(item.id as any);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.stepPeriodChipText,
                  selectedStepPeriod === item.id && styles.stepPeriodChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Step Activity Bar Chart */}
        <View style={styles.barChartContainer}>
          <View style={styles.barChartHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.barChartTitle}>
                {language === 'id' ? 'Grafik Aktivitas' : 'Activity Chart'}
              </Text>
              <Text style={styles.barChartSubtitle}>
                {barChartWeeks.reduce((a, w) => a + w.totalSteps, 0).toLocaleString()}
                {' '}{language === 'id' ? 'total langkah' : 'total steps'}
              </Text>
            </View>
          </View>

          {/* Horizontal Bar Chart */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.barChartScrollWrap}
          >
            <View style={styles.barChartPlot}>
              {barChartWeeks.map((week, idx) => {
                const maxStepsInWeek = Math.max(...week.days.map((d) => d.steps || 1));
                const chartHeight = 120;
                const barHeight = Math.min(chartHeight - 8, (maxStepsInWeek / (dailyStepGoal || 10000)) * chartHeight * 1.2);

                return (
                  <View key={idx} style={styles.barWeekCol}>
                    <View style={styles.barAxisY}>
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Text
                          key={`y-${i}`}
                          style={styles.barYTick}
                        >
                          {Math.round(((4 - i) * dailyStepGoal * 12) / 1000)}k
                        </Text>
                      ))}
                    </View>

                    <View style={styles.barContainer}>
                      <View
                        style={[
                          styles.barBackground,
                          { height: chartHeight },
                        ]}
                      >
                        {week.days.map((day, dayIdx) => (
                          <View
                            key={day.dateKey}
                            style={[
                              styles.barSegment,
                              {
                                height: barHeight / 7,
                                backgroundColor: day.isGoalMet
                                  ? colors.successBadge
                                  : day.steps > 500
                                  ? colors.accentLime
                                  : colors.warning,
                                opacity: 0.9 - (dayIdx * 0.05),
                              },
                            ]}
                          />
                        ))}
                      </View>

                      <View style={styles.barLabelRow}>
                        <Text style={styles.barWeekLabel}>{week.weekLabel}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Bar Legend */}
          <View style={styles.barLegendRow}>
            <View style={styles.barLegendItem}>
              <View style={[styles.barLegendBox, { backgroundColor: colors.surfaceHighlight }]} />
              <Text style={styles.barLegendText}>
                {language === 'id' ? '0 Langkah' : '0 Steps'}
              </Text>
            </View>
            <View style={styles.barLegendItem}>
              <View style={[styles.barLegendBox, { backgroundColor: colors.warning }]} />
              <Text style={styles.barLegendText}>
                {language === 'id' ? 'Aktif' : 'Active'}
              </Text>
            </View>
            <View style={styles.barLegendItem}>
              <View style={[styles.barLegendBox, { backgroundColor: colors.accentSecondary }]} />
              <Text style={styles.barLegendText}>
                {language === 'id' ? 'Tercapai' : 'Goal'}
              </Text>
            </View>
          </View>
        </View>

        {/* Selected Day Inspection Card */}
        {stepInspectionCardComponent}
      </View>
    );
  }, [
    barChartWeeks,
    barChartMonths,
    selectedStepDayKey,
    handleSelectStepDay,
    stepInspectionCardComponent,
    selectedStepPeriod,
    colors,
    styles,
    language,
    t,
    dailyStepGoal,
  ]);

  const renderSessionCard = useCallback((session: any) => {
    const template = templates.find((tpl) => tpl.id === session.templateId);

    // Calculate max weight used in this session for quick card preview
    let maxWeightSession = 0;
    (session.completedExercises || []).forEach((cEx: any) => {
      const targetEx = template?.exercises.find((e) => e.id === cEx.exerciseId);
      const numSets = Math.max(
        cEx.completedSets?.length || 0,
        cEx.setsDetails ? Object.keys(cEx.setsDetails).length : 0
      );
      for (let s = 0; s < numSets; s++) {
        const w = cEx.setsDetails?.[s]?.weight || targetEx?.weight;
        if (w && w > maxWeightSession) maxWeightSession = w;
      }
    });

    const dateObj = new Date(session.date);
    const dayStr = format(dateObj, 'dd');
    const monthStr = format(dateObj, 'MMM', {
      locale: language === 'id' ? idLocale : undefined,
    }).toUpperCase();

    return (
      <TouchableOpacity
        key={session.id}
        style={styles.historyCard}
        onPress={() => handleOpenSessionDetail(session)}
        activeOpacity={0.7}
      >
        <View style={styles.historyCardMainRow}>
          {/* Left: Date Tag */}
          <View style={styles.historyDateBadge}>
            <Text style={styles.historyDateDay}>{dayStr}</Text>
            <Text style={styles.historyDateMonth}>{monthStr}</Text>
          </View>

          {/* Middle: Title, set count, duration, best lift badge */}
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={styles.historyName} numberOfLines={1}>
              {template?.name || t('workout')}
            </Text>
            <View style={styles.historyMetaRow}>
              <View style={styles.historyMetaBadge}>
                <Clock size={11} color={colors.textSecondary} />
                <Text style={styles.historyMetaText}>
                  {Math.round((session.duration || 0) / 60)} {t('min_short')}
                </Text>
              </View>
              <View style={styles.historyMetaBadge}>
                <Dumbbell size={11} color={colors.textSecondary} />
                <Text style={styles.historyMetaText}>
                  {session.completedExercises?.length || 0} {t('exercises_completed')}
                </Text>
              </View>
              {maxWeightSession > 0 && (
                <View style={styles.historyMaxBadge}>
                  <Trophy size={11} color={colors.primaryAction} />
                  <Text style={styles.historyMaxText}>
                    Max {maxWeightSession} kg
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Right: Actions */}
          <View style={styles.historyRightActions}>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleDelete(session.id);
              }}
              style={styles.deleteButton}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trash2 color={colors.danger} size={15} />
            </TouchableOpacity>
            <ChevronRight size={16} color={colors.textMuted} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [templates, colors, styles, language, t, handleDelete, handleOpenSessionDetail]);

  const renderSessionItem = useCallback(({ item: session }: { item: any }) => {
    return renderSessionCard(session);
  }, [renderSessionCard]);

  const listHeaderComponent = useMemo(() => {
    return (
      <View>
        <View style={styles.headerBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{t('history')}</Text>
            <Text style={styles.headerSub}>{t('history_subtitle') || 'Review your progress & past logs'}</Text>
          </View>
          <View style={styles.headerTotalPill}>
            <Trophy size={13} color={colors.primaryAction} />
            <Text style={styles.headerTotalText}>
              {totalWorkouts} {language === 'id' ? 'Sesi' : 'Workouts'}
            </Text>
          </View>
        </View>

        {/* Segmented Control: 3 Sections [ Overview | Log Book | Steps ] */}
        <View style={styles.segmentedContainer}>
          {/* Tab 1: Overview */}
          <TouchableOpacity
            style={[
              styles.segmentedButton,
              activeTab === 'overview' && styles.segmentedButtonActive,
            ]}
            onPress={() => {
              triggerButtonVibration(hapticsEnabled);
              setActiveTab('overview');
            }}
            activeOpacity={0.8}
          >
            <BarChart3
              size={14}
              color={activeTab === 'overview' ? colors.textPrimaryOnVolt : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentedText,
                activeTab === 'overview' && styles.segmentedTextActive,
              ]}
              numberOfLines={1}
            >
              {t('history_tab_overview') || (language === 'id' ? 'Ringkasan' : 'Overview')}
            </Text>
          </TouchableOpacity>

          {/* Tab 2: Logs */}
          <TouchableOpacity
            style={[
              styles.segmentedButton,
              activeTab === 'logs' && styles.segmentedButtonActive,
            ]}
            onPress={() => {
              triggerButtonVibration(hapticsEnabled);
              setActiveTab('logs');
            }}
            activeOpacity={0.8}
          >
            <BookOpen
              size={14}
              color={activeTab === 'logs' ? colors.textPrimaryOnVolt : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentedText,
                activeTab === 'logs' && styles.segmentedTextActive,
              ]}
              numberOfLines={1}
            >
              {t('history_tab_logs') || 'Log Book'}
            </Text>
            {allReversedSessions.length > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  {
                    backgroundColor:
                      activeTab === 'logs'
                        ? colors.overlay
                        : colors.surfaceHighlight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    activeTab === 'logs' && { color: '#FFFFFF' },
                  ]}
                >
                  {allReversedSessions.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Tab 3: Steps */}
          <TouchableOpacity
            style={[
              styles.segmentedButton,
              activeTab === 'steps' && styles.segmentedButtonActive,
            ]}
            onPress={() => {
              triggerButtonVibration(hapticsEnabled);
              setActiveTab('steps');
            }}
            activeOpacity={0.8}
          >
            <Footprints
              size={14}
              color={activeTab === 'steps' ? colors.textPrimaryOnVolt : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentedText,
                activeTab === 'steps' && styles.segmentedTextActive,
              ]}
              numberOfLines={1}
            >
              {t('history_tab_steps') || (language === 'id' ? 'Langkah' : 'Steps')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: OVERVIEW CONTENT */}
        {activeTab === 'overview' && (
          <View>
            {/* Weekly Activity Bar Chart */}
            {barChartComponent}

            {/* Monthly Training Calendar */}
            {calendarComponent}

            {/* All-Time Achievements Bento */}
            <View style={styles.sectionContainer}>
              <View style={styles.allTimeSectionHeader}>
                <View style={styles.allTimeSectionLeft}>
                  <View style={styles.sectionIndicator} />
                  <Text style={styles.sectionTitle}>{t('all_time_stats')}</Text>
                </View>
                <View style={styles.allTimeBadgePill}>
                  <Trophy size={11} color={colors.primaryAction} />
                  <Text style={styles.allTimeBadgeText}>{t('milestone')}</Text>
                </View>
              </View>

              {/* Hero Card: Total Sesi Latihan */}
              <View style={styles.allTimeHeroCard}>
                <View style={styles.allTimeHeroLeft}>
                  <View style={styles.allTimeHeroIconBox}>
                    <Trophy size={20} color={colors.primaryAction} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.allTimeHeroLabel}>{t('total_workouts').toUpperCase()}</Text>
                    <View style={styles.allTimeHeroValueRow}>
                      <Text style={styles.allTimeHeroValue}>{totalWorkouts}</Text>
                      <Text style={styles.allTimeHeroUnit}>
                        {language === 'id' ? 'Sesi Latihan Selesai' : 'Workouts Completed'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Row 1: Time Dimension (2 Equal Columns) */}
              <View style={styles.allTimeStatsRow}>
                {/* Total Training Hours */}
                <View style={styles.allTimeStatCard}>
                  <View style={styles.allTimeStatTop}>
                    <Text style={styles.allTimeStatLabel} numberOfLines={1}>
                      {t('total_time_trained') || t('all_time_hours')}
                    </Text>
                    <View style={styles.allTimeStatIconBox}>
                      <Clock size={13} color={colors.primaryAction} strokeWidth={2.2} />
                    </View>
                  </View>
                  <Text style={styles.allTimeStatValue}>
                    {(totalDurationSeconds / 3600).toFixed(1)} <Text style={styles.allTimeStatUnit}>{t('hours_short')}</Text>
                  </Text>
                  <Text style={styles.allTimeStatSubtext}>{language === 'id' ? 'Total waktu' : 'Total duration'}</Text>
                </View>

                {/* Avg Duration */}
                <View style={styles.allTimeStatCard}>
                  <View style={styles.allTimeStatTop}>
                    <Text style={styles.allTimeStatLabel} numberOfLines={1}>
                      {t('avg_duration')}
                    </Text>
                    <View style={styles.allTimeStatIconBox}>
                      <BarChart3 size={13} color={colors.primaryAction} strokeWidth={2.2} />
                    </View>
                  </View>
                  <Text style={styles.allTimeStatValue}>
                    {avgDurationMins} <Text style={styles.allTimeStatUnit}>{t('min_short')}</Text>
                  </Text>
                  <Text style={styles.allTimeStatSubtext}>{language === 'id' ? 'Rata-rata per sesi' : 'Avg per workout'}</Text>
                </View>
              </View>

              {/* Row 2: Volume Dimension (2 Equal Columns) */}
              <View style={styles.allTimeStatsRow}>
                {/* Total Sets */}
                <View style={styles.allTimeStatCard}>
                  <View style={styles.allTimeStatTop}>
                    <Text style={styles.allTimeStatLabel} numberOfLines={1}>
                      {t('total_sets_completed')}
                    </Text>
                    <View style={styles.allTimeStatIconBox}>
                      <CheckCircle2 size={13} color="#10B981" strokeWidth={2.2} />
                    </View>
                  </View>
                  <Text style={styles.allTimeStatValue}>
                    {totalCompletedSets} <Text style={styles.allTimeStatUnit}>{t('sets')}</Text>
                  </Text>
                  <Text style={styles.allTimeStatSubtext}>{language === 'id' ? 'Set tuntas' : 'Completed sets'}</Text>
                </View>

                {/* Total Reps */}
                <View style={styles.allTimeStatCard}>
                  <View style={styles.allTimeStatTop}>
                    <Text style={styles.allTimeStatLabel} numberOfLines={1}>
                      {t('total_reps')}
                    </Text>
                    <View style={styles.allTimeStatIconBox}>
                      <Dumbbell size={13} color={colors.primaryAction} strokeWidth={2.2} />
                    </View>
                  </View>
                  <Text style={styles.allTimeStatValue}>
                    {totalCompletedReps.toLocaleString()} <Text style={styles.allTimeStatUnit}>{t('reps')}</Text>
                  </Text>
                  <Text style={styles.allTimeStatSubtext}>{language === 'id' ? 'Total repetisi' : 'Total reps'}</Text>
                </View>
              </View>
            </View>

            {/* Recent Workouts Preview in Overview */}
            {allReversedSessions.length > 0 && (
              <View style={{ marginTop: 4 }}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>{t('recent_workouts') || (language === 'id' ? 'Sesi Terbaru' : 'Recent Workouts')}</Text>
                    <Text style={styles.sectionSubtitle}>{t('showing_recent_sessions')}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={() => {
                      triggerButtonVibration(hapticsEnabled);
                      setActiveTab('logs');
                    }}

                    activeOpacity={0.7}>
                    <Text style={styles.viewAllButtonText}>{t('view_all') || (language === 'id' ? 'Lihat Semua' : 'View All')}</Text>
                    <ChevronRight size={13} color={colors.primaryAction} />
                  </TouchableOpacity>
                </View>

                {allReversedSessions.slice(0, 3).map((session) => renderSessionCard(session))}

                {allReversedSessions.length > 3 && (
                  <TouchableOpacity
                    style={styles.moreLogsCardBtn}
                    onPress={() => {
                      triggerButtonVibration(hapticsEnabled);
                      setActiveTab('logs');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.moreLogsCardText}>
                      {language === 'id'
                        ? `Buka Log Book (${allReversedSessions.length} Sesi)`
                        : `View All Logs (${allReversedSessions.length} Workouts)`}
                    </Text>
                    <ChevronRight size={15} color={colors.primaryAction} strokeWidth={2.5} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* TAB 2: LOGS TAB HEADER CONTROLS */}
        {activeTab === 'logs' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>{t('history_tab_logs') || 'Log Book'}</Text>
                <Text style={styles.sectionSubtitle}>{t('showing_recent_sessions')}</Text>
              </View>
            </View>

            <View style={styles.logsControlsWrapper}>
              {/* Search Input */}
              <View style={styles.searchBarContainer}>
                <Search size={15} color={colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('search_history_placeholder')}
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  clearButtonMode="while-editing"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}

                    activeOpacity={0.7}>
                    <X size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Month Filter Chips */}
              <View style={styles.filterChipsRow}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedFilter === 'all' && styles.filterChipActive,
                  ]}
                  onPress={() => {
                    triggerButtonVibration(hapticsEnabled);
                    setSelectedFilter('all');
                  }}

                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedFilter === 'all' && styles.filterChipTextActive,
                    ]}
                  >
                    {t('filter_all')} ({allReversedSessions.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedFilter === 'this_month' && styles.filterChipActive,
                  ]}
                  onPress={() => {
                    triggerButtonVibration(hapticsEnabled);
                    setSelectedFilter('this_month');
                  }}

                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedFilter === 'this_month' && styles.filterChipTextActive,
                    ]}
                  >
                    {t('filter_this_month')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedFilter === 'last_month' && styles.filterChipActive,
                  ]}
                  onPress={() => {
                    triggerButtonVibration(hapticsEnabled);
                    setSelectedFilter('last_month');
                  }}

                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedFilter === 'last_month' && styles.filterChipTextActive,
                    ]}
                  >
                    {t('filter_last_month')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Template / Routine Filter Chips */}
              {templates.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.templateChipsRow}
                >
                  <TouchableOpacity
                    style={[
                      styles.templateFilterChip,
                      selectedTemplateFilter === 'all' && styles.templateFilterChipActive,
                    ]}
                    onPress={() => {
                      triggerButtonVibration(hapticsEnabled);
                      setSelectedTemplateFilter('all');
                    }}

                    activeOpacity={0.7}>
                    <Dumbbell
                      size={11}
                      color={
                        selectedTemplateFilter === 'all'
                          ? colors.textPrimaryOnVolt
                          : colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.templateFilterChipText,
                        selectedTemplateFilter === 'all' && styles.templateFilterChipTextActive,
                      ]}
                    >
                      {t('filter_all_templates')}
                    </Text>
                  </TouchableOpacity>

                  {templates.map((tmpl) => {
                    const isSelected = selectedTemplateFilter === tmpl.id;
                    const tmplCount = templateSessionCounts[tmpl.id] || 0;
                    return (
                      <TouchableOpacity
                        key={tmpl.id}
                        style={[
                          styles.templateFilterChip,
                          isSelected && styles.templateFilterChipActive,
                        ]}
                        onPress={() => {
                          triggerButtonVibration(hapticsEnabled);
                          setSelectedTemplateFilter(isSelected ? 'all' : tmpl.id);
                        }}

                        activeOpacity={0.7}>
                        <Text
                          style={[
                            styles.templateFilterChipText,
                            isSelected && styles.templateFilterChipTextActive,
                          ]}
                        >
                          {tmpl.name} ({tmplCount})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              <View style={styles.logsCountRow}>
                <Text style={styles.logsCountText}>
                  {filteredLogsSessions.length} {t('total_logs_count')}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* TAB 3: STEPS TAB CONTENT */}
        {activeTab === 'steps' && (
          <View>
            {stepActivityComponent}

            {/* 4-Tile Step Bento Grid */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>{t('steps_history_title') || 'Ringkasan Langkah'}</Text>

              <View style={styles.statsGrid}>
                {/* Tile 1: Total Steps in Selected Period (Wide Hero Tile) */}
                <View style={[styles.statCard, styles.statCardWide]}>
                  <View style={styles.statTopRow}>
                    <Text style={styles.statLabel}>
                      {language === 'id' ? 'Total Langkah' : 'Total Steps'} (
                      {selectedStepPeriod === '1y'
                        ? language === 'id' ? '1 Tahun' : '1 Year'
                        : selectedStepPeriod === '6m'
                        ? '6 ' + (language === 'id' ? 'Bulan' : 'Months')
                        : selectedStepPeriod === '3m'
                        ? '3 ' + (language === 'id' ? 'Bulan' : 'Months')
                        : language === 'id' ? '1 Bulan' : '1 Month'}
                      )
                    </Text>
                    <View style={[styles.statIconBadge, { backgroundColor: colors.actionIconBg }]}>
                      <Footprints size={14} color={colors.accentSecondary} strokeWidth={2.2} />
                    </View>
                  </View>
                  <View style={styles.statHeroRow}>
                    <Text style={[styles.statValue, { color: colors.primaryAction }]} numberOfLines={1} adjustsFontSizeToFit>
                      {stepPeriodStats.totalSteps.toLocaleString()}
                    </Text>
                    <Text style={styles.statSubtext}>{t('steps_goal_label') || 'langkah'}</Text>
                  </View>
                </View>

                {/* Tile 2: Daily Average Steps */}
                <View style={styles.statCard}>
                  <View style={styles.statTopRow}>
                    <Text style={styles.statLabel} numberOfLines={1}>{t('steps_avg_daily') || 'Rata-rata / Hari'}</Text>
                    <View style={[styles.statIconBadge, { backgroundColor: colors.actionIconBg }]}>
                      <TrendingUp size={13} color="#38BDF8" />
                    </View>
                  </View>
                  <Text style={styles.statValue}>{stepPeriodStats.avgSteps.toLocaleString()}</Text>
                  <Text style={styles.statSubtext}>{t('steps_goal_label') || 'langkah'} / {t('days_count') || 'hari'}</Text>
                </View>

                {/* Tile 3: Goal Reached Count */}
                <View style={styles.statCard}>
                  <View style={styles.statTopRow}>
                    <Text style={styles.statLabel} numberOfLines={1}>{t('steps_goal_hit') || 'Target Tercapai'}</Text>
                    <View style={[styles.statIconBadge, { backgroundColor: colors.actionIconBg }]}>
                      <Target size={13} color={colors.successBadge} />
                    </View>
                  </View>
                  <Text style={styles.statValue}>
                    {stepPeriodStats.goalsMetCount} <Text style={styles.statUnit}>/ {stepPeriodStats.daysCount}</Text>
                  </Text>
                  <Text style={styles.statSubtext}>{t('days_count') || 'hari'}</Text>
                </View>

                {/* Tile 4: Distance & Calories (Wide) */}
                <View style={[styles.statCard, styles.statCardWide]}>
                  <View style={styles.statTopRow}>
                    <Text style={styles.statLabel}>{t('distance_and_calories') || 'Jarak & Kalori'}</Text>
                    <View style={[styles.statIconBadge, { backgroundColor: colors.actionIconBg }]}>
                      <Flame size={13} color={colors.danger} />
                    </View>
                  </View>
                  <View style={styles.stepDistCalRow}>
                    <View style={styles.stepDistCalCol}>
                      <Text style={styles.stepDistCalVal}>{stepPeriodStats.totalDistKm} km</Text>
                      <Text style={styles.statSubtext}>{t('distance_covered')}</Text>
                    </View>
                    <View style={styles.stepDistCalDivider} />
                    <View style={styles.stepDistCalCol}>
                      <Text style={styles.stepDistCalVal}>{stepPeriodStats.totalCalories.toLocaleString()} kcal</Text>
                      <Text style={styles.statSubtext}>{t('calories_burned')}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  }, [
    activeTab,
    allReversedSessions,
    templates,
    templateSessionCounts,
    searchQuery,
    selectedFilter,
    selectedTemplateFilter,
    barChartComponent,
    calendarComponent,
    totalWorkouts,
    totalCompletedReps,
    totalDurationSeconds,
    totalCompletedSets,
    avgDurationMins,
    stepPeriodStats,
    selectedStepPeriod,
    renderSessionCard,
    language,
    colors,
    styles,
    t,
  ]);

  const listFooterComponent = useMemo(() => {
    return <View style={{ height: 100 }} />;
  }, []);

  const renderEmptyList = () => {
    if (activeTab !== 'logs') {
      return null;
    }
    return (
      <View style={styles.emptyCard}>
        <CalendarIcon size={32} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>{t('no_history_yet')}</Text>
        <Text style={styles.emptySub}>{t('tap_add_routine')}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList<any>
        data={displayedData}
        keyExtractor={(item: any, index) => item?.id || String(index)}
        renderItem={renderSessionItem}
        ListHeaderComponent={listHeaderComponent}
        ListFooterComponent={listFooterComponent}
        ListEmptyComponent={renderEmptyList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
      />

      {selectedShareSession && (
        <WorkoutSummaryModal
          visible={selectedShareSession.visible}
          workoutName={selectedShareSession.workoutName}
          duration={selectedShareSession.duration}
          exercises={selectedShareSession.exercises}
          streak={selectedShareSession.streak}
          totalReps={selectedShareSession.totalReps}
          maxWeight={selectedShareSession.maxWeight}
          date={selectedShareSession.date}
          onClose={() => setSelectedShareSession(null)}
        />
      )}

      {selectedDetailSession && (
        <WorkoutDetailModal
          visible={!!selectedDetailSession}
          session={selectedDetailSession}
          template={templates.find((t) => t.id === selectedDetailSession.templateId)}
          onClose={() => setSelectedDetailSession(null)}
          onShare={(sess) => {
            setSelectedDetailSession(null);
            handleShareSession(sess);
          }}
          onDelete={(id) => {
            setSelectedDetailSession(null);
            handleDelete(id);
          }}
        />
      )}
    </View>
  );
}

const getStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    scrollContent: {
      paddingTop: Platform.OS === 'ios' ? 54 : 40,
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerTitle: {
      fontFamily: AppFonts.extraBold,
      fontSize: 24,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.5,
    },
    headerSub: {
      fontFamily: AppFonts.medium,
      fontSize: 13,
      color: c.textSecondary,
      fontWeight: '500',
      marginTop: 2,
    },
    headerTotalPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      backgroundColor: c.elevatedSurface || c.surfaceHighlight,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    headerTotalText: {
      fontFamily: AppFonts.bold,
      fontSize: 12,
      color: c.primaryAction,
      fontWeight: '700',
    },


    // Card Wrapper
    cardWrapper: {
      backgroundColor: c.cardSurface,
      borderRadius: 16,
      padding: 14,
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
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    cardIconBox: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: c.surfaceHighlight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardHeaderTitle: {
      fontFamily: AppFonts.bold,
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
      letterSpacing: -0.2,
    },

    // Calendar
    weekDaysHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    weekDayText: {
      fontFamily: AppFonts.bold,
      color: c.textSecondary,
      width: 34,
      textAlign: 'center',
      fontWeight: '700',
      fontSize: 12,
    },
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
    },
    dayCell: {
      width: '14.28%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: 2,
    },
    dayCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
    todayCircle: {
      backgroundColor: c.actionIconBg,
      borderWidth: 1.5,
      borderColor: c.primaryAction,
    },
    todayCircleSelected: {
      backgroundColor: c.primaryAction,
      borderWidth: 1.5,
      borderColor: '#FFFFFF',
    },
    dayCircleSelected: {
      backgroundColor: c.surfaceHighlight,
      borderWidth: 1.5,
      borderColor: c.primaryAction,
    },
    dayText: {
      fontFamily: AppFonts.semiBold,
      color: c.textPrimary,
      fontSize: 12,
      fontWeight: '600',
    },
    todayText: {
      fontFamily: AppFonts.bold,
      color: c.primaryAction,
      fontWeight: '800',
    },
    todayTextSelected: {
      fontFamily: AppFonts.extraBold,
      color: c.cardSurface,
      fontWeight: '900',
    },
    dayTextSelected: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    workoutDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: c.accentLime,
    },

    // Stats Section
    sectionContainer: {
      marginBottom: 14,
    },
    sectionTitle: {
      fontFamily: AppFonts.bold,
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
      letterSpacing: -0.2,
      marginBottom: 8,
    },

    // All-Time Section
    allTimeSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    allTimeSectionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    sectionIndicator: {
      width: 3,
      height: 14,
      borderRadius: 1.5,
      backgroundColor: c.primaryAction,
    },
    allTimeBadgePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.actionIconBg,
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    allTimeBadgeText: {
      fontFamily: AppFonts.bold,
      fontSize: 9,
      color: c.primaryAction,
      letterSpacing: 0.8,
    },
    allTimeHeroCard: {
      backgroundColor: c.cardSurface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      ...Platform.select({
        ios: {
          shadowColor: c.shadowColor,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: c.shadowOpacity,
          shadowRadius: 2,
        },
        android: {
          elevation: 1,
        },
      }),
    },
    allTimeHeroLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    allTimeHeroIconBox: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: c.actionIconBg,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    allTimeHeroLabel: {
      fontFamily: AppFonts.bold,
      fontSize: 10,
      color: c.textMuted,
      letterSpacing: 0.8,
      marginBottom: 2,
    },
    allTimeHeroValueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
    },
    allTimeHeroValue: {
      fontFamily: AppFonts.extraBold,
      fontSize: 24,
      color: c.primaryAction,
      fontVariant: ['tabular-nums'],
    },
    allTimeHeroUnit: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      color: c.textSecondary,
    },
    allTimeStatsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    allTimeStatCard: {
      flex: 1,
      backgroundColor: c.cardSurface,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      justifyContent: 'space-between',
      minHeight: 84,
      ...Platform.select({
        ios: {
          shadowColor: c.shadowColor,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: c.shadowOpacity,
          shadowRadius: 2,
        },
        android: {
          elevation: 1,
        },
      }),
    },
    allTimeStatTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    allTimeStatLabel: {
      fontFamily: AppFonts.semiBold,
      fontSize: 11,
      color: c.textSecondary,
      flex: 1,
      marginRight: 4,
    },
    allTimeStatIconBox: {
      width: 24,
      height: 24,
      borderRadius: 7,
      backgroundColor: c.elevatedSurface || c.surfaceHighlight,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    allTimeStatValue: {
      fontFamily: AppFonts.extraBold,
      fontSize: 18,
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
      marginBottom: 2,
    },
    allTimeStatUnit: {
      fontFamily: AppFonts.semiBold,
      fontSize: 12,
      color: c.textSecondary,
    },
    allTimeStatSubtext: {
      fontFamily: AppFonts.medium,
      fontSize: 11,
      color: c.textMuted,
    },

    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    statCard: {
      width: '48.8%',
      backgroundColor: c.cardSurface,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      justifyContent: 'space-between',
    },
    statCardWide: {
      width: '100%',
    },
    statTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    statHeroRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
    statLabel: {
      fontFamily: AppFonts.bold,
      fontSize: 11,
      color: c.textSecondary,
      fontWeight: '700',
      letterSpacing: 0.2,
      flex: 1,
    },
    statIconBadge: {
      width: 26,
      height: 26,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statValue: {
      fontFamily: AppFonts.extraBold,
      fontSize: 20,
      fontWeight: '800',
      color: c.textPrimary,
      marginBottom: 2,
      letterSpacing: -0.4,
      fontVariant: ['tabular-nums'],
    },
    statUnit: {
      fontFamily: AppFonts.semiBold,
      fontSize: 12,
      fontWeight: '600',
      color: c.textSecondary,
    },
    statSubtext: {
      fontFamily: AppFonts.medium,
      fontSize: 11,
      fontWeight: '500',
      color: c.textMuted,
    },

    // History List Items
    historyCard: {
      backgroundColor: c.cardSurface,
      borderRadius: 14,
      padding: 12,
      paddingHorizontal: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    historyCardMainRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    historyDateBadge: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: c.elevatedSurface || c.surfaceHighlight,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    historyDateDay: {
      fontFamily: AppFonts.extraBold,
      fontSize: 16,
      fontWeight: '900',
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
      lineHeight: 18,
    },
    historyDateMonth: {
      fontFamily: AppFonts.bold,
      fontSize: 9,
      fontWeight: '700',
      color: c.primaryAction,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      marginTop: 1,
    },
    historyName: {
      fontFamily: AppFonts.bold,
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
      marginBottom: 4,
    },
    historyMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    historyMetaBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.elevatedSurface || c.surfaceHighlight,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
      gap: 4,
    },
    historyMetaText: {
      fontFamily: AppFonts.medium,
      fontSize: 11,
      color: c.textSecondary,
      fontWeight: '500',
      fontVariant: ['tabular-nums'],
    },
    historyMaxBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.actionIconBg,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
      gap: 4,
    },
    historyMaxText: {
      fontFamily: AppFonts.bold,
      fontSize: 11,
      color: c.primaryAction,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    historyRightActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    deleteButton: {
      width: 32,
      height: 32,
      backgroundColor: c.elevatedSurface || c.surfaceHighlight,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    shareButton: {
      width: 32,
      height: 32,
      backgroundColor: c.elevatedSurface || c.surfaceHighlight,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyCard: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.cardSurface,
      borderRadius: 16,
      padding: 24,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      borderStyle: 'dashed',
    },
    emptyTitle: {
      fontFamily: AppFonts.semiBold,
      fontSize: 14,
      fontWeight: '600',
      color: c.textPrimary,
      marginTop: 10,
    },
    emptySub: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 3,
    },

    // Segmented Tab Controls
    segmentedContainer: {
      flexDirection: 'row',
      backgroundColor: c.elevatedSurface || c.surfaceHighlight,
      borderRadius: 12,
      padding: 4,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    segmentedButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderRadius: 9,
      gap: 6,
    },
    segmentedButtonActive: {
      backgroundColor: c.primaryAction,
    },
    segmentedText: {
      fontFamily: AppFonts.semiBold,
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
    },
    segmentedTextActive: {
      fontFamily: AppFonts.bold,
      fontWeight: '700',
      color: c.textPrimaryOnVolt,
    },
    tabBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
    },
    tabBadgeText: {
      fontFamily: AppFonts.bold,
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
    },

    // Section Header Row (Overview)
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    sectionSubtitle: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      color: c.textMuted,
      marginTop: 1,
    },
    viewAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingVertical: 4,
      paddingHorizontal: 8,
      backgroundColor: c.surfaceHighlight,
      borderRadius: 6,
    },
    viewAllButtonText: {
      fontFamily: AppFonts.bold,
      fontSize: 12,
      fontWeight: '700',
      color: c.primaryAction,
    },

    // More Logs Card Button (Overview bottom)
    moreLogsCardBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.cardSurface,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 16,
      gap: 8,
      width: '100%',
    },
    moreLogsCardText: {
      fontFamily: AppFonts.bold,
      fontSize: 14,
      fontWeight: '700',
      color: c.primaryAction,
    },

    // Logs Tab Header Controls
    logsControlsWrapper: {
      marginBottom: 12,
    },
    searchBarContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.elevatedSurface || c.surfaceHighlight,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 9,
      gap: 10,
      marginBottom: 10,
    },
    searchInput: {
      flex: 1,
      fontFamily: AppFonts.medium,
      fontSize: 13,
      color: c.textPrimary,
      padding: 0,
    },
    filterChipsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 10,
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: c.cardSurface,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    filterChipActive: {
      backgroundColor: c.primaryAction,
      borderColor: c.primaryAction,
    },
    filterChipText: {
      fontFamily: AppFonts.semiBold,
      fontSize: 12,
      fontWeight: '600',
      color: c.textSecondary,
    },
    filterChipTextActive: {
      fontFamily: AppFonts.bold,
      fontWeight: '700',
      color: c.textPrimaryOnVolt,
    },
    logsCountRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      paddingHorizontal: 2,
      marginTop: 4,
    },
    logsCountText: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      color: c.textMuted,
      fontWeight: '500',
      fontVariant: ['tabular-nums'],
    },
    templateChipsRow: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 2,
      marginBottom: 8,
    },
    templateFilterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: c.cardSurface,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    templateFilterChipActive: {
      backgroundColor: c.primaryAction,
      borderColor: c.primaryAction,
    },
    templateFilterChipText: {
      fontFamily: AppFonts.semiBold,
      fontSize: 12,
      fontWeight: '600',
      color: c.textSecondary,
    },
    templateFilterChipTextActive: {
      fontFamily: AppFonts.bold,
      fontWeight: '700',
      color: c.textPrimaryOnVolt,
    },

    // Step History Styles
    stepGoalHint: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      color: c.textMuted,
      marginTop: 1,
    },
    stepDistCalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
    },
    stepDistCalCol: {
      flex: 1,
    },
    stepDistCalVal: {
      fontFamily: AppFonts.bold,
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
      marginBottom: 2,
    },
    stepDistCalDivider: {
      width: 1,
      height: 26,
      backgroundColor: c.borderSubtle,
      marginHorizontal: 10,
    },

    // Calendar Selected Day Inspection Card
    calendarDetailCard: {
      marginTop: 10,
      padding: 10,
      borderRadius: 12,
      backgroundColor: c.surfaceHighlight,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    calendarDetailHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    calendarDetailDateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
    },
    calendarDetailDateText: {
      fontFamily: AppFonts.bold,
      fontSize: 13,
      fontWeight: '700',
      color: c.textPrimary,
    },
    calendarDetailBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    calendarDetailBadgeText: {
      fontFamily: AppFonts.bold,
      fontSize: 11,
      fontWeight: '700',
    },
    calendarSessionsList: {
      gap: 8,
      marginTop: 6,
    },
    calendarSessionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderRadius: 10,
      backgroundColor: c.cardSurface,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      gap: 10,
    },
    calendarSessionIconBox: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: c.actionIconBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    calendarSessionName: {
      fontFamily: AppFonts.bold,
      fontSize: 14,
      fontWeight: '700',
      color: c.textPrimary,
    },
    calendarSessionMeta: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      color: c.textMuted,
      marginTop: 2,
    },
    calendarSessionShareBtn: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: c.surfaceHighlight,
    },
    calendarRestDayBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 6,
      paddingHorizontal: 4,
    },
    calendarRestDayText: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      color: c.textMuted,
    },

    // Step Period Filter Chips
    stepPeriodChipsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
      marginBottom: 10,
    },
    stepPeriodChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: c.surfaceHighlight,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    stepPeriodChipActive: {
      backgroundColor: c.dateBadgeSelected,
      borderColor: c.dateBadgeSelected,
    },
    stepPeriodChipText: {
      fontFamily: AppFonts.semiBold,
      fontSize: 12,
      fontWeight: '600',
      color: c.textSecondary,
    },
    stepPeriodChipTextActive: {
      fontFamily: AppFonts.bold,
      fontWeight: '700',
      color: c.dateTextSelected,
    },

    // Step Activity Bar Chart
    barChartContainer: {
      marginTop: 8,
      marginBottom: 8,
    },
    barChartHeader: {
      marginBottom: 8,
    },
    barChartTitle: {
      fontFamily: AppFonts.extraBold,
      fontSize: 16,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.3,
    },
    barChartSubtitle: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
    },
    barChartScrollWrap: {
      paddingVertical: 4,
      paddingHorizontal: 4,
    },
    barChartPlot: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 12,
    },
    barWeekCol: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 2,
    },
    barAxisY: {
      height: 120,
      justifyContent: 'space-between',
      paddingRight: 6,
    },
    barYTick: {
      fontFamily: AppFonts.medium,
      fontSize: 9,
      color: c.textMuted,
      textAlign: 'right',
    },
    barContainer: {
      alignItems: 'center',
    },
    barBackground: {
      width: 44,
      justifyContent: 'flex-end',
      paddingLeft: 2,
      borderLeftWidth: 1,
      borderLeftColor: c.borderSubtle,
      paddingBottom: 4,
    },
    barSegment: {
      width: 8,
      borderRadius: 1,
      marginBottom: 1,
      alignSelf: 'center',
    },
    barLabelRow: {
      marginTop: 4,
      alignItems: 'center',
    },
    barWeekLabel: {
      fontFamily: AppFonts.semiBold,
      fontSize: 10,
      color: c.textSecondary,
    },
    barLegendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 8,
      marginBottom: 4,
    },
    barLegendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    barLegendBox: {
      width: 10,
      height: 10,
      borderRadius: 2,
    },
    barLegendText: {
      fontFamily: AppFonts.medium,
      fontSize: 11,
      color: c.textMuted,
    },

    // Step Inspection Card
    stepInspectionCard: {
      backgroundColor: c.surfaceHighlight,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      marginTop: 8,
    },
    stepInspectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    stepInspectionDate: {
      fontFamily: AppFonts.bold,
      fontSize: 14,
      fontWeight: '700',
      color: c.textPrimary,
    },
    stepInspectionSub: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      color: c.textMuted,
      marginTop: 2,
    },
    stepGoalPill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    stepGoalPillMet: {
      backgroundColor: c.actionIconBg,
      borderWidth: 1,
      borderColor: c.successBadge,
    },
    stepGoalPillUnmet: {
      backgroundColor: c.actionIconBg,
      borderWidth: 1,
      borderColor: c.accentSecondary,
    },
    stepGoalPillContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    stepGoalPillTextMet: {
      fontFamily: AppFonts.bold,
      fontSize: 11,
      fontWeight: '700',
      color: c.successBadge,
    },
    stepGoalPillTextUnmet: {
      fontFamily: AppFonts.bold,
      fontSize: 11,
      fontWeight: '700',
      color: c.accentSecondary,
    },
    stepCountRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 5,
      marginBottom: 6,
    },
    stepCountLarge: {
      fontFamily: AppFonts.extraBold,
      fontSize: 22,
      fontWeight: '900',
      color: c.textPrimary,
    },
    stepCountUnit: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      color: c.textSecondary,
    },
    stepProgressTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: c.borderSubtle,
      overflow: 'hidden',
      marginBottom: 8,
    },
    stepProgressFill: {
      height: '100%',
      borderRadius: 3,
    },
    stepMetaRow: {
      flexDirection: 'row',
      gap: 8,
    },
    stepMetaBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.cardSurface,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    stepMetaText: {
      fontFamily: AppFonts.semiBold,
      fontSize: 11,
      fontWeight: '600',
      color: c.textSecondary,
    },
  });

