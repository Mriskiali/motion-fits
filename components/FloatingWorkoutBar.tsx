import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useUserStore } from '@/store/useUserStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

export default function FloatingWorkoutBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { activeSession, templates } = useWorkoutStore();
  const { hapticsEnabled } = useUserStore();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = getStyles(colors);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

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

  // Hide if no active session or already on the active workout screen
  if (!activeSession || pathname === '/workout/active') {
    return null;
  }

  const template = templates.find((t) => t.id === activeSession.templateId);
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
    ? template.exercises.reduce((acc, ex) => acc + (typeof ex.sets === 'number' ? ex.sets : parseInt(ex.sets as any, 10) || 0), 0)
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

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <Pressable
        onPress={handleResume}
        style={({ pressed }) => [
          styles.container,
          pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 },
        ]}
      >
        {/* Left: Animated pulse badge & workout icon */}
        <View style={styles.iconBox}>
          <View style={styles.pulseDot} />
          <Ionicons name="barbell" size={20} color={colors.primaryAction} />
        </View>

        {/* Middle: Workout info & live stats */}
        <View style={styles.infoBox}>
          <Text style={styles.workoutTitle} numberOfLines={1}>
            {workoutName}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.timerBadge}>
              <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.metaText}>{formatTime(elapsedSeconds)}</Text>
            </View>
            <Text style={styles.dotSeparator}>•</Text>
            <Text style={styles.metaText}>
              {completedSetsCount}{totalSetsCount > 0 ? `/${totalSetsCount}` : ''} {t('set')}
            </Text>
          </View>
        </View>

        {/* Right: Resume button badge */}
        <View style={styles.resumeButton}>
          <Text style={styles.resumeButtonText}>{t('resume')}</Text>
          <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
        </View>
      </Pressable>
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    wrapper: {
      position: 'absolute',
      bottom: 104, // Positions nicely above the 68px floating pill bottom bar
      left: 20,
      right: 20,
      zIndex: 9999,
      elevation: 9999,
    },
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardSurface,
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderWidth: 1.5,
      borderColor: colors.primaryAction,
      ...Platform.select({
        ios: {
          shadowColor: colors.primaryAction,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    iconBox: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: colors.surfaceHighlight,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      marginRight: 12,
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
    workoutTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      letterSpacing: -0.2,
      marginBottom: 2,
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
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    dotSeparator: {
      fontSize: 12,
      color: colors.textMuted,
    },
    resumeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: colors.primaryAction,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 20,
      marginLeft: 8,
    },
    resumeButtonText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
  });
