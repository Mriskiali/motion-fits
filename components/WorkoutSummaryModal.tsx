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
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { Vibration } from 'react-native';
import {
  Share2,
  X,
  Flame,
  Clock,
  Dumbbell,
  CheckCircle2,
  Trophy,
  Sparkles,
} from 'lucide-react-native';
import { useTranslation } from '@/hooks/useTranslation';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useUserStore } from '@/store/useUserStore';

interface ExerciseSummaryItem {
  name: string;
  setsCount: number;
  totalReps?: number;
  weight?: number;
}

interface WorkoutSummaryModalProps {
  visible: boolean;
  workoutName: string;
  duration: number; // in seconds
  exercises: ExerciseSummaryItem[];
  totalVolume: number;
  streak: number;
  onClose: () => void;
}

export default function WorkoutSummaryModal({
  visible,
  workoutName,
  duration,
  exercises,
  totalVolume,
  streak,
  onClose,
}: WorkoutSummaryModalProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { hapticsEnabled } = useUserStore();
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
          dialogTitle: 'Share Workout Summary',
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
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.topHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Trophy size={22} color="#EAB308" />
              <Text style={styles.modalHeaderTitle}>{t('workout_summary')}</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <X size={20} color={colors.textSecondary} />
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
                  <Sparkles size={14} color="#3B82F6" />
                  <Text style={styles.brandText}>MotionFit</Text>
                </View>
                <Text style={styles.dateText}>
                  {new Date().toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>

              {/* Title Section */}
              <View style={styles.titleSection}>
                <Text style={styles.celebrationText}>{t('workout_crushed')}</Text>
                <Text style={styles.cardWorkoutName}>{workoutName}</Text>
              </View>

              {/* Key Stats Grid */}
              <View style={styles.statsGrid}>
                {/* Duration */}
                <View style={styles.statBox}>
                  <Clock size={18} color="#3B82F6" />
                  <Text style={styles.statValue}>{formatDuration(duration)}</Text>
                  <Text style={styles.statLabel}>{t('duration')}</Text>
                </View>

                {/* Total Sets */}
                <View style={styles.statBox}>
                  <CheckCircle2 size={18} color="#10B981" />
                  <Text style={styles.statValue}>{totalSets}</Text>
                  <Text style={styles.statLabel}>{t('total_sets')}</Text>
                </View>

                {/* Total Volume */}
                <View style={styles.statBox}>
                  <Dumbbell size={18} color="#F59E0B" />
                  <Text style={styles.statValue}>
                    {totalVolume > 0 ? `${totalVolume.toLocaleString()} kg` : 'Bodyweight'}
                  </Text>
                  <Text style={styles.statLabel}>{t('total_volume')}</Text>
                </View>

                {/* Streak */}
                <View style={styles.statBox}>
                  <Flame size={18} color="#EF4444" />
                  <Text style={styles.statValue}>{streak} Days</Text>
                  <Text style={styles.statLabel}>{t('day_streak')}</Text>
                </View>
              </View>

              {/* Exercises Summary List */}
              <View style={styles.exerciseSection}>
                <Text style={styles.exerciseHeaderLabel}>{t('exercises')}</Text>
                {exercises.slice(0, 5).map((ex, idx) => (
                  <View key={idx} style={styles.exerciseRow}>
                    <Text style={styles.exerciseItemName} numberOfLines={1}>
                      {ex.name}
                    </Text>
                    <View style={styles.exerciseSetPill}>
                      <Text style={styles.exerciseSetPillText}>
                        {ex.setsCount} {t('sets_reps') ? 'sets' : 'sets'}
                        {ex.weight ? ` • ${ex.weight}kg` : ''}
                      </Text>
                    </View>
                  </View>
                ))}
                {exercises.length > 5 && (
                  <Text style={styles.moreExercisesText}>
                    +{exercises.length - 5} more exercises completed
                  </Text>
                )}
              </View>

              {/* Card Footer Watermark */}
              <View style={styles.cardFooter}>
                <Text style={styles.footerTagline}>
                  Tracked with <Text style={{ color: '#3B82F6', fontWeight: '800' }}>MotionFit</Text>
                </Text>
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
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Share2 size={18} color="#fff" />
                  <Text style={styles.shareBtnText}>{t('share_story')}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Text style={styles.doneBtnText}>{t('done')}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0F172A', // Obsidian Dark
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '92%',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    paddingBottom: 16,
    alignItems: 'center',
  },
  // 9:16 Story Card Container
  storyCard: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
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
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  brandText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dateText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  titleSection: {
    marginBottom: 20,
  },
  celebrationText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  cardWorkoutName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#38BDF8',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 8,
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  exerciseSection: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  exerciseHeaderLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  exerciseItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F1F5F9',
    flex: 1,
    marginRight: 8,
  },
  exerciseSetPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  exerciseSetPillText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  moreExercisesText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  cardFooter: {
    alignItems: 'center',
    paddingTop: 8,
  },
  footerTagline: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  shareBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 16,
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  doneBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  doneBtnText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
});
