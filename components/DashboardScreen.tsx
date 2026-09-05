import React, { useState, useEffect } from 'react';
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
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { AppTheme } from '@/constants/AppTheme';
import { useUserStore } from '@/store/useUserStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';

export default function DashboardScreen() {
  const router = useRouter();
  const userName = useUserStore((state) => state.name);
  const hapticsEnabled = useUserStore((state) => state.hapticsEnabled);
  const sessions = useWorkoutStore((state) => state.sessions);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [stepCount, setStepCount] = useState<number>(8420);
  const [isSensorActive, setIsSensorActive] = useState<boolean>(false);

  // Safe Pedometer integration from expo-sensors
  useEffect(() => {
    let isMounted = true;
    let subscription: any = null;

    const initPedometer = async () => {
      try {
        if (Platform.OS !== 'web') {
          const Sensors = require('expo-sensors');
          if (Sensors?.Pedometer) {
            const isAvailable = await Sensors.Pedometer.isAvailableAsync();
            if (isAvailable && isMounted) {
              setIsSensorActive(true);
              const start = new Date();
              start.setHours(0, 0, 0, 0);
              const end = new Date();
              const result = await Sensors.Pedometer.getStepCountAsync(start, end);
              if (result && isMounted) {
                setStepCount(result.steps);
              }

              subscription = Sensors.Pedometer.watchStepCount((res: { steps: number }) => {
                if (isMounted) {
                  setStepCount((prev) => prev + res.steps);
                }
              });
            }
          }
        }
      } catch (err) {
        // Safe fallback for environments without sensor support
      }
    };

    initPedometer();

    return () => {
      isMounted = false;
      if (subscription?.remove) {
        subscription.remove();
      }
    };
  }, []);

  // Compute Week Days (Mon - Sun)
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  // Compute Calories, Active Time, Distance based on steps & sessions
  const caloriesBurned = Math.round(stepCount * 0.04 + (sessions.length > 0 ? 320 : 0));
  const activeTimeMinutes = Math.round(stepCount / 110 + (sessions.length > 0 ? 45 : 0));
  const distanceKm = (stepCount * 0.00078).toFixed(1);

  const handleStartWorkout = () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/(tabs)/workout');
  };

  return (
    <View style={styles.canvasContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2.1 Top Navigation & Header */}
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.brandTitle}>FitTrack</Text>
            <Text style={styles.brandSubtitle}>Hello, {userName}</Text>
          </View>

          {/* Month / Year Selector */}
          <View style={styles.monthBadge}>
            <Text style={styles.monthBadgeText}>{format(selectedDate, 'MMM yyyy')}</Text>
            <Ionicons name="chevron-down" size={14} color={AppTheme.colors.textPrimary} />
          </View>

          {/* User Avatar & Notification Action */}
          <View style={styles.headerActionsRight}>
            <Pressable
              style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}
              onPress={() => router.push('/(tabs)/settings')}
            >
              <Ionicons name="notifications-outline" size={18} color={AppTheme.colors.textPrimary} />
            </Pressable>
            <View style={styles.avatarBadge}>
              <Text style={styles.avatarText}>{userName ? userName.charAt(0).toUpperCase() : 'A'}</Text>
            </View>
          </View>
        </View>

        {/* Weekly Date Scroller */}
        <View style={styles.dateScrollerRow}>
          {weekDays.map((date, idx) => {
            const isSelected = isSameDay(date, selectedDate);
            return (
              <Pressable
                key={idx}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedDate(date);
                }}
                style={styles.dayColumn}
              >
                <Text style={styles.dayAbbr}>{format(date, 'EEE').toUpperCase()}</Text>
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

        {/* 2.2 Hero Status Card (Recovery / Readiness) */}
        <View style={styles.heroCard}>
          {/* Left Arc / Stat */}
          <View style={styles.heroLeft}>
            <View style={styles.recoveryRingContainer}>
              <Text style={styles.recoveryValue}>88%</Text>
              <Text style={styles.recoveryLabel}>Recovery</Text>
            </View>
          </View>

          {/* Right Status Column */}
          <View style={styles.heroRight}>
            <Text style={styles.heroStatusHeading}>Ready for Upper Body</Text>
            <Text style={styles.heroStatusSub}>Fatigue: Low • Optimal Readiness</Text>

            <View style={styles.windowBadge}>
              <Ionicons name="sparkles" size={12} color={AppTheme.colors.accentPrimary} />
              <Text style={styles.windowBadgeText}>Optimal Window: 16:00 - 18:30</Text>
            </View>
          </View>
        </View>

        {/* Section Heading: Daily Vitals */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daily Vitals</Text>
          <Text style={styles.sectionCaption}>Real-time Activity</Text>
        </View>

        {/* 2.3 2x2 Bento Activity Grid */}
        <View style={styles.bentoGrid}>
          {/* Bento 1: Steps */}
          <View style={[styles.bentoTile, { backgroundColor: AppTheme.colors.bentoSteps }]}>
            <View style={styles.bentoHeader}>
              <Text style={styles.bentoCategory}>STEPS</Text>
              <View style={[styles.bentoIconBadge, { backgroundColor: '#FDE1C8' }]}>
                <Ionicons name="footsteps-outline" size={16} color="#D97706" />
              </View>
            </View>
            <Text style={styles.bentoValue}>{stepCount.toLocaleString()}</Text>
            <View style={styles.bentoProgressTrack}>
              <View
                style={[
                  styles.bentoProgressFill,
                  { width: `${Math.min(100, (stepCount / 10000) * 100)}%`, backgroundColor: '#D97706' },
                ]}
              />
            </View>
            <Text style={styles.bentoSubtext}>Target: 10,000 steps</Text>
          </View>

          {/* Bento 2: Calories */}
          <View style={[styles.bentoTile, { backgroundColor: AppTheme.colors.bentoCalories }]}>
            <View style={styles.bentoHeader}>
              <Text style={styles.bentoCategory}>CALORIES</Text>
              <View style={[styles.bentoIconBadge, { backgroundColor: '#D4EED8' }]}>
                <Ionicons name="flame-outline" size={16} color="#15803D" />
              </View>
            </View>
            <Text style={styles.bentoValue}>{caloriesBurned.toLocaleString()} <Text style={styles.bentoUnit}>kcal</Text></Text>
            <View style={styles.bentoProgressTrack}>
              <View
                style={[
                  styles.bentoProgressFill,
                  { width: `${Math.min(100, (caloriesBurned / 2400) * 100)}%`, backgroundColor: '#15803D' },
                ]}
              />
            </View>
            <Text style={styles.bentoSubtext}>Target: 2,400 kcal</Text>
          </View>

          {/* Bento 3: Active Time */}
          <View style={[styles.bentoTile, { backgroundColor: AppTheme.colors.bentoActiveTime }]}>
            <View style={styles.bentoHeader}>
              <Text style={styles.bentoCategory}>ACTIVE TIME</Text>
              <View style={[styles.bentoIconBadge, { backgroundColor: '#FDF0C8' }]}>
                <Ionicons name="time-outline" size={16} color="#B45309" />
              </View>
            </View>
            <Text style={styles.bentoValue}>{activeTimeMinutes} <Text style={styles.bentoUnit}>min</Text></Text>
            <View style={styles.bentoProgressTrack}>
              <View
                style={[
                  styles.bentoProgressFill,
                  { width: `${Math.min(100, (activeTimeMinutes / 60) * 100)}%`, backgroundColor: '#B45309' },
                ]}
              />
            </View>
            <Text style={styles.bentoSubtext}>Target: 60 min</Text>
          </View>

          {/* Bento 4: Distance */}
          <View style={[styles.bentoTile, { backgroundColor: AppTheme.colors.bentoDistance }]}>
            <View style={styles.bentoHeader}>
              <Text style={styles.bentoCategory}>DISTANCE</Text>
              <View style={[styles.bentoIconBadge, { backgroundColor: '#CEF0E9' }]}>
                <Ionicons name="navigate-outline" size={16} color="#0D9488" />
              </View>
            </View>
            <Text style={styles.bentoValue}>{distanceKm} <Text style={styles.bentoUnit}>km</Text></Text>
            <View style={styles.bentoProgressTrack}>
              <View
                style={[
                  styles.bentoProgressFill,
                  { width: `${Math.min(100, (parseFloat(distanceKm) / 8) * 100)}%`, backgroundColor: '#0D9488' },
                ]}
              />
            </View>
            <Text style={styles.bentoSubtext}>Target: 8.0 km</Text>
          </View>
        </View>

        {/* 2.4 Primary Action Button (Start Workout) */}
        <Pressable
          onPress={handleStartWorkout}
          style={({ pressed }) => [
            styles.startWorkoutButton,
            pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 },
          ]}
        >
          <View style={styles.plusIconWrapper}>
            <Ionicons name="add" size={22} color={AppTheme.colors.textPrimary} />
          </View>
          <Text style={styles.startWorkoutButtonText}>Start Workout</Text>
        </Pressable>

        {/* Bottom spacer for floating bottom navigation bar */}
        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  canvasContainer: {
    flex: 1,
    backgroundColor: AppTheme.colors.canvas,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },

  // 2.1 Header Bar
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: AppTheme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: AppTheme.colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  monthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: AppTheme.colors.surfaceCard,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: AppTheme.radius.capsule,
    borderWidth: 1,
    borderColor: AppTheme.colors.borderCard,
  },
  monthBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppTheme.colors.textPrimary,
  },
  headerActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppTheme.colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: AppTheme.colors.borderCard,
    ...AppTheme.shadows.warmCard,
  },
  avatarBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppTheme.colors.accentSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Weekly Date Scroller
  dateScrollerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surfaceCard,
    borderRadius: AppTheme.radius.bentoCard,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: AppTheme.colors.borderCard,
    ...AppTheme.shadows.warmCard,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  dayAbbr: {
    fontSize: 11,
    fontWeight: '600',
    color: AppTheme.colors.textMuted,
    letterSpacing: 0.3,
  },
  dayNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberBadgeSelected: {
    backgroundColor: AppTheme.colors.dateBadgeSelected,
  },
  dayNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppTheme.colors.textPrimary,
  },
  dayNumberTextSelected: {
    fontWeight: '800',
    color: AppTheme.colors.accentSecondary,
  },

  // 2.2 Hero Status Card
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.colors.heroBackground,
    borderRadius: AppTheme.radius.majorCard,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...AppTheme.shadows.heroGlow,
  },
  heroLeft: {
    marginRight: 18,
  },
  recoveryRingContainer: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: AppTheme.colors.accentPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  recoveryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: AppTheme.colors.textWhite,
  },
  recoveryLabel: {
    fontSize: 10,
    color: AppTheme.colors.accentMint,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  heroRight: {
    flex: 1,
  },
  heroStatusHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: AppTheme.colors.textWhite,
    marginBottom: 4,
  },
  heroStatusSub: {
    fontSize: 12,
    color: AppTheme.colors.accentMint,
    fontWeight: '500',
    marginBottom: 10,
  },
  windowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(183, 243, 77, 0.12)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: AppTheme.radius.capsule,
    alignSelf: 'flex-start',
  },
  windowBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: AppTheme.colors.accentPrimary,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppTheme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  sectionCaption: {
    fontSize: 12,
    color: AppTheme.colors.textSecondary,
    fontWeight: '500',
  },

  // 2.3 2x2 Bento Activity Grid
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  bentoTile: {
    width: '48%',
    borderRadius: AppTheme.radius.bentoCard,
    padding: 16,
    justifyContent: 'space-between',
  },
  bentoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bentoCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: AppTheme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  bentoIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoValue: {
    fontSize: 22,
    fontWeight: '800',
    color: AppTheme.colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  bentoUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: AppTheme.colors.textSecondary,
  },
  bentoProgressTrack: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  bentoProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  bentoSubtext: {
    fontSize: 11,
    fontWeight: '500',
    color: AppTheme.colors.textSecondary,
  },

  // 2.4 Primary Action Button (Start Workout)
  startWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    backgroundColor: AppTheme.colors.accentPrimary,
    borderRadius: AppTheme.radius.button,
    gap: 8,
    ...AppTheme.shadows.ctaGlow,
  },
  plusIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startWorkoutButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: AppTheme.colors.textPrimary,
    letterSpacing: 0.3,
  },
});
