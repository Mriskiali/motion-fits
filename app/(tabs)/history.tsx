import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { GoalsSettings, DEFAULT_GOALS_SETTINGS, getNextReminderSummary } from '@/lib/notifications';
import { router } from 'expo-router';

type SessionExercise = {
  exerciseId: string;
  name: string;
  targetSets: number;
  completedSets: number;
  completed: boolean;
};

type PersonalBest = {
  exerciseId: string;
  name: string;
  metric: '1RM';
  value: number;
};

type SetLog = {
  planId: string;
  exerciseId: string;
  date: string; // YYYY-MM-DD
  setIndex: number;
  weight: number;
  reps: number;
};

interface WorkoutSession {
  id: string;
  date: string; // YYYY-MM-DD
  planId: string;
  planName: string;
  color: string;
  startedAt: number;
  endedAt: number;
  durationSec: number;
  exercises: SessionExercise[];
  completionPercent: number;
  totalSets: number;
  // optional summaries (populated by Workout tab when finishing a session)
  restCount?: number;
  restAvgSec?: number;
  setLogs?: SetLog[];
  newPBs?: PersonalBest[];
}

const getWeekStart = (d: Date) => {
  const x = new Date(d);
  x.setHours(0,0,0,0);
  x.setDate(x.getDate() - x.getDay());
  return x;
};

const getDateString = (d: Date) => d.toISOString().split('T')[0];
const isSameDay = (a: Date, b: Date) => getDateString(a) === getDateString(b);

const formatDuration = (sec: number) => {
  const m = Math.floor(sec/60);
  const s = sec%60;
  return `${m}m ${s}s`;
};

