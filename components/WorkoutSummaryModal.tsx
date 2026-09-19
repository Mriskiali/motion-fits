import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import {
  Share2,
  X,
  Flame,
  Clock,
  CheckCircle2,
  Trophy,
  Dumbbell,
  TrendingUp,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';
import { useTranslation } from '@/hooks/useTranslation';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useUserStore } from '@/store/useUserStore';
import { AppFonts } from '@/constants/theme';

export interface ExerciseSummarySetItem {
  setNumber: number;
  reps: number;
  weight?: number;
  isTimeBased?: boolean;
}

export interface ExerciseSummaryItem {
  name: string;
  setsCount: number;
  totalReps?: number;
  weight?: number;
  sets?: ExerciseSummarySetItem[];
}

export interface WorkoutSummaryModalProps {
  visible: boolean;
  workoutName: string;
  duration: number; // in seconds
  exercises: ExerciseSummaryItem[];
  streak: number;
  totalReps?: number;
  totalVolume?: number;
  maxWeight?: number;
  date?: string;
  onClose: () => void;
}

export default function WorkoutSummaryModal({
  visible,
  workoutName,
  duration,
  exercises,
  streak,
  totalReps,
  totalVolume,
  maxWeight,
  date,
  onClose,
}: WorkoutSummaryModalProps) {
  const { t, language } = useTranslation();
  const colors = useThemeColors();
  const hapticsEnabled = useUserStore((s) => s.hapticsEnabled);
  const cardRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}h ${remMins}m`;
    }
    return `${mins}m ${secs}s`;
  };

  const totalSets = exercises.reduce((acc, curr) => acc + curr.setsCount, 0);

  // Calculate highest weight lifted across exercises if not provided
  const peakWeight =
    maxWeight ||
    exercises.reduce((max, ex) => {
      const w = ex.weight || 0;
      return w > max ? w : max;
    }, 0);

  const cardDate = date ? new Date(date) : new Date();
  const formattedDate = format(cardDate, 'EEEE, dd MMM yyyy', {
    locale: language === 'id' ? idLocale : undefined,
  });

  const handleShare = async () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      Vibration.vibrate(40);
    }
    if (!cardRef.current) return;

    try {
      setIsSharing(true);
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1.0,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: t('share_story'),
        });
      }
    } catch (error) {
      console.warn('Error sharing workout summary card:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleClose = () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      Vibration.vibrate(30);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.topHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Trophy size={20} color="#F59E0B" />
              <Text style={styles.modalHeaderTitle}>{t('workout_summary') || 'Ringkasan Latihan'}</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <X size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollArea}
          >
            {/* The 9:16 Story Card View to be captured */}
            <View
              ref={cardRef}
              collapsable={false}
              style={styles.storyCard}
            >
              {/* Top Branding Row */}
              <View style={styles.brandRow}>
                <View style={styles.brandBadge}>
                  <Flame size={14} color="#F59E0B" />
                  <Text style={styles.brandText}>MOTIONFIT</Text>
                </View>
                <View style={styles.streakBadge}>
                  {streak > 0 ? (
                    <>
                      <Trophy size={11} color="#F59E0B" />
                      <Text style={styles.streakBadgeText}>{streak} {t('day_streak_upper')}</Text>
                    </>
                  ) : (
                    <Text style={styles.dateBadgeText}>{formattedDate}</Text>
                  )}
                </View>
              </View>

              {/* Hero Title Section */}
              <View style={styles.titleSection}>
                <View style={styles.completedTagRow}>
                  <View style={styles.greenDot} />
                  <Text style={styles.celebrationSubtitle}>
                    {t('workout_done')} • {formattedDate}
                  </Text>
                </View>
                <Text style={styles.cardWorkoutName} numberOfLines={2}>
                  {workoutName}
                </Text>
              </View>

              {/* Bento Stats Grid (2x2) */}
              <View style={styles.statsGrid}>
                {/* Duration */}
                <View style={styles.statBox}>
                  <View style={[styles.statIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                    <Clock size={16} color="#F59E0B" />
                  </View>
                  <Text style={styles.statValue}>{formatDuration(duration)}</Text>
                  <Text style={styles.statLabel}>{t('duration') || 'Durasi'}</Text>
                </View>

                {/* Total Sets */}
                <View style={styles.statBox}>
                  <View style={[styles.statIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                    <CheckCircle2 size={16} color="#10B981" />
                  </View>
                  <Text style={styles.statValue}>{totalSets} Set</Text>
                  <Text style={styles.statLabel}>{t('total_sets') || 'Total Set'}</Text>
                </View>

                {/* Total Reps */}
                <View style={styles.statBox}>
                  <View style={[styles.statIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                    <Flame size={16} color="#F59E0B" />
                  </View>
                  <Text style={styles.statValue}>
                    {typeof totalReps === 'number' && totalReps > 0
                      ? `${totalReps} Reps`
                      : `${exercises.reduce((acc, curr) => acc + curr.setsCount, 0)} Reps`}
                  </Text>
                  <Text style={styles.statLabel}>{t('total_reps') || 'Total Reps'}</Text>
                </View>

                {/* Peak Weight */}
                <View style={styles.statBox}>
                  <View style={[styles.statIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                    <Trophy size={16} color="#F59E0B" />
                  </View>
                  <Text style={styles.statValue}>
                    {peakWeight > 0 ? `${peakWeight} kg` : 'Bodyweight'}
                  </Text>
                  <Text style={styles.statLabel}>
                    {peakWeight > 0 ? t('peak_weight') : t('weight_mode')}
                  </Text>
                </View>
              </View>

              {/* Clean Exercises Summary */}
              <View style={styles.exerciseSection}>
                <View style={styles.exerciseHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TrendingUp size={14} color="#10B981" />
                    <Text style={styles.exerciseHeaderLabel}>
                      {t('exercises_completed')}
                    </Text>
                  </View>
                  <Text style={styles.exerciseCountSub}>
                    {exercises.length} {t('exercises_count')}
                  </Text>
                </View>

                {exercises.slice(0, 5).map((ex, idx) => (
                  <View key={idx} style={styles.exerciseCardItem}>
                    <View style={styles.exerciseItemLeft}>
                      <View style={styles.exOrderBadge}>
                        <Text style={styles.exOrderText}>{String(idx + 1).padStart(2, '0')}</Text>
                      </View>
                      <Text style={styles.exerciseItemName} numberOfLines={1}>
                        {ex.name}
                      </Text>
                    </View>

                    <View style={styles.exercisePillWrap}>
                      <Text style={styles.exercisePillText}>
                        {ex.setsCount} Set{ex.weight && ex.weight > 0 ? ` • ${ex.weight} kg` : ex.totalReps ? ` • ${ex.totalReps}r` : ''}
                      </Text>
                    </View>
                  </View>
                ))}

                {exercises.length > 5 && (
                  <Text style={styles.moreExercisesText}>
                    +{exercises.length - 5} {t('more_exercises_completed')}
                  </Text>
                )}
              </View>

              {/* Card Footer Watermark */}
              <View style={styles.cardFooter}>
                <View style={styles.watermarkRow}>
                  <Dumbbell size={13} color="#F59E0B" />
                  <Text style={styles.footerTagline}>
                    Tracked with <Text style={{ color: '#F59E0B', fontWeight: '800' }}>MotionFit</Text> • Progressive Overload
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.shareBtn}
              onPress={handleShare}
              disabled={isSharing}
              activeOpacity={0.8}
            >
              {isSharing ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <>
                  <Share2 size={18} color="#000000" />
                  <Text style={styles.shareBtnText}>{t('share_story') || 'Bagikan ke Story'}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Text style={styles.doneBtnText}>{t('done') || 'Tutup'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#12131A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 22,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalHeaderTitle: {
    fontFamily: AppFonts.extraBold,
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A1B24',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  scrollArea: {
    paddingBottom: 16,
    alignItems: 'center',
  },

  // 9:16 Story Card Container (Deep Obsidian with Sleek Glass Border)
  storyCard: {
    width: '100%',
    backgroundColor: '#0D0E15',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 18,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  brandText: {
    fontFamily: AppFonts.extraBold,
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#161722',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  streakBadgeText: {
    fontFamily: AppFonts.bold,
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dateBadgeText: {
    fontFamily: AppFonts.medium,
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  titleSection: {
    marginBottom: 18,
  },
  completedTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  celebrationSubtitle: {
    fontFamily: AppFonts.bold,
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardWorkoutName: {
    fontFamily: AppFonts.extraBold,
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },

  // Bento Stats Grid (2x2)
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#161722',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  statIconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontFamily: AppFonts.extraBold,
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 2,
    letterSpacing: -0.4,
  },
  statLabel: {
    fontFamily: AppFonts.bold,
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Exercise Breakdown Section
  exerciseSection: {
    backgroundColor: '#161722',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 16,
  },
  exerciseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  exerciseHeaderLabel: {
    fontFamily: AppFonts.bold,
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  exerciseCountSub: {
    fontFamily: AppFonts.medium,
    fontSize: 12,
    color: '#64748B',
  },
  exerciseCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  exerciseItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  exOrderBadge: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exOrderText: {
    fontFamily: AppFonts.bold,
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '800',
  },
  exerciseItemName: {
    fontFamily: AppFonts.bold,
    fontSize: 14,
    fontWeight: '700',
    color: '#F1F5F9',
    flex: 1,
  },
  exercisePillWrap: {
    backgroundColor: '#1A1B24',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  exercisePillText: {
    fontFamily: AppFonts.bold,
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  moreExercisesText: {
    fontFamily: AppFonts.medium,
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 10,
    textAlign: 'center',
  },

  // Footer Watermark
  cardFooter: {
    alignItems: 'center',
    paddingTop: 4,
  },
  watermarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerTagline: {
    fontFamily: AppFonts.medium,
    color: '#64748B',
    fontSize: 11,
  },

  // Action Buttons
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  shareBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    borderRadius: 14,
  },
  shareBtnText: {
    fontFamily: AppFonts.bold,
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
  doneBtn: {
    flex: 1,
    backgroundColor: '#1A1B24',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  doneBtnText: {
    fontFamily: AppFonts.bold,
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
});
