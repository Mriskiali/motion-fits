import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Platform, TextInput, Pressable, ScrollView } from 'react-native';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useAlertStore } from '@/store/useAlertStore';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, subDays, subMonths, isSameMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';
import { Trash2, Calendar as CalendarIcon, BarChart3, Clock, CheckCircle2, Dumbbell, Share2, Search, ChevronRight, Sparkles, BookOpen } from 'lucide-react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { useTranslation } from '@/hooks/useTranslation';
import { AppFonts } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import WorkoutSummaryModal from '@/components/WorkoutSummaryModal';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import SpotlightGuideOverlay from '@/components/SpotlightGuideOverlay';

export default function HistoryScreen() {
  const sessions = useWorkoutStore((state) => state.sessions);
  const templates = useWorkoutStore((state) => state.templates);
  const deleteSession = useWorkoutStore((state) => state.deleteSession);
  const showAlert = useAlertStore((state) => state.showAlert);
  const colors = useThemeColors();
  const styles = getStyles(colors);
  const { t, language } = useTranslation();
  const isTourActive = useOnboardingStore((state) => state.isTourActive);
  const currentStep = useOnboardingStore((state) => state.currentStep);
  const completeTour = useOnboardingStore((state) => state.completeTour);
  const skipTour = useOnboardingStore((state) => state.skipTour);

  const [activeTab, setActiveTab] = useState<'overview' | 'logs'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'this_month' | 'last_month'>('all');
  const [selectedTemplateFilter, setSelectedTemplateFilter] = useState<string>('all');

  const [selectedShareSession, setSelectedShareSession] = useState<{
    visible: boolean;
    workoutName: string;
    duration: number;
    exercises: { name: string; setsCount: number; weight?: number }[];
    totalVolume: number;
    streak: number;
  } | null>(null);

  const handleShareSession = useCallback((session: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const template = templates.find((tpl) => tpl.id === session.templateId);
    let volume = 0;
    const exercisesSummary = (session.completedExercises || []).map((cEx: any) => {
      const templateEx = template?.exercises.find((e) => e.id === cEx.exerciseId);
      const setsCount = cEx.completedSets?.length || 0;
      const weight = templateEx?.weight || 0;
      (cEx.completedSets || []).forEach((reps: number) => {
        volume += (reps || 0) * weight;
      });
      return {
        name: templateEx?.name || 'Exercise',
        setsCount,
        weight: templateEx?.weight,
      };
    });

    setSelectedShareSession({
      visible: true,
      workoutName: template?.name || 'Workout',
      duration: session.duration || 0,
      exercises: exercisesSummary,
      totalVolume: volume,
      streak: 1,
    });
  }, [templates]);

  const handleDelete = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showAlert(
      t('delete_workout'),
      t('delete_workout_confirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => deleteSession(id),
        },
      ]
    );
  }, [showAlert, deleteSession, t]);

  // Memoized month dates & grid padding
  const { days, paddingDays } = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    const monthDays = eachDayOfInterval({ start, end });
    const startDayOfWeek = monthDays[0].getDay(); // 0 is Sunday
    const pad = Array.from({ length: startDayOfWeek }).map((_, i) => i);
    return { days: monthDays, paddingDays: pad };
  }, []);

  // Memoized stats calculation
  const { totalWorkouts, totalDurationSeconds, avgDurationMins, totalVolume } = useMemo(() => {
    const count = sessions.length;
    const duration = sessions.reduce((acc, curr) => acc + (curr.duration || 0), 0);
    const avgMins = count ? Math.round(duration / count / 60) : 0;
    const volume = sessions.reduce((acc, session) => {
      let sessionVolume = 0;
      session.completedExercises?.forEach((ex) => {
        sessionVolume += ex.completedSets?.length || 0;
      });
      return acc + sessionVolume;
    }, 0);
    return { totalWorkouts: count, totalDurationSeconds: duration, avgDurationMins: avgMins, totalVolume: volume };
  }, [sessions]);

  // Memoized 7-day bar chart data
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), 6 - i));
    return last7Days.map((date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const count = sessions.filter(
        (s) => format(new Date(s.date), 'yyyy-MM-dd') === dateStr
      ).length;
      return {
        day: format(date, 'EE', {
          locale: language === 'id' ? idLocale : undefined,
        }).charAt(0),
        count,
      };
    });
  }, [sessions, language]);

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

  // Data to display in FlatList
  const displayedSessions = useMemo(() => {
    if (activeTab === 'overview') {
      return allReversedSessions.slice(0, 5); // Only 5 latest for Overview
    }
    return filteredLogsSessions; // Full filtered logs
  }, [activeTab, allReversedSessions, filteredLogsSessions]);

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
          const hasWorkout = sessions.some(
            (s) => format(new Date(s.date), 'yyyy-MM-dd') === dateStr
          );
          const today = isToday(date);

          return (
            <View key={`day-${i}`} style={styles.dayCell}>
              <View
                style={[
                  styles.dayCircle,
                  today && styles.todayCircle,
                ]}
              >
                <Text style={[styles.dayText, today && styles.todayText]}>
                  {format(date, 'd')}
                </Text>
              </View>
              {hasWorkout && <View style={styles.workoutDot} />}
            </View>
          );
        })}
      </View>
    </View>
  ), [days, paddingDays, sessions, language, colors, styles]);

  const barChartComponent = useMemo(() => {
    const maxCount = Math.max(...chartData.map((d) => d.count), 3);
    const chartHeight = 110;
    const barWidth = 26;
    const spacing = 16;
    const chartWidth = chartData.length * (barWidth + spacing) - spacing;

    return (
      <View style={styles.cardWrapper}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconBox}>
            <BarChart3 size={18} color={colors.primaryAction} />
          </View>
          <Text style={styles.cardHeaderTitle}>{t('weekly_activity')}</Text>
        </View>

        <View style={{ alignItems: 'center', marginTop: 12 }}>
          <Svg width={chartWidth} height={chartHeight + 30}>
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
                    rx={8}
                    fill={colors.surfaceHighlight}
                  />
                  <Rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx={8}
                    fill={d.count > 0 ? colors.accentLime : 'transparent'}
                  />
                  <SvgText
                    x={x + barWidth / 2}
                    y={chartHeight + 20}
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
                      y={Math.max(12, y - 6)}
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

  const listHeaderComponent = useMemo(() => {
    return (
      <View>
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>{t('history')}</Text>
          <Text style={styles.headerSub}>{t('history_subtitle') || 'Review your progress & past logs'}</Text>
        </View>

        {/* Segmented Control: Overview vs Logs */}
        <View style={styles.segmentedContainer}>
          <TouchableOpacity
            style={[
              styles.segmentedButton,
              activeTab === 'overview' && styles.segmentedButtonActive,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('overview');
            }}
            activeOpacity={0.8}
          >
            <BarChart3
              size={16}
              color={activeTab === 'overview' ? colors.dateTextSelected : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentedText,
                activeTab === 'overview' && styles.segmentedTextActive,
              ]}
            >
              {t('history_tab_overview')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentedButton,
              activeTab === 'logs' && styles.segmentedButtonActive,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('logs');
            }}
            activeOpacity={0.8}
          >
            <BookOpen
              size={16}
              color={activeTab === 'logs' ? colors.dateTextSelected : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentedText,
                activeTab === 'logs' && styles.segmentedTextActive,
              ]}
            >
              {t('history_tab_logs')}
            </Text>
            {allReversedSessions.length > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  {
                    backgroundColor:
                      activeTab === 'logs'
                        ? 'rgba(0, 0, 0, 0.2)'
                        : colors.surfaceHighlight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    activeTab === 'logs' && { color: colors.dateTextSelected },
                  ]}
                >
                  {allReversedSessions.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* OVERVIEW TAB CONTENT */}
        {activeTab === 'overview' && (
          <View>
            {barChartComponent}
            {calendarComponent}

            {/* All-Time Achievements Grid */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>{t('all_time_stats')}</Text>

              <View style={styles.statsGrid}>
                {/* Tile 1: Total Lifetime Workouts */}
                <View style={styles.statCard}>
                  <View style={styles.statTopRow}>
                    <Text style={styles.statLabel}>{t('total_workouts')}</Text>
                    <View style={[styles.statIconBadge, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                      <Dumbbell size={16} color="#3B82F6" />
                    </View>
                  </View>
                  <Text style={styles.statValue}>{totalWorkouts}</Text>
                  <Text style={styles.statSubtext}>{t('completed')}</Text>
                </View>

                {/* Tile 2: Total Lifetime Training Hours */}
                <View style={styles.statCard}>
                  <View style={styles.statTopRow}>
                    <Text style={styles.statLabel}>{t('total_time_trained')}</Text>
                    <View style={[styles.statIconBadge, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                      <Clock size={16} color="#F59E0B" />
                    </View>
                  </View>
                  <Text style={styles.statValue}>
                    {(totalDurationSeconds / 3600).toFixed(1)} <Text style={styles.statUnit}>{t('hours_short')}</Text>
                  </Text>
                  <Text style={styles.statSubtext}>{t('total')}</Text>
                </View>

                {/* Tile 3: Total Lifetime Sets */}
                <View style={styles.statCard}>
                  <View style={styles.statTopRow}>
                    <Text style={styles.statLabel}>{t('total_sets_completed')}</Text>
                    <View style={[styles.statIconBadge, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
                      <CheckCircle2 size={16} color="#22C55E" />
                    </View>
                  </View>
                  <Text style={styles.statValue}>{totalVolume}</Text>
                  <Text style={styles.statSubtext}>{t('sets')}</Text>
                </View>

                {/* Tile 4: Lifetime Avg Duration */}
                <View style={styles.statCard}>
                  <View style={styles.statTopRow}>
                    <Text style={styles.statLabel}>{t('avg_duration')}</Text>
                    <View style={[styles.statIconBadge, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
                      <BarChart3 size={16} color="#6366F1" />
                    </View>
                  </View>
                  <Text style={styles.statValue}>
                    {avgDurationMins} <Text style={styles.statUnit}>{t('min_short')}</Text>
                  </Text>
                  <Text style={styles.statSubtext}>per {t('workout')}</Text>
                </View>
              </View>
            </View>

            {/* Recent Sessions Header with Quick Switch to Full Logs */}
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>{t('recent_sessions')}</Text>
                <Text style={styles.sectionSubtitle}>{t('showing_recent_sessions')}</Text>
              </View>
              {allReversedSessions.length > 5 && (
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveTab('logs');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewAllButtonText}>{t('view_all_logs')}</Text>
                  <ChevronRight size={14} color={colors.primaryAction} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* LOGS TAB HEADER CONTROLS (Search & Filters) */}
        {activeTab === 'logs' && (
          <View style={styles.logsControlsWrapper}>
            {/* Search Input */}
            <View style={styles.searchBarContainer}>
              <Search size={18} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('search_history_placeholder')}
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />
            </View>

            {/* Filter Chips */}
            {/* Month Filter Chips */}
            <View style={styles.filterChipsRow}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedFilter === 'all' && styles.filterChipActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedFilter('all');
                }}
              >
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
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedFilter('this_month');
                }}
              >
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
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedFilter('last_month');
                }}
              >
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
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedTemplateFilter('all');
                  }}
                >
                  <Dumbbell
                    size={13}
                    color={
                      selectedTemplateFilter === 'all'
                        ? colors.dateTextSelected
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
                  const tmplCount = allReversedSessions.filter(
                    (s) => s.templateId === tmpl.id
                  ).length;
                  return (
                    <TouchableOpacity
                      key={tmpl.id}
                      style={[
                        styles.templateFilterChip,
                        isSelected && styles.templateFilterChipActive,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedTemplateFilter(isSelected ? 'all' : tmpl.id);
                      }}
                    >
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
        )}
      </View>
    );
  }, [
    activeTab,
    allReversedSessions,
    filteredLogsSessions.length,
    searchQuery,
    selectedFilter,
    selectedTemplateFilter,
    templates,
    barChartComponent,
    calendarComponent,
    totalWorkouts,
    totalDurationSeconds,
    totalVolume,
    avgDurationMins,
    colors,
    styles,
    t,
  ]);

  const listFooterComponent = useMemo(() => {
    if (activeTab === 'overview' && allReversedSessions.length > 5) {
      return (
        <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 120 }}>
          <TouchableOpacity
            style={styles.moreLogsCardBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('logs');
            }}
            activeOpacity={0.8}
          >
            <BookOpen size={18} color={colors.primaryAction} />
            <Text style={styles.moreLogsCardText}>
              {t('view_all_logs')} ({allReversedSessions.length - 5}+)
            </Text>
            <ChevronRight size={16} color={colors.primaryAction} />
          </TouchableOpacity>
        </View>
      );
    }
    return <View style={{ height: 110 }} />;
  }, [activeTab, allReversedSessions.length, colors, styles, t]);

  const renderSessionItem = useCallback(({ item: session }: { item: any }) => {
    const template = templates.find((tpl) => tpl.id === session.templateId);
    return (
      <View style={styles.historyCard}>
        <View style={styles.historyTopRow}>
          <View style={styles.historyIconBox}>
            <CheckCircle2 size={20} color={colors.successBadge} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.historyName}>
              {template?.name || t('workout')}
            </Text>
            <Text style={styles.historyDate}>
              {format(new Date(session.date), 'dd MMMM yyyy', {
                locale: language === 'id' ? idLocale : undefined,
              })}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity
              onPress={() => handleShareSession(session)}
              style={styles.shareButton}
              activeOpacity={0.7}
            >
              <Share2 color={colors.primaryAction} size={18} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDelete(session.id)}
              style={styles.deleteButton}
              activeOpacity={0.7}
            >
              <Trash2 color={colors.danger} size={18} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.historyMetaRow}>
          <View style={styles.historyMetaBadge}>
            <Clock size={12} color={colors.textSecondary} />
            <Text style={styles.historyMetaText}>
              {Math.round((session.duration || 0) / 60)} {t('min_short')}
            </Text>
          </View>
          <View style={styles.historyMetaBadge}>
            <Dumbbell size={12} color={colors.textSecondary} />
            <Text style={styles.historyMetaText}>
              {session.completedExercises?.length || 0} {t('exercises_completed')}
            </Text>
          </View>
        </View>
      </View>
    );
  }, [templates, colors, styles, language, t, handleShareSession, handleDelete]);

  const renderEmptyList = () => (
    <View style={styles.emptyCard}>
      <CalendarIcon size={32} color={colors.textMuted} />
      <Text style={styles.emptyTitle}>{t('no_history_yet')}</Text>
      <Text style={styles.emptySub}>{t('tap_add_routine')}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={displayedSessions}
        keyExtractor={(item, index) => `${item.id || 'sess'}-${index}`}
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
          totalVolume={selectedShareSession.totalVolume}
          streak={selectedShareSession.streak}
          onClose={() => setSelectedShareSession(null)}
        />
      )}

      {isTourActive && currentStep === 'history_analytics' && (
        <SpotlightGuideOverlay
          stepNumber={5}
          totalSteps={5}
          title={t('onboarding_step5_title')}
          message={t('onboarding_step5_desc')}
          nextLabel={t('onboarding_step5_btn')}
          onNext={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            completeTour();
          }}
          onSkip={skipTour}
          position="top"
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
      paddingTop: Platform.OS === 'ios' ? 60 : 44,
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    headerBar: {
      marginBottom: 20,
    },
    headerTitle: {
      fontFamily: AppFonts.extraBold,
      fontSize: 28,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.6,
    },
    headerSub: {
      fontFamily: AppFonts.medium,
      fontSize: 14,
      color: c.textSecondary,
      fontWeight: '500',
      marginTop: 4,
    },

    // Card Wrapper
    cardWrapper: {
      backgroundColor: c.cardSurface,
      borderRadius: 22,
      padding: 20,
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
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 16,
    },
    cardIconBox: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: c.surfaceHighlight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardHeaderTitle: {
      fontFamily: AppFonts.bold,
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
      letterSpacing: -0.2,
    },

    // Calendar
    weekDaysHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
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
      paddingTop: 4,
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
      backgroundColor: c.dateBadgeSelected,
    },
    dayText: {
      fontFamily: AppFonts.semiBold,
      color: c.textPrimary,
      fontSize: 13,
      fontWeight: '600',
    },
    todayText: {
      fontFamily: AppFonts.extraBold,
      color: c.dateTextSelected,
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
      marginBottom: 24,
    },
    sectionTitle: {
      fontFamily: AppFonts.bold,
      fontSize: 18,
      fontWeight: '700',
      color: c.textPrimary,
      letterSpacing: -0.3,
      marginBottom: 12,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    statCard: {
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
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: c.shadowOpacity,
          shadowRadius: c.shadowRadius,
        },
        android: {
          elevation: c.elevation,
        },
      }),
    },
    statTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    statLabel: {
      fontFamily: AppFonts.bold,
      fontSize: 11,
      color: c.textSecondary,
      fontWeight: '700',
      letterSpacing: 0.3,
      flex: 1,
    },
    statIconBadge: {
      width: 30,
      height: 30,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statValue: {
      fontFamily: AppFonts.extraBold,
      fontSize: 24,
      fontWeight: '800',
      color: c.textPrimary,
      marginBottom: 4,
      letterSpacing: -0.5,
    },
    statUnit: {
      fontFamily: AppFonts.semiBold,
      fontSize: 14,
      fontWeight: '600',
      color: c.textSecondary,
    },
    statSubtext: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      fontWeight: '500',
      color: c.textMuted,
    },

    // History List Items
    historyCard: {
      backgroundColor: c.cardSurface,
      borderRadius: 20,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      ...Platform.select({
        ios: {
          shadowColor: c.shadowColor,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: c.shadowOpacity,
          shadowRadius: c.shadowRadius,
        },
        android: {
          elevation: c.elevation,
        },
      }),
    },
    historyTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    historyIconBox: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: c.surfaceHighlight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    historyName: {
      fontFamily: AppFonts.bold,
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
      marginBottom: 2,
    },
    historyDate: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: '500',
    },
    deleteButton: {
      padding: 8,
      backgroundColor: c.surfaceHighlight,
      borderRadius: 10,
    },
    shareButton: {
      padding: 8,
      backgroundColor: c.surfaceHighlight,
      borderRadius: 10,
    },
    historyMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: c.borderSubtle,
      paddingTop: 10,
    },
    historyMetaBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surfaceHighlight,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      gap: 5,
    },
    historyMetaText: {
      fontFamily: AppFonts.semiBold,
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: '600',
    },
    emptyCard: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.cardSurface,
      borderRadius: 20,
      padding: 28,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      borderStyle: 'dashed',
    },
    emptyTitle: {
      fontFamily: AppFonts.semiBold,
      fontSize: 15,
      fontWeight: '600',
      color: c.textPrimary,
      marginTop: 10,
    },
    emptySub: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
    },

    // Segmented Tab Controls
    segmentedContainer: {
      flexDirection: 'row',
      backgroundColor: c.cardSurface,
      borderRadius: 16,
      padding: 4,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    segmentedButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      gap: 8,
    },
    segmentedButtonActive: {
      backgroundColor: c.dateBadgeSelected,
      ...Platform.select({
        ios: {
          shadowColor: c.shadowColor,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    segmentedText: {
      fontFamily: AppFonts.semiBold,
      fontSize: 14,
      fontWeight: '600',
      color: c.textSecondary,
    },
    segmentedTextActive: {
      fontFamily: AppFonts.bold,
      fontWeight: '700',
      color: c.dateTextSelected,
    },
    tabBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 10,
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
      marginBottom: 14,
    },
    sectionSubtitle: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      color: c.textMuted,
      marginTop: -8,
    },
    viewAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingVertical: 4,
      paddingHorizontal: 8,
      backgroundColor: c.surfaceHighlight,
      borderRadius: 8,
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
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 20,
      gap: 8,
      width: '100%',
      ...Platform.select({
        ios: {
          shadowColor: c.shadowColor,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: c.shadowOpacity,
          shadowRadius: c.shadowRadius,
        },
        android: {
          elevation: c.elevation,
        },
      }),
    },
    moreLogsCardText: {
      fontFamily: AppFonts.bold,
      fontSize: 14,
      fontWeight: '700',
      color: c.primaryAction,
    },

    // Logs Tab Header Controls
    logsControlsWrapper: {
      marginBottom: 16,
    },
    searchBarContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.cardSurface,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 10,
      marginBottom: 12,
    },
    searchInput: {
      flex: 1,
      fontFamily: AppFonts.medium,
      fontSize: 14,
      color: c.textPrimary,
      padding: 0,
    },
    filterChipsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: c.cardSurface,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    filterChipActive: {
      backgroundColor: c.dateBadgeSelected,
      borderColor: c.dateBadgeSelected,
    },
    filterChipText: {
      fontFamily: AppFonts.semiBold,
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
    },
    filterChipTextActive: {
      fontFamily: AppFonts.bold,
      fontWeight: '700',
      color: c.dateTextSelected,
    },
    logsCountRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      paddingHorizontal: 4,
      marginTop: 4,
    },
    logsCountText: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      color: c.textMuted,
      fontWeight: '500',
    },
    templateChipsRow: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 4,
      marginBottom: 10,
    },
    templateFilterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 16,
      backgroundColor: c.cardSurface,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    templateFilterChipActive: {
      backgroundColor: c.dateBadgeSelected,
      borderColor: c.dateBadgeSelected,
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
      color: c.dateTextSelected,
    },
  });

