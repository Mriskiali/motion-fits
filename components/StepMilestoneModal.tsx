import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Flame, Trophy, TrendingUp, Sparkles, X, Footprints } from 'lucide-react-native';
import { useStepStore } from '@/store/useStepStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { AppFonts } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

export default function StepMilestoneModal() {
  const colors = useThemeColors();
  const { t, language } = useTranslation();
  const activeMilestone = useStepStore((state) => state.activeMilestone);
  const dismissMilestone = useStepStore((state) => state.dismissMilestone);

  useEffect(() => {
    if (activeMilestone) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [activeMilestone]);

  if (!activeMilestone) return null;

  const is100 = activeMilestone.type === 100;

  const title = is100
    ? language === 'id'
      ? 'Luar Biasa! Target 100% Tercapai!'
      : 'Amazing! 100% Goal Reached!'
    : language === 'id'
    ? 'Setengah Jalan! 50% Target Tercapai'
    : 'Halfway There! 50% Goal Reached';

  const subtitle = is100
    ? language === 'id'
      ? 'Pencapaian luar biasa! Target langkah harianmu tuntas hari ini. Tubuhmu berterima kasih!'
      : 'Incredible accomplishment! Your daily step goal is fully crushed. Your body thanks you!'
    : language === 'id'
    ? 'Hebat! Kamu sudah melangkah separuh jalan hari ini. Pertahankan ritmemu!'
    : 'Great job! You are halfway through your daily step target. Keep the momentum going!';

  const ctaText = is100
    ? language === 'id'
      ? 'Mantap, Keren Banget!'
      : 'Awesome, Keep It Up!'
    : language === 'id'
    ? 'Lanjut Melangkah'
    : 'Keep Moving';

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    dismissMilestone();
  };

  return (
    <Modal
      visible={true}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.cardContainer,
            {
              backgroundColor: colors.cardSurface,
              borderColor: is100 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)',
            },
          ]}
        >
          {/* Close button */}
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: colors.surfaceHighlight }]}
            onPress={handleDismiss}
            activeOpacity={0.7}
          >
            <X size={16} color={colors.textSecondary} strokeWidth={2.4} />
          </TouchableOpacity>

          {/* Glowing Badge Header */}
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: is100 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              },
            ]}
          >
            {is100 ? (
              <Trophy size={36} color="#10B981" strokeWidth={2.2} />
            ) : (
              <Flame size={36} color={colors.primaryAction} strokeWidth={2.2} />
            )}
          </View>

          {/* Title and message */}
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>

          {/* Step Progress Card */}
          <View style={[styles.progressBox, { backgroundColor: colors.elevatedSurface, borderColor: colors.borderSubtle }]}>
            <View style={styles.progressHeaderRow}>
              <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
                {language === 'id' ? 'PROGRES LANGKAH' : 'STEP PROGRESS'}
              </Text>
              <Text
                style={[
                  styles.progressPercent,
                  { color: is100 ? '#10B981' : colors.primaryAction },
                ]}
              >
                {activeMilestone.percent}%
              </Text>
            </View>

            <View style={styles.trackBase}>
              <View
                style={[
                  styles.trackFill,
                  {
                    width: `${Math.min(100, activeMilestone.percent)}%`,
                    backgroundColor: is100 ? '#10B981' : colors.primaryAction,
                  },
                ]}
              />
            </View>

            <Text style={[styles.stepsText, { color: colors.textPrimary }]}>
              {activeMilestone.steps.toLocaleString()}{' '}
              <Text style={{ color: colors.textMuted, fontSize: 13, fontFamily: AppFonts.medium }}>
                / {activeMilestone.goal.toLocaleString()} {language === 'id' ? 'langkah' : 'steps'}
              </Text>
            </Text>
          </View>

          {/* Stats 2-Column Row */}
          <View style={styles.statsRow}>
            <View style={[styles.statCol, { backgroundColor: colors.elevatedSurface, borderColor: colors.borderSubtle }]}>
              <TrendingUp size={14} color={colors.primaryAction} />
              <Text style={[styles.statVal, { color: colors.textPrimary }]}>
                {activeMilestone.distanceKm} km
              </Text>
              <Text style={[styles.statSub, { color: colors.textMuted }]}>
                {language === 'id' ? 'Jarak' : 'Distance'}
              </Text>
            </View>

            <View style={[styles.statCol, { backgroundColor: colors.elevatedSurface, borderColor: colors.borderSubtle }]}>
              <Flame size={14} color="#EF4444" />
              <Text style={[styles.statVal, { color: colors.textPrimary }]}>
                {activeMilestone.caloriesKcal} kcal
              </Text>
              <Text style={[styles.statSub, { color: colors.textMuted }]}>
                {language === 'id' ? 'Kalori' : 'Calories'}
              </Text>
            </View>
          </View>

          {/* Action CTA Button */}
          <TouchableOpacity
            style={[
              styles.ctaButton,
              { backgroundColor: is100 ? '#10B981' : colors.primaryAction },
            ]}
            onPress={handleDismiss}
            activeOpacity={0.85}
          >
            {is100 ? (
              <Trophy size={17} color="#000000" strokeWidth={2.5} />
            ) : (
              <Footprints size={17} color="#000000" strokeWidth={2.5} />
            )}
            <Text style={styles.ctaButtonText}>{ctaText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1.5,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 18,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    marginTop: 4,
  },
  modalTitle: {
    fontFamily: AppFonts.bold,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    paddingHorizontal: 8,
    letterSpacing: -0.2,
  },
  modalSubtitle: {
    fontFamily: AppFonts.medium,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  progressBox: {
    width: '100%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontFamily: AppFonts.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  progressPercent: {
    fontFamily: AppFonts.extraBold,
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  trackBase: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  trackFill: {
    height: '100%',
    borderRadius: 3,
  },
  stepsText: {
    fontFamily: AppFonts.bold,
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 16,
  },
  statCol: {
    flex: 1,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
  },
  statVal: {
    fontFamily: AppFonts.bold,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statSub: {
    fontFamily: AppFonts.medium,
    fontSize: 10,
  },
  ctaButton: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  ctaButtonText: {
    fontFamily: AppFonts.bold,
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
});
