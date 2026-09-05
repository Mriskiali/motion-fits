import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useAlertStore } from '@/store/useAlertStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, subDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';
import { Trash2, Calendar as CalendarIcon, BarChart3, Clock, CheckCircle2, Dumbbell } from 'lucide-react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { useTranslation } from '@/hooks/useTranslation';
import { ThemeColors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

export default function HistoryScreen() {
  const sessions = useWorkoutStore((state) => state.sessions);
  const templates = useWorkoutStore((state) => state.templates);
  const deleteSession = useWorkoutStore((state) => state.deleteSession);
  const showAlert = useAlertStore((state) => state.showAlert);
  const colors = useThemeColors();
  const styles = getStyles(colors);
  const { t, language } = useTranslation();

  const handleDelete = (id: string) => {
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
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    return eachDayOfInterval({ start, end });
  };

  const days = getDaysInMonth();
  const startDayOfWeek = days[0].getDay(); // 0 is Sunday
  const paddingDays = Array.from({ length: startDayOfWeek }).map((_, i) => i);

  // Calculate stats
  const totalWorkouts = sessions.length;
  const totalDurationSeconds = sessions.reduce((acc, curr) => acc + (curr.duration || 0), 0);
  const avgDurationMins = totalWorkouts ? Math.round(totalDurationSeconds / totalWorkouts / 60) : 0;

  const totalVolume = sessions.reduce((acc, session) => {
    let sessionVolume = 0;
    session.completedExercises?.forEach((ex) => {
      sessionVolume += ex.completedSets?.length || 0;
    });
    return acc + sessionVolume;
  }, 0);

  const renderCalendar = () => (
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
  );

  const renderBarChart = () => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), 6 - i));

    const data = last7Days.map((date) => {
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

    const maxCount = Math.max(...data.map((d) => d.count), 3);
    const chartHeight = 110;
    const barWidth = 26;
    const spacing = 16;
    const chartWidth = data.length * (barWidth + spacing) - spacing;

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
            {data.map((d, i) => {
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
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>{t('history')}</Text>
          <Text style={styles.headerSub}>{t('history_subtitle') || 'Review your progress & past logs'}</Text>
        </View>

        {renderBarChart()}
        {renderCalendar()}

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

        {/* Recent Sessions List */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t('recent_sessions')}</Text>
          {sessions
            .slice()
            .reverse()
            .map((session) => {
              const template = templates.find((tpl) => tpl.id === session.templateId);
              return (
                <View key={session.id} style={styles.historyCard}>
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
                    <TouchableOpacity
                      onPress={() => handleDelete(session.id)}
                      style={styles.deleteButton}
                    >
                      <Trash2 color={colors.danger} size={18} />
                    </TouchableOpacity>
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
            })}

          {sessions.length === 0 && (
            <View style={styles.emptyCard}>
              <CalendarIcon size={32} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>{t('no_history_yet')}</Text>
              <Text style={styles.emptySub}>{t('tap_add_routine')}</Text>
            </View>
          )}
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>
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
      fontSize: 28,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.6,
    },
    headerSub: {
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
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: c.surfaceHighlight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardHeaderTitle: {
      fontSize: 16,
      fontWeight: '800',
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
      color: c.textPrimary,
      fontSize: 13,
      fontWeight: '600',
    },
    todayText: {
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
      fontSize: 11,
      color: c.textSecondary,
      fontWeight: '700',
      letterSpacing: 0.3,
      flex: 1,
    },
    statIconBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: '800',
      color: c.textPrimary,
      marginBottom: 4,
      letterSpacing: -0.5,
    },
    statUnit: {
      fontSize: 14,
      fontWeight: '600',
      color: c.textSecondary,
    },
    statSubtext: {
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
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.surfaceHighlight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    historyName: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
      marginBottom: 2,
    },
    historyDate: {
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: '500',
    },
    deleteButton: {
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
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
      marginTop: 10,
    },
    emptySub: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
    },
  });

