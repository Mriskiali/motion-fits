import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { cssInterop } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dataStore, WorkoutSession } from '@/lib/dataStore';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { router } from 'expo-router';
import { showSuccessToast, showErrorToast } from '@/utils/notifications';

// Interop React Native components with Tailwind CSS
cssInterop(View, { className: 'style' });
cssInterop(Text, { className: 'style' });
cssInterop(ScrollView, { className: 'style' });
cssInterop(TouchableOpacity, { className: 'style' });

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

const getDateString = (d: Date) => d.toLocaleDateString('sv-SE');
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

  const load = async () => {
    try {
      const sessionData = await dataStore.getWorkoutSessions();

      // Basic validation
      const cleaned = Array.isArray(sessionData) ?
        sessionData.filter(s => s && s.id && typeof s.durationSec === 'number') : [];
      // Sort by endedAt desc
      cleaned.sort((a,b)=> b.endedAt - a.endedAt);
      setSessions(cleaned);
    } catch(e) {
      console.error('load sessions error', e);
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

  const clearHistory = () => {
    Alert.alert('Clear History', 'Delete all workout sessions?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await dataStore.setWorkoutSessions([]);
            if (Platform.OS !== 'web' && Haptics?.NotificationFeedbackType?.Warning) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
            load();
            showSuccessToast('History Cleared', 'All workout sessions have been deleted.');
          } catch (error) {
            console.error('Error clearing history:', error);
            showErrorToast('Clear Failed', 'Unable to clear history. Please try again.');
          }
        }
      },
    ]);
  };

  // Determine colors based on theme (using light theme as default for now)
  const colorScheme = 'light'; // Default to light for now until we fix the NativeWind issue
  const bgColor = colorScheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50';
  const textColor = colorScheme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondaryColor = colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const cardBgColor = colorScheme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const cardShadowColor = colorScheme === 'dark' ? 'shadow-gray-900/20' : 'shadow-gray-200/50';
  const destructiveColor = colorScheme === 'dark' ? 'text-red-400' : 'text-red-500';

  return (
    <View className={`flex-1 ${bgColor}`}>
      <ScrollView className="flex-1 px-4 pt-4">
        <View className="flex-row justify-between items-center mb-4">
          <Text className={`text-2xl font-bold ${textColor}`}>History & Analytics</Text>
          <TouchableOpacity
            className="flex-row items-center bg-gray-200 dark:bg-gray-700 px-3 py-2 rounded-full"
            onPress={clearHistory}
          >
            <IconSymbol name="trash.fill" size={18} color={colorScheme === 'dark' ? '#f87171' : '#ef4444'} />
            <Text className={`font-semibold ml-1 ${destructiveColor}`}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View className="flex-row flex-wrap gap-2 mb-4">
          <View className={`flex-1 min-w-[48%] rounded-2xl p-4 ${cardBgColor} shadow-lg ${cardShadowColor}`}>
            <Text className={`text-xs font-semibold uppercase ${textSecondaryColor}`}>Sessions This Week</Text>
            <Text className={`text-2xl font-bold ${textColor}`}>{weekly.count}</Text>
          </View>
          <View className={`flex-1 min-w-[48%] rounded-2xl p-4 ${cardBgColor} shadow-lg ${cardShadowColor}`}>
            <Text className={`text-xs font-semibold uppercase ${textSecondaryColor}`}>Sets</Text>
            <Text className={`text-2xl font-bold ${textColor}`}>{weekly.sets}</Text>
          </View>
          <View className={`flex-1 min-w-[48%] rounded-2xl p-4 ${cardBgColor} shadow-lg ${cardShadowColor}`}>
            <Text className={`text-xs font-semibold uppercase ${textSecondaryColor}`}>Duration</Text>
            <Text className={`text-2xl font-bold ${textColor}`}>{formatDuration(weekly.durationSec)}</Text>
          </View>
          <View className={`flex-1 min-w-[48%] rounded-2xl p-4 ${cardBgColor} shadow-lg ${cardShadowColor}`}>
            <Text className={`text-xs font-semibold uppercase ${textSecondaryColor}`}>Avg Complete</Text>
            <Text className={`text-2xl font-bold ${textColor}`}>{weekly.avgCompletion}%</Text>
          </View>
        </View>

        {/* Streaks */}
        <View className={`rounded-2xl p-4 mb-4 ${cardBgColor} shadow-lg ${cardShadowColor}`}>
          <View className="flex-row justify-between">
            <View className="items-center flex-1">
              <IconSymbol name="flame.fill" size={20} color="#ff7043" />
              <Text className={`text-xs font-semibold mt-1 ${textSecondaryColor}`}>Current Streak</Text>
              <Text className={`text-lg font-bold ${textColor}`}>{streaks.current} days</Text>
            </View>
            <View className="items-center flex-1">
              <IconSymbol name="crown.fill" size={20} color="#fdd835" />
              <Text className={`text-xs font-semibold mt-1 ${textSecondaryColor}`}>Longest Streak</Text>
              <Text className={`text-lg font-bold ${textColor}`}>{streaks.longest} days</Text>
            </View>
          </View>
        </View>

        {/* Exercise Progress (1RM) */}
        {Object.keys(exercise1RMHistory).length ? (
          <View className={`rounded-2xl p-4 mb-4 ${cardBgColor} shadow-lg ${cardShadowColor}`}>
            <Text className={`text-lg font-bold mb-3 ${textColor}`}>Exercise Progress (1RM)</Text>
            {Object.entries(exercise1RMHistory).map(([exerciseId, entry]) => {
              const last = entry.values.slice(-6);
              const max = Math.max(...last.map(v => v.oneRM), 1);
              return (
                <View key={exerciseId} className="mb-3">
                  <Text className={`text-sm font-medium mb-2 ${textColor}`}>{entry.name}</Text>
                  <View className="flex-row gap-1">
                    {last.map((v, idx) => (
                      <View
                        key={idx}
                        className="flex-1 min-h-10 justify-center items-center rounded-md"
                        style={{ 
                          backgroundColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb',
                          width: `${Math.max(10, Math.round((v.oneRM / max) * 100))}%` 
                        }}
                      >
                        <Text className={`text-xs font-medium ${textColor}`}>{Math.round(v.oneRM)}</Text>
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
          <View className={`rounded-2xl p-4 mb-4 ${cardBgColor} shadow-lg ${cardShadowColor}`}>
            <Text className={`text-lg font-bold mb-3 ${textColor}`}>Recent Personal Bests</Text>
            {recentPBs.map(pb => (
              <View key={`${pb.exerciseId}-${pb.date}-${pb.value}`} className="flex-row items-center py-2 border-b border-gray-200 dark:border-gray-700">
                <IconSymbol name="star.fill" size={16} color="#FFD700" />
                <View className="flex-1 ml-2">
                  <Text className={`font-medium ${textColor}`}>{pb.name}: {pb.value}</Text>
                  <Text className={`text-xs ${textSecondaryColor}`}>{formatDateHuman(pb.date)} • {pb.planName}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Recent Sessions */}
        <View className="mt-2">
          <Text className={`text-lg font-bold mb-3 ${textColor}`}>Recent Sessions</Text>
          {!sessions.length && !loading && (
            <View className={`items-center py-10 rounded-2xl ${cardBgColor} shadow-lg ${cardShadowColor}`}>
              <IconSymbol name="calendar.badge.exclamationmark" size={48} color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'} />
              <Text className={`text-lg font-bold mt-2 ${textColor}`}>No sessions yet</Text>
              <Text className={`text-center mt-1 ${textSecondaryColor}`}>Finish a workout to see it here</Text>
            </View>
          )}
          {sessions.map(s => (
            <View key={s.id} className={`rounded-2xl p-4 mb-3 ${cardBgColor} shadow-lg ${cardShadowColor}`}>
              <View className="flex-row items-center">
                <View className={`w-9 h-9 rounded-full items-center justify-center mr-3`} style={{ backgroundColor: s.color + '20' }}>
                  <IconSymbol name="figure.run" size={20} color={s.color} />
                </View>
                <View className="flex-1">
                  <Text className={`font-medium ${textColor}`}>{s.planName}</Text>
                  <Text className={`text-xs ${textSecondaryColor}`}>{formatDateHuman(s.date)} • {formatDuration(s.durationSec)}</Text>
                </View>
                <View className="items-end">
                  <Text className={`text-sm font-bold ${textColor}`}>{s.completionPercent}%</Text>
                  <Text className={`text-xs ${textSecondaryColor}`}>complete</Text>
                </View>
              </View>
              <View className="flex-row items-center mt-3">
                <Text className={`text-xs ${textSecondaryColor}`}>{s.totalSets} sets</Text>
                <Text className={`mx-2 text-xs ${textSecondaryColor}`}>•</Text>
                <Text className={`text-xs ${textSecondaryColor}`}>{s.exercises.length} exercises</Text>
                {typeof s.restCount === 'number' && (
                  <>
                    <Text className={`mx-2 text-xs ${textSecondaryColor}`}>•</Text>
                    <Text className={`text-xs ${textSecondaryColor}`}>{s.restCount} rests</Text>
                  </>
                )}
                {typeof s.restAvgSec === 'number' && s.restAvgSec > 0 && (
                  <>
                    <Text className={`mx-2 text-xs ${textSecondaryColor}`}>•</Text>
                    <Text className={`text-xs ${textSecondaryColor}`}>avg {s.restAvgSec}s</Text>
                  </>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}