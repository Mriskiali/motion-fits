import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useAlertStore } from '@/store/useAlertStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, subDays } from 'date-fns';
import { Trash2 } from 'lucide-react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

export default function HistoryScreen() {
  const sessions = useWorkoutStore((state) => state.sessions);
  const templates = useWorkoutStore((state) => state.templates);
  const deleteSession = useWorkoutStore((state) => state.deleteSession);
  const showAlert = useAlertStore((state) => state.showAlert);
  const colors = useThemeColors();
  const styles = getStyles(colors);

  const handleDelete = (id: string) => {
    showAlert(
      "Delete Workout",
      "Are you sure you want to delete this workout from your history? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteSession(id) }
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

  // Padding for the first week
  const paddingDays = Array.from({ length: startDayOfWeek }).map((_, i) => i);

  // Calculate some basic stats
  const totalWorkouts = sessions.length;
  const totalDurationSeconds = sessions.reduce((acc, curr) => acc + curr.duration, 0);
  const avgDurationMins = totalWorkouts ? Math.round(totalDurationSeconds / totalWorkouts / 60) : 0;
  
  // Example volume calc: just count total sets for now, or assume weight * reps
  const totalVolume = sessions.reduce((acc, session) => {
    let sessionVolume = 0;
    session.completedExercises.forEach(ex => {
      sessionVolume += ex.completedSets.length; // simplified volume as sets
    });
    return acc + sessionVolume;
  }, 0);

  const renderCalendar = () => (
    <View style={styles.calendarContainer}>
      <Text style={styles.monthTitle}>{format(new Date(), 'MMMM yyyy')}</Text>
      
      <View style={styles.weekDaysHeader}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <Text key={`wd-${i}`} style={styles.weekDayText}>{d}</Text>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {paddingDays.map((_, i) => (
          <View key={`pad-${i}`} style={styles.dayCell} />
        ))}
        {days.map((date, i) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const hasWorkout = sessions.some(s => format(new Date(s.date), 'yyyy-MM-dd') === dateStr);
          const today = isToday(date);
          
          return (
            <View key={`day-${i}`} style={styles.dayCell}>
              <View style={[styles.dayCircle, today && styles.todayCircle]}>
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
    // Get last 7 days
    const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), 6 - i));
    
    const data = last7Days.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const count = sessions.filter(s => format(new Date(s.date), 'yyyy-MM-dd') === dateStr).length;
      return { day: format(date, 'EE').charAt(0), count };
    });

    const maxCount = Math.max(...data.map(d => d.count), 3); // min scale is 3
    const chartHeight = 120;
    const barWidth = 28;
    const spacing = 18;
    const chartWidth = data.length * (barWidth + spacing) - spacing;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.sectionTitle}>Weekly Activity</Text>
        <View style={{ alignItems: 'center', marginTop: 16 }}>
          <Svg width={chartWidth} height={chartHeight + 30}>
            {data.map((d, i) => {
              const barHeight = (d.count / maxCount) * chartHeight;
              const x = i * (barWidth + spacing);
              const y = chartHeight - barHeight;
              return (
                <React.Fragment key={`bar-${i}`}>
                  {/* Background bar to show scale */}
                  <Rect x={x} y={0} width={barWidth} height={chartHeight} rx={6} fill={colors.card} />
                  {/* Actual data bar */}
                  <Rect x={x} y={y} width={barWidth} height={barHeight} rx={6} fill={d.count > 0 ? colors.primary : 'transparent'} />
                  <SvgText x={x + barWidth / 2} y={chartHeight + 20} fontSize="12" fill={colors.textSecondary} textAnchor="middle" fontWeight="bold">
                    {d.day}
                  </SvgText>
                  {d.count > 0 && (
                    <SvgText x={x + barWidth / 2} y={y - 8} fontSize="12" fill={colors.text} textAnchor="middle" fontWeight="bold">
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
      <Text style={styles.headerTitle}>History & Analytics</Text>
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {renderBarChart()}
        
        {renderCalendar()}

        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Stats Overview</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalWorkouts}</Text>
              <Text style={styles.statLabel}>Total Workouts</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{avgDurationMins}m</Text>
              <Text style={styles.statLabel}>Avg Duration</Text>
            </View>
            <View style={[styles.statCard, { width: '100%', marginTop: 12 }]}>
              <Text style={styles.statValue}>{totalVolume}</Text>
              <Text style={styles.statLabel}>Total Sets Completed</Text>
            </View>
          </View>
        </View>

        <View style={styles.historyList}>
          <Text style={styles.sectionTitle}>Recent Sessions</Text>
          {sessions.slice().reverse().map(session => {
            const template = templates.find(t => t.id === session.templateId);
            return (
              <View key={session.id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <View>
                    <Text style={styles.historyDate}>{format(new Date(session.date), 'MMM do, yyyy')}</Text>
                    <Text style={styles.historyDuration}>{Math.round(session.duration / 60)} min</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(session.id)} style={styles.deleteButton}>
                    <Trash2 color="#ef4444" size={20} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.historyName}>{template?.name || 'Workout'}</Text>
                <Text style={styles.historyDetails}>
                  {session.completedExercises.length} exercises completed
                </Text>
              </View>
            );
          })}
          {sessions.length === 0 && (
            <Text style={styles.emptyText}>No history available yet.</Text>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginHorizontal: 24,
    marginBottom: 20,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  chartContainer: {
    marginBottom: 32,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calendarContainer: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  weekDaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  weekDayText: {
    color: colors.textSecondary,
    width: 32,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 12,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: '14.28%', // 100% / 7
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  dayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  todayCircle: {
    backgroundColor: colors.primary,
  },
  dayText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  todayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  workoutDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success, // emerald-500
  },
  statsContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  historyList: {
    marginBottom: 32,
  },
  historyCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyDate: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  historyDuration: {
    color: colors.success,
    fontSize: 12,
    fontWeight: 'bold',
  },
  historyName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  historyDetails: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
  },
});