const formatDateHuman = (isoDate: string) => {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

// Days-of-week names for reminder summary (Sun..Sat)
const DAYS_OF_WEEK = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] as const;

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [goalSettings, setGoalSettings] = useState<GoalsSettings | null>(null);

  const load = async () => {
    try {
      const [str, gsStr] = await Promise.all([
        AsyncStorage.getItem('workoutSessions'),
        AsyncStorage.getItem('goalsSettings_v1'),
      ]);
      const arr: WorkoutSession[] = str ? JSON.parse(str) : [];
      // Basic validation
      const cleaned = Array.isArray(arr) ? arr.filter(s => s && s.id && typeof s.durationSec === 'number') : [];
      // Sort by endedAt desc
      cleaned.sort((a,b)=> b.endedAt - a.endedAt);
      setSessions(cleaned);

      if (gsStr) {
        const parsed = JSON.parse(gsStr);
        setGoalSettings({ ...DEFAULT_GOALS_SETTINGS, ...parsed });
      } else {
        setGoalSettings(DEFAULT_GOALS_SETTINGS);
      }
    } catch(e) {
      if (!goalSettings) setGoalSettings(DEFAULT_GOALS_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useFocusEffect(React.useCallback(() => { load(); return () => {}; }, []));

  const now = new Date();
  const weekStart = getWeekStart(now);
  const thisWeekSessions = sessions.filter(s => {
    const d = new Date(s.date + 'T00:00:00');
    return d >= weekStart && d <= now;
  });

  const weekly = {
    count: thisWeekSessions.length,
    sets: thisWeekSessions.reduce((sum,s)=> sum + (s.totalSets||0), 0),
    durationSec: thisWeekSessions.reduce((sum,s)=> sum + (s.durationSec||0), 0),
    avgCompletion: thisWeekSessions.length ? Math.round(thisWeekSessions.reduce((sum,s)=> sum + (s.completionPercent||0),0)/thisWeekSessions.length) : 0,
  };

  const computeStreaks = (all: WorkoutSession[]) => {
    const uniqueDays = Array.from(new Set(all.map(s => s.date))).sort();
    // longest streak
    let longest = 0;
    let current = 0;
    let prev: Date | null = null;
    uniqueDays.forEach(ds => {
      const d = new Date(ds + 'T00:00:00');
      if (!prev) {
        current = 1;
      } else {
        const diff = Math.round((d.getTime() - prev.getTime())/(1000*60*60*24));
        current = (diff === 1) ? current + 1 : 1;
      }
      longest = Math.max(longest, current);
      prev = d;
    });
    // current streak ending today
    let currStreak = 0;
    const daySet = new Set(uniqueDays);
    let cursor = new Date(now);
    cursor.setHours(0,0,0,0);
    while (daySet.has(getDateString(cursor))) {
      currStreak++;
      cursor.setDate(cursor.getDate()-1);
    }
    return { current: currStreak, longest };
  };

  const streaks = computeStreaks(sessions);

  const personalBests = (() => {
    if (!sessions.length) return null;
    const longestDuration = sessions.reduce((a,b)=> (a.durationSec > b.durationSec ? a : b));
    const mostSets = sessions.reduce((a,b)=> ((a.totalSets||0) > (b.totalSets||0) ? a : b));
    const bestCompletion = sessions.reduce((a,b)=> ((a.completionPercent||0) > (b.completionPercent||0) ? a : b));
    return { longestDuration, mostSets, bestCompletion };
  })();

  // Week utilities and streak computation
  const weekStartKey = (d: Date) => {
    const w = getWeekStart(d);
    return getDateString(w);
  };

  const computeWeeklyCounts = (all: WorkoutSession[]) => {
    const map = new Map<string, number>();
    all.forEach(s => {
      const key = weekStartKey(new Date(s.date + 'T00:00:00'));
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  };

  const computeWeeklyStreak = (all: WorkoutSession[], weeklyTarget: number) => {
    if (!weeklyTarget || weeklyTarget <= 0) return 0;
    const counts = computeWeeklyCounts(all);
    let streak = 0;
    // Start at current week and go backwards
    let cursor = getWeekStart(new Date());
    for (let i = 0; i < 260; i++) {
      const key = getDateString(cursor);
      const c = counts.get(key) || 0;
      if (c >= weeklyTarget) {
        streak++;
        const prev = new Date(cursor);
        prev.setDate(prev.getDate() - 7);
        cursor = prev;
      } else {
        break;
      }
    }
    return streak;
  };

  // Recent per-exercise 1RM PBs from saved sessions
  const recentPBs = (() => {
    const items = sessions.flatMap(s =>
      (s.newPBs || []).map((pb: PersonalBest) => ({
        ...pb,
        date: s.date,
        planName: s.planName,
        color: s.color,
      }))
    );
    items.sort((a, b) => a.date < b.date ? 1 : -1);
    return items.slice(0, 10);
  })();

  // Aggregate per-exercise 1RM history from set logs across sessions
  const exercise1RMHistory = (() => {
    const map: Record<string, { name: string; values: { date: string; oneRM: number }[] }> = {};
    sessions.forEach(s => {
      const nameById: Record<string, string> = {};
      s.exercises.forEach(ex => { nameById[ex.exerciseId] = ex.name; });
      const logs: SetLog[] = s.setLogs || [];
      logs.forEach((l: SetLog) => {
        const weight = Number(l.weight || 0);
        const reps = Number(l.reps || 0);
        const oneRM = weight > 0 && reps > 0 ? weight * (1 + reps / 30) : 0;
        if (oneRM <= 0) return;
        const current = map[l.exerciseId] || { name: nameById[l.exerciseId] || l.exerciseId, values: [] };
        current.values.push({ date: s.date, oneRM });
        map[l.exerciseId] = current;
      });
    });
    Object.values(map).forEach(entry => entry.values.sort((a, b) => a.date.localeCompare(b.date)));
    return map;
  })();

  const clearHistory = () => {
    Alert.alert('Clear History', 'Delete all workout sessions?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          await AsyncStorage.removeItem('workoutSessions');
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
          load();
        } 
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>History & Analytics</Text>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearHistory}
            accessible
            accessibilityLabel="Clear history"
            accessibilityHint="Delete all saved workout sessions"
          >
            <IconSymbol name="trash.fill" size={18} color="#ef5350" />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* New user quick-start helper */}
        {!sessions.length && (
          <View
            style={styles.onboardCard}
            accessible
            accessibilityRole="summary"
            accessibilityLabel="How to get started"
            accessibilityHint="Follow these steps to begin using the app"
          >
            <View style={styles.onboardHeader}>
              <IconSymbol name="hand.point.up.left.fill" size={18} color={colors.primary} />
              <Text style={styles.onboardTitle}>How to get started</Text>
            </View>
            <View style={styles.onboardSteps}>
              <Text style={styles.onboardStep}>1. Buka tab Workout, pilih hari lalu Assign workout.</Text>
              <Text style={styles.onboardStep}>2. Masuk ke workout, tap + untuk catat set. Tombol set berubah jadi timer istirahat.</Text>
              <Text style={styles.onboardStep}>3. Tap lama timer untuk batal jika salah.</Text>
              <Text style={styles.onboardStep}>4. Tekan Finish Workout untuk menyimpan sesi ke History.</Text>
              <Text style={styles.onboardStep}>5. Atur target & pengingat di tab Goals.</Text>
            </View>
            <View style={styles.onboardActions}>
              <TouchableOpacity
                style={[styles.onboardBtnPrimary, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/(tabs)/workout')}
                accessibilityLabel="Go to Workout"
                accessibilityHint="Navigate to Workout tab to assign a plan"
              >
                <IconSymbol name="figure.strengthtraining.traditional" size={18} color={colors.card} />
                <Text style={styles.onboardBtnPrimaryText}>Go to Workout</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.onboardBtn}
                onPress={() => {}}
                accessibilityLabel="Show tips"
                accessibilityHint="Display additional usage tips"
              >
                <Text style={styles.onboardBtnText}>Tips</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {goalSettings ? (
          <View style={styles.goalCard}>
            <View style={styles.goalRow}>
              <Text style={styles.goalLabel}>Weekly goal:</Text>
              <Text style={styles.goalValue}>{goalSettings.weeklyTarget}</Text>
              <Text style={styles.goalSep}>•</Text>
              <Text style={styles.goalLabel}>This week:</Text>
              <Text style={styles.goalValue}>{weekly.count}</Text>
              <Text style={styles.goalSep}>•</Text>
              <Text style={styles.goalLabel}>Streak:</Text>
              <Text style={styles.goalValue}>
                {computeWeeklyStreak(sessions, goalSettings.weeklyTarget)} wk
              </Text>
            </View>
            <View style={styles.goalBar}>
              <View
                style={[
                  styles.goalBarFill,
                  {
                    width: `${
                      goalSettings.weeklyTarget > 0
                        ? Math.min(100, Math.round((weekly.count / goalSettings.weeklyTarget) * 100))
                        : 0
                    }%`,
                  },
                ]}
              />
            </View>
            {goalSettings.remindersEnabled ? (
              <View style={styles.goalStatusRow}>
                <IconSymbol name="bell.fill" size={14} color={colors.textSecondary} />
                <Text style={styles.goalStatusText}>
                  {(() => {
                    const next = getNextReminderSummary(goalSettings);
                    if (!next) return 'No upcoming reminder';
                    const now = new Date();
                    const isToday = next.toDateString() === now.toDateString();
                    const t = new Date(now);
                    t.setDate(now.getDate() + 1);
                    const isTomorrow = next.toDateString() === t.toDateString();
                    const hh = String(next.getHours()).padStart(2, '0');
                    const mm = String(next.getMinutes()).padStart(2, '0');
                    const weekday = DAYS_OF_WEEK[next.getDay()];
                    if (isToday) return `Next reminder: Today ${hh}:${mm}`;
                    if (isTomorrow) return `Next reminder: Tomorrow ${hh}:${mm}`;
                    return `Next reminder: ${weekday} ${hh}:${mm}`;
                  })()}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.cardsRow}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Sessions This Week</Text>
            <Text style={styles.cardValue}>{weekly.count}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Sets</Text>
            <Text style={styles.cardValue}>{weekly.sets}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Duration</Text>
            <Text style={styles.cardValue}>{formatDuration(weekly.durationSec)}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Avg Complete</Text>
            <Text style={styles.cardValue}>{weekly.avgCompletion}%</Text>
          </View>
        </View>

        <View style={styles.streaks}>
          <View style={styles.streakItem}>
            <IconSymbol name="flame.fill" size={20} color="#ff7043" />
            <Text style={styles.streakLabel}>Current Streak</Text>
            <Text style={styles.streakValue}>{streaks.current} days</Text>
          </View>
          <View style={styles.streakItem}>
            <IconSymbol name="crown.fill" size={20} color="#fdd835" />
            <Text style={styles.streakLabel}>Longest Streak</Text>
            <Text style={styles.streakValue}>{streaks.longest} days</Text>
          </View>
        </View>

        {personalBests && (
          <View style={styles.badges}>
            <Text style={styles.sectionTitle}>Personal Bests</Text>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <IconSymbol name="timer" size={18} color={colors.primary} />
                <Text style={styles.badgeTitle}>Longest Duration</Text>
                <Text style={styles.badgeText}>
                  {formatDuration(personalBests.longestDuration.durationSec)} • {personalBests.longestDuration.planName}
                </Text>
              </View>
              <View style={styles.badge}>
                <IconSymbol name="list.number" size={18} color={colors.secondary} />
                <Text style={styles.badgeTitle}>Most Sets</Text>
                <Text style={styles.badgeText}>
                  {personalBests.mostSets.totalSets} sets • {personalBests.mostSets.planName}
                </Text>
              </View>
              <View style={styles.badge}>
                <IconSymbol name="chart.bar.fill" size={18} color={colors.accent} />
                <Text style={styles.badgeTitle}>Best Completion</Text>
                <Text style={styles.badgeText}>
                  {personalBests.bestCompletion.completionPercent}% • {personalBests.bestCompletion.planName}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Exercise Progress (1RM) */}
        {Object.keys(exercise1RMHistory).length ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.sectionTitle}>Exercise Progress (1RM)</Text>
            {Object.entries(exercise1RMHistory).map(([exerciseId, entry]) => {
              const last = entry.values.slice(-6);
              const max = Math.max(...last.map(v => v.oneRM), 1);
              return (
                <View key={exerciseId} style={styles.progressRow}>
                  <Text style={styles.progressName}>{entry.name}</Text>
                  <View style={styles.progressBars}>
                    {last.map((v, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.progressBarMini,
                          { width: `${Math.max(10, Math.round((v.oneRM / max) * 100))}%` }
                        ]}
                      >
                        <Text style={styles.progressBarMiniText}>{Math.round(v.oneRM)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Recent Personal Bests */}
        {recentPBs.length ? (
          <View style={styles.pbSection}>
            <Text style={styles.sectionTitle}>Recent Personal Bests</Text>
            {recentPBs.map(pb => (
              <View key={`${pb.exerciseId}-${pb.date}-${pb.value}`} style={styles.pbItem}>
                <IconSymbol name="star.fill" size={16} color={colors.accent} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.pbText}>{pb.name}: {pb.value}</Text>
                  <Text style={styles.pbSub}>{formatDateHuman(pb.date)} • {pb.planName}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Recent Sessions */}
        <View style={{ marginTop: 8 }}>
          <Text style={styles.sectionTitle}>Recent Sessions</Text>
          {!sessions.length && !loading && (
            <View style={styles.empty}>
              <IconSymbol name="calendar.badge.exclamationmark" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>No sessions yet</Text>
              <Text style={styles.emptyText}>Finish a workout to see it here</Text>
            </View>
          )}
          {sessions.map(s => (
            <View key={s.id} style={styles.sessionCard}>
              <View style={styles.sessionHeader}>
                <View style={[styles.sessionIcon, { backgroundColor: s.color + '20' }]}>
                  <IconSymbol name="figure.run" size={20} color={s.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionTitle}>{s.planName}</Text>
                  <Text style={styles.sessionSub}>{formatDateHuman(s.date)} • {formatDuration(s.durationSec)}</Text>
                </View>
                <View style={styles.sessionKpis}>
                  <Text style={styles.kpiText}>{s.completionPercent}%</Text>
                  <Text style={styles.kpiLabel}>complete</Text>
                </View>
              </View>
              <View style={styles.sessionFooter}>
                <Text style={styles.sessionMeta}>{s.totalSets} sets</Text>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.sessionMeta}>{s.exercises.length} exercises</Text>
                {typeof s.restCount === 'number' ? (
                  <>
                    <Text style={styles.dot}>•</Text>
                    <Text style={styles.sessionMeta}>{s.restCount} rests</Text>
                  </>
                ) : null}
                {typeof s.restAvgSec === 'number' && s.restAvgSec > 0 ? (
                  <>
                    <Text style={styles.dot}>•</Text>
                    <Text style={styles.sessionMeta}>avg {s.restAvgSec}s</Text>
                  </>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  clearButtonText: {
    color: '#ef5350',
    fontWeight: '700',
    marginLeft: 6,
  },
  cardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  card: {
    flexBasis: '48%',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  cardLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: '600',
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  streaks: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  streakItem: {
    alignItems: 'center',
    flex: 1,
  },
  streakLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
  },
  streakValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  badges: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 10,
  },
  badgeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginTop: 6,
    marginBottom: 2,
  },
  badgeText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sessionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  sessionSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  sessionKpis: {
    alignItems: 'flex-end',
    minWidth: 64,
  },
  kpiText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  kpiLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  sessionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  sessionMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  dot: {
    color: colors.textSecondary,
  },

  // PBs section
  pbSection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  pbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  pbText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  pbSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Exercise progress bars
  progressRow: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  progressName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  progressBars: {
    flexDirection: 'row',
    gap: 6,
  },
  progressBarMini: {
    minWidth: '10%',
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarMiniText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },

  // Goals header card
  goalCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  goalLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  goalValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '800',
  },
  goalSep: {
    color: colors.textSecondary,
    marginHorizontal: 2,
  },
  goalBar: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  goalStatusRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalStatusText: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Onboarding helper styles
  onboardCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  onboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  onboardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  onboardSteps: {
    gap: 4,
    marginBottom: 10,
  },
  onboardStep: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  onboardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  onboardBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.background,
  },
  onboardBtnText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  onboardBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  onboardBtnPrimaryText: {
    color: colors.card,
    fontWeight: '800',
    fontSize: 12,
  },
});