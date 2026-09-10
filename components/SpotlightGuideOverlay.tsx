import React, { useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface SpotlightGuideOverlayProps {
  stepNumber: number;
  totalSteps?: number;
  title: string;
  message: string;
  onNext?: () => void;
  nextLabel?: string;
  onSkip: () => void;
  position?: 'top' | 'bottom';
}

export default function SpotlightGuideOverlay({
  stepNumber,
  totalSteps = 5,
  title,
  message,
  onNext,
  nextLabel,
  onSkip,
  position = 'top',
}: SpotlightGuideOverlayProps) {
  const colors = useThemeColors();
  const { t, language } = useTranslation();
  const isDark = colors.background === '#0B0C0E';

  const translateY = useSharedValue(position === 'top' ? -40 : 40);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 14, stiffness: 140 });
    opacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
  }, [stepNumber]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const progressPct = Math.min(100, Math.max(10, (stepNumber / totalSteps) * 100));

  return (
    <View
      style={[
        styles.overlayContainer,
        position === 'top' ? styles.positionTop : styles.positionBottom,
      ]}
      pointerEvents="box-none"
    >
      <Animated.View
        style={[
          styles.guideCard,
          {
            backgroundColor: colors.cardSurface,
            borderColor: isDark ? '#3B82F6' : '#2563EB',
          },
          animatedCardStyle,
        ]}
      >
        {/* Step Progress Line */}
        <View
          style={[
            styles.progressTrack,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${progressPct}%`,
                backgroundColor: colors.primaryAction,
              },
            ]}
          />
        </View>

        {/* Header: Step counter + Skip link */}
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.stepBadge,
              { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.16)' : 'rgba(59, 130, 246, 0.1)' },
            ]}
          >
            <Ionicons name="compass" size={13} color={colors.primaryAction} style={{ marginRight: 4 }} />
            <Text style={[styles.stepBadgeText, { color: colors.primaryAction }]}>
              {language === 'id'
                ? `Langkah ${stepNumber} dari ${totalSteps}`
                : `Step ${stepNumber} of ${totalSteps}`}
            </Text>
          </View>

          <TouchableOpacity onPress={onSkip} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>
              {t('skip') || 'Lewati'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

        {/* Action Button Row */}
        {onNext && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: colors.primaryAction }]}
              onPress={onNext}
              activeOpacity={0.85}
            >
              <Text style={styles.nextButtonText}>
                {nextLabel || (language === 'id' ? 'Lanjut' : 'Next')}
              </Text>
              <Ionicons name="arrow-forward" size={15} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99999,
  },
  positionTop: {
    top: Platform.OS === 'ios' ? 56 : 42,
  },
  positionBottom: {
    bottom: Platform.OS === 'ios' ? 44 : 28,
  },
  guideCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 14,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  progressTrack: {
    height: 3,
    width: '100%',
    borderRadius: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 12,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
