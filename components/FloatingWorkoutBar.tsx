import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, Platform, TouchableOpacity, AppState, AppStateStatus } from 'react-native';
import Animated, {
  SlideInDown,
  SlideOutDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useRouter, usePathname } from 'expo-router';
import { Dumbbell, Clock, ChevronRight, Timer, Plus, FastForward } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useUserStore } from '@/store/useUserStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { AppFonts } from '@/constants/theme';
import {
  playTimerSound,
  triggerTimerFinishedVibration,
  triggerCountdownTickVibration,
} from '@/utils/soundPlayer';
import { showRestTimerFinishedNotification } from '@/utils/notifications';

export default function FloatingWorkoutBar() {
  const activeSession = useWorkoutStore((s) => s.activeSession);
  let pathname = '';
  try {
    pathname = usePathname() || '';
  } catch (e) {
    pathname = '';
  }
  const isOnActiveScreen = pathname === '/workout/active' || pathname.includes('active');

  if (!activeSession || isOnActiveScreen) {
    return null;
  }

  return <FloatingWorkoutBarContent activeSession={activeSession} isOnActiveScreen={isOnActiveScreen} />;
}

function FloatingWorkoutBarContent({
  activeSession,
  isOnActiveScreen,
}: {
  activeSession: NonNullable<ReturnType<typeof useWorkoutStore.getState>['activeSession']>;
  isOnActiveScreen: boolean;
}) {
  const router = useRouter();
  const template = useWorkoutStore(
    useCallback((s) => s.templates?.find((t) => t.id === activeSession.templateId), [activeSession.templateId])
  );
  const adjustRestTimer = useWorkoutStore((s) => s.adjustRestTimer);
  const completeRestTimer = useWorkoutStore((s) => s.completeRestTimer);
  const hapticsEnabled = useUserStore((s) => s.hapticsEnabled);
  const audioNotification = useUserStore((s) => s.audioNotification);
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [restSecondsRemaining, setRestSecondsRemaining] = useState<number | null>(null);

  // Pulse animation shared value
  const pulseOpacity = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      true
    );
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const animatedPulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  // Live Timer based on activeSession.startTime timestamp
  useEffect(() => {
    if (!activeSession?.startTime) return;

    const updateTimer = () => {
      const ms = Date.now() - activeSession.startTime;
      setElapsedSeconds(Math.max(0, Math.floor(ms / 1000)));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSession?.startTime]);

  // Live Rest Timer monitoring with AppState sync
  const activeRest = activeSession?.activeRestTimer;

  // Sync immediately on AppState active (waking up or foregrounded)
  useEffect(() => {
    if (isOnActiveScreen) return;

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        const currentRest = useWorkoutStore.getState().activeSession?.activeRestTimer;
        if (currentRest?.targetEndTime) {
          const rem = Math.ceil((currentRest.targetEndTime - Date.now()) / 1000);
          if (rem <= 0) {
            // Already finished while phone was asleep/backgrounded.
            // Settle timer cleanly without duplicate notification.
            completeRestTimer();
            setRestSecondsRemaining(null);
          } else {
            setRestSecondsRemaining(rem);
          }
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [isOnActiveScreen, completeRestTimer]);

  useEffect(() => {
    if (isOnActiveScreen || !activeRest) {
      setRestSecondsRemaining(null);
      return;
    }

    if (activeRest.targetEndTime <= Date.now()) {
      completeRestTimer();
      setRestSecondsRemaining(null);
      return;
    }

    const checkRest = () => {
      const rem = Math.ceil((activeRest.targetEndTime - Date.now()) / 1000);

      if (rem <= 0) {
        triggerTimerFinishedVibration(hapticsEnabled);
        playTimerSound(audioNotification);
        showRestTimerFinishedNotification().catch(() => {});
        completeRestTimer();
        setRestSecondsRemaining(null);
        return;
      }

      setRestSecondsRemaining(rem);

      if (rem <= 3 && rem > 0) {
        triggerCountdownTickVibration(hapticsEnabled);
      }
    };

    checkRest();
    const interval = setInterval(checkRest, 1000);
    return () => clearInterval(interval);
  }, [isOnActiveScreen, activeRest?.targetEndTime, completeRestTimer, hapticsEnabled, audioNotification]);

  const workoutName = template?.name || t('custom_workout');

  // Compute total sets & completed sets count
  const completedSetsMap = activeSession.completedSetsMap || {};
  let completedSetsCount = 0;
  Object.values(completedSetsMap).forEach((sets) => {
    if (Array.isArray(sets)) {
      completedSetsCount += sets.length;
    }
  });

  const totalSetsCount = template?.exercises
    ? template.exercises.reduce(
        (acc, ex) => acc + (typeof ex.sets === 'number' ? ex.sets : parseInt(ex.sets as any, 10) || 0),
        0
      )
    : 0;

  const formatTime = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleResume = () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/workout/active');
  };

  const hasActiveRest = restSecondsRemaining !== null && restSecondsRemaining > 0;
  const restMinutes = hasActiveRest ? Math.floor(restSecondsRemaining / 60) : 0;
  const restSecs = hasActiveRest ? restSecondsRemaining % 60 : 0;
  const formattedRest = `${restMinutes}:${restSecs.toString().padStart(2, '0')}`;

  const restTotal = activeRest?.totalDuration || (restSecondsRemaining || 60);
  const restProgress = hasActiveRest && restTotal > 0 ? restSecondsRemaining / restTotal : 0;
  const isRestWarning = hasActiveRest && restSecondsRemaining <= 3;

  return (
    <Animated.View
      entering={SlideInDown.duration(280)}
      exiting={SlideOutDown.duration(200)}
      style={styles.wrapper}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={handleResume}
        style={({ pressed }) => [
          styles.container,
          hasActiveRest && styles.containerWithRest,
          pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 },
        ]}
      >
        {/* Left: Animated icon */}
        <View style={[styles.iconBox, hasActiveRest && styles.iconBoxResting]}>
          <Animated.View
            style={[
              styles.pulseDot,
              hasActiveRest && { backgroundColor: '#F59E0B' },
              animatedPulseStyle,
            ]}
          />
          {hasActiveRest ? (
            <Timer size={20} color="#F59E0B" strokeWidth={2.4} />
          ) : (
            <Dumbbell size={20} color={colors.primaryAction} strokeWidth={2.2} />
          )}
        </View>

        {/* Center: Workout info & live rest timer stats */}
        <View style={styles.infoBox}>
          <View style={styles.titleRow}>
            <Text style={styles.workoutTitle} numberOfLines={1}>
              {workoutName}
            </Text>
            {hasActiveRest && (
              <View style={styles.restingBadge}>
                <Text style={styles.restingBadgeText}>{t('rest_period')}</Text>
              </View>
            )}
          </View>

          <View style={styles.metaRow}>
            {hasActiveRest ? (
              <>
                <View style={styles.restCountdownBadge}>
                  <Text
                    style={[
                      styles.restCountdownDigits,
                      isRestWarning && styles.restCountdownWarning,
                    ]}
                  >
                    {formattedRest}
                  </Text>
                </View>
                <Text style={styles.dotSeparator}>•</Text>
                <View style={styles.timerBadge}>
                  <Clock size={11} color={colors.textSecondary} strokeWidth={2} />
                  <Text style={styles.metaText}>{formatTime(elapsedSeconds)}</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.timerBadge}>
                  <Clock size={12} color={colors.textSecondary} strokeWidth={2} />
                  <Text style={styles.metaText}>{formatTime(elapsedSeconds)}</Text>
                </View>
                <Text style={styles.dotSeparator}>•</Text>
                <Text style={styles.metaText}>
                  {completedSetsCount}
                  {totalSetsCount > 0 ? `/${totalSetsCount}` : ''} {t('set')}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Right side: Quick Rest Actions if resting, or simple Resume badge */}
        {hasActiveRest ? (
          <View style={styles.restActionGroup}>
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.quickPlusBtn}
              onPress={(e) => {
                e.stopPropagation();
                if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                adjustRestTimer(15);
              }}
            >
              <Plus size={12} color={colors.textPrimary} strokeWidth={2.5} />
              <Text style={styles.quickPlusText}>15{t('seconds_short')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.quickSkipBtn}
              onPress={(e) => {
                e.stopPropagation();
                if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                completeRestTimer();
              }}
            >
              <Text style={styles.quickSkipText}>{t('skip')}</Text>
              <FastForward size={12} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.resumeButton}>
            <Text style={styles.resumeButtonText}>{t('resume')}</Text>
            <ChevronRight size={14} color="#FFFFFF" strokeWidth={2.5} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    wrapper: {
      position: 'absolute',
      bottom: 104, // Positions above bottom bar
      left: 16,
      right: 16,
      zIndex: 9999,
      elevation: 9999,
    },
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardSurface,
      borderRadius: 18,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderWidth: 1.5,
      borderColor: colors.borderSubtle,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    containerWithRest: {
      borderColor: 'rgba(245, 158, 11, 0.45)',
      backgroundColor: colors.cardSurface,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.surfaceHighlight,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      marginRight: 12,
    },
    iconBoxResting: {
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
    },
    pulseDot: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: colors.successBadge,
    },
    infoBox: {
      flex: 1,
      justifyContent: 'center',
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 2,
    },
    workoutTitle: {
      fontFamily: AppFonts.bold,
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
      letterSpacing: -0.2,
      maxWidth: '75%',
    },
    restingBadge: {
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    restingBadgeText: {
      fontFamily: AppFonts.bold,
      fontSize: 11,
      fontWeight: '800',
      color: '#F59E0B',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    timerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    metaText: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    restCountdownBadge: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    restCountdownDigits: {
      fontFamily: AppFonts.extraBold,
      fontSize: 14,
      fontWeight: '800',
      color: '#F59E0B',
      fontVariant: ['tabular-nums'],
    },
    restCountdownWarning: {
      color: '#EF4444',
    },
    dotSeparator: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      color: colors.textMuted,
    },
    resumeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: colors.primaryAction,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
      marginLeft: 6,
    },
    resumeButtonText: {
      fontFamily: AppFonts.bold,
      color: '#000000',
      fontSize: 13,
      fontWeight: '800',
    },
    restActionGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginLeft: 6,
    },
    quickPlusBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: colors.surfaceHighlight,
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    quickPlusText: {
      fontFamily: AppFonts.bold,
      fontSize: 11,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    quickSkipBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: '#F59E0B',
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 10,
    },
    quickSkipText: {
      fontFamily: AppFonts.bold,
      fontSize: 11,
      fontWeight: '800',
      color: '#000000',
    },
  });
