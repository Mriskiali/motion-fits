import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import {
  Dumbbell,
  Clock,
  CheckCircle2,
  Trophy,
  TrendingUp,
  Share2,
  Trash2,
  X,
  Flame,
  ArrowUpRight,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';
import * as Haptics from 'expo-haptics';
import { useTranslation } from '@/hooks/useTranslation';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { AppFonts } from '@/constants/theme';
import { WorkoutSession, WorkoutTemplate } from '@/store/useWorkoutStore';

export interface WorkoutDetailModalProps {
  visible: boolean;
  session: WorkoutSession | null;
  template?: WorkoutTemplate | null;
  onClose: () => void;
  onShare?: (session: WorkoutSession) => void;
  onDelete?: (sessionId: string) => void;
}

interface SetItem {
  setNumber: number;
  reps: number;
  weight?: number;
  isTimeBased?: boolean;
  weightDelta?: number;
  repsDelta?: number;
}

interface ExerciseDetailItem {
  exerciseId: string;
  name: string;
  weightMode?: string;
  isTimeBased?: boolean;
  maxWeight?: number;
  totalReps: number;
  totalVolume: number;
  sets: SetItem[];
}

export default function WorkoutDetailModal({
  visible,
  session,
  template,
  onClose,
  onShare,
  onDelete,
}: WorkoutDetailModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { t, language } = useTranslation();

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleShare = () => {
    if (!session) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onShare) {
      onShare(session);
    }
  };

  const handleDelete = () => {
    if (!session || !onDelete) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete(session.id);
  };

  // Process exercise breakdown with set-by-set reps, weight, and progressive overload delta
  const { exerciseDetails, totalSets, totalReps, sessionMaxWeight, sessionTotalVolume } = useMemo(() => {
    if (!session) {
      return {
        exerciseDetails: [],
        totalSets: 0,
        totalReps: 0,
        sessionMaxWeight: 0,
        sessionTotalVolume: 0,
      };
    }

    let setsCount = 0;
    let repsCount = 0;
    let maxWeightGlobal = 0;
    let totalVolumeGlobal = 0;

    const list: ExerciseDetailItem[] = (session.completedExercises || []).map((cEx) => {
      const targetEx = template?.exercises.find((e) => e.id === cEx.exerciseId);
      const isTimeBased = targetEx?.type === 'time';
      const name = targetEx?.name || t('unnamed_exercise') || 'Exercise';

      const numSets = Math.max(
        cEx.completedSets?.length || 0,
        cEx.setsDetails ? Object.keys(cEx.setsDetails).length : 0
      );

      const sets: SetItem[] = [];
      let exMaxWeight = 0;
      let exTotalReps = 0;
      let exTotalVolume = 0;

      for (let sIdx = 0; sIdx < numSets; sIdx++) {
        const detail = cEx.setsDetails?.[sIdx];
        let reps = 0;
        if (typeof detail?.reps === 'number') {
          reps = detail.reps;
        } else if (typeof cEx.completedSets?.[sIdx] === 'number') {
          reps = cEx.completedSets[sIdx];
        } else if (typeof targetEx?.reps === 'number') {
          reps = targetEx.reps;
        } else if (typeof targetEx?.reps === 'string') {
          reps = parseInt(targetEx.reps.split('-')[0], 10) || 10;
        } else if (isTimeBased) {
          reps = targetEx?.duration || 0;
        } else {
          reps = 10;
        }

        let weight: number | undefined = undefined;
        if (typeof detail?.weight === 'number' && detail.weight > 0) {
          weight = detail.weight;
        } else if (targetEx?.weight && targetEx.weight > 0) {
          weight = targetEx.weight;
        }

        if (weight && weight > exMaxWeight) {
          exMaxWeight = weight;
        }
        if (weight && weight > maxWeightGlobal) {
          maxWeightGlobal = weight;
        }

        exTotalReps += reps;
        repsCount += reps;
        setsCount += 1;

        if (weight && weight > 0 && !isTimeBased) {
          const setVolume = reps * weight;
          exTotalVolume += setVolume;
          totalVolumeGlobal += setVolume;
        }

        // Calculate Progressive Overload Delta against previous set
        let weightDelta: number | undefined = undefined;
        let repsDelta: number | undefined = undefined;
        if (sIdx > 0 && sets[sIdx - 1]) {
          const prev = sets[sIdx - 1];
          if (weight !== undefined && prev.weight !== undefined) {
            const diff = weight - prev.weight;
            if (diff !== 0) weightDelta = diff;
          }
          if (reps !== prev.reps) {
            repsDelta = reps - prev.reps;
          }
        }

        sets.push({
          setNumber: sIdx + 1,
          reps,
          weight,
          isTimeBased,
          weightDelta,
          repsDelta,
        });
      }

      return {
        exerciseId: cEx.exerciseId,
        name,
        weightMode: targetEx?.weightMode,
        isTimeBased,
        maxWeight: exMaxWeight > 0 ? exMaxWeight : undefined,
        totalReps: exTotalReps,
        totalVolume: exTotalVolume,
        sets,
      };
    });

    return {
      exerciseDetails: list,
      totalSets: setsCount,
      totalReps: repsCount,
      sessionMaxWeight: maxWeightGlobal,
      sessionTotalVolume: totalVolumeGlobal,
    };
  }, [session, template, t]);

  if (!session) return null;

  const workoutDate = new Date(session.date);
  const formattedDate = format(workoutDate, 'EEEE, dd MMMM yyyy • HH:mm', {
    locale: language === 'id' ? idLocale : undefined,
  });
  const durationMins = Math.round((session.duration || 0) / 60);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={styles.modalSheet}>
          {/* Top Sheet Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.workoutIconBox}>
                <Dumbbell size={20} color={colors.primaryAction} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.workoutTitle} numberOfLines={1}>
                  {template?.name || t('workout')}
                </Text>
                <Text style={styles.workoutDateSubtitle}>{formattedDate}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Quick Metrics Strip */}
          <View style={styles.metricsStrip}>
            {/* Duration */}
            <View style={styles.metricCard}>
              <View style={[styles.metricIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
                <Clock size={14} color="#38BDF8" />
              </View>
              <Text style={styles.metricValue}>{durationMins} {t('min_short') || 'mnt'}</Text>
              <Text style={styles.metricLabel}>{t('duration') || 'Durasi'}</Text>
            </View>

            {/* Total Sets */}
            <View style={styles.metricCard}>
              <View style={[styles.metricIconBox, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
                <CheckCircle2 size={14} color="#22C55E" />
              </View>
              <Text style={styles.metricValue}>{totalSets} Set</Text>
              <Text style={styles.metricLabel}>{t('total_sets') || 'Total Set'}</Text>
            </View>

            {/* Total Reps */}
            <View style={styles.metricCard}>
              <View style={[styles.metricIconBox, { backgroundColor: 'rgba(234, 179, 8, 0.12)' }]}>
                <Flame size={14} color="#F59E0B" />
              </View>
              <Text style={styles.metricValue}>{totalReps} Reps</Text>
              <Text style={styles.metricLabel}>{t('total_reps') || 'Total Reps'}</Text>
            </View>

            {/* Max Weight / Volume */}
            <View style={styles.metricCard}>
              <View style={[styles.metricIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.12)' }]}>
                <Trophy size={14} color="#A855F7" />
              </View>
              <Text style={styles.metricValue}>
                {sessionMaxWeight > 0 ? `${sessionMaxWeight} kg` : 'Bodyweight'}
              </Text>
              <Text style={styles.metricLabel}>
                {sessionMaxWeight > 0 ? (language === 'id' ? 'Beban Puncak' : 'Max Weight') : 'Mode'}
              </Text>
            </View>
          </View>

          {/* Progressive Overload Section Header */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWrap}>
              <TrendingUp size={16} color="#22C55E" />
              <Text style={styles.sectionTitle}>
                {language === 'id' ? 'Histori Beban & Set (Progressive Overload)' : 'Weight & Set History'}
              </Text>
            </View>
            <View style={styles.overloadBadge}>
              <Text style={styles.overloadBadgeText}>
                {exerciseDetails.length} {language === 'id' ? 'Gerakan' : 'Exercises'}
              </Text>
            </View>
          </View>

          {/* Scrollable Exercise & Sets Breakdown */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollList}
          >
            {exerciseDetails.map((ex, exIdx) => (
              <View key={`${ex.exerciseId}-${exIdx}`} style={styles.exerciseCard}>
                {/* Exercise Name & Top Info */}
                <View style={styles.exerciseTopRow}>
                  <View style={styles.exerciseNameCol}>
                    <Text style={styles.exerciseNameText}>{ex.name}</Text>
                    <Text style={styles.exerciseMetaText}>
                      {ex.sets.length} Set • {ex.totalReps} Reps
                      {ex.maxWeight ? ` • ${t('peak_weight')} ${ex.maxWeight} kg` : ''}
                    </Text>
                  </View>
                  {ex.maxWeight && (
                    <View style={styles.maxWeightPill}>
                      <Trophy size={11} color="#A855F7" />
                      <Text style={styles.maxWeightPillText}>{ex.maxWeight} kg</Text>
                    </View>
                  )}
                </View>

                {/* Table Header */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableColHeader, { width: 52 }]}>{t('set').toUpperCase()}</Text>
                  <Text style={[styles.tableColHeader, { flex: 1 }]}>
                    {ex.isTimeBased ? t('col_duration') : t('col_reps')}
                  </Text>
                  <Text style={[styles.tableColHeader, { width: 90, textAlign: 'right' }]}>
                    {t('col_weight')}
                  </Text>
                  <Text style={[styles.tableColHeader, { width: 75, textAlign: 'right' }]}>
                    {t('col_progress')}
                  </Text>
                </View>

                {/* Set Rows */}
                {ex.sets.map((setItem) => (
                  <View key={`set-${setItem.setNumber}`} style={styles.setRow}>
                    {/* Set Number Pill */}
                    <View style={styles.setNumberPill}>
                      <Text style={styles.setNumberText}>#{setItem.setNumber}</Text>
                    </View>

                    {/* Reps or Time */}
                    <View style={{ flex: 1, paddingHorizontal: 6 }}>
                      <Text style={styles.setRepsText}>
                        {setItem.reps} {setItem.isTimeBased ? t('seconds_short') : 'reps'}
                      </Text>
                    </View>

                    {/* Weight Badge */}
                    <View style={styles.setWeightCol}>
                      {setItem.weight && setItem.weight > 0 ? (
                        <View style={styles.weightBadge}>
                          <Text style={styles.weightBadgeText}>{setItem.weight} kg</Text>
                        </View>
                      ) : (
                        <Text style={styles.bodyweightText}>
                          {setItem.isTimeBased ? '-' : 'Bodyweight'}
                        </Text>
                      )}
                    </View>

                    {/* Progressive Overload Trend Indicator */}
                    <View style={styles.trendCol}>
                      {setItem.weightDelta && setItem.weightDelta > 0 ? (
                        <View style={styles.trendPillUp}>
                          <ArrowUpRight size={10} color="#22C55E" />
                          <Text style={styles.trendPillUpText}>+{setItem.weightDelta}kg</Text>
                        </View>
                      ) : setItem.weightDelta && setItem.weightDelta < 0 ? (
                        <View style={styles.trendPillDown}>
                          <Text style={styles.trendPillDownText}>{setItem.weightDelta}kg</Text>
                        </View>
                      ) : setItem.repsDelta && setItem.repsDelta > 0 ? (
                        <View style={styles.trendPillReps}>
                          <Text style={styles.trendPillRepsText}>+{setItem.repsDelta}r</Text>
                        </View>
                      ) : (
                        <View style={styles.trendPillNeutral}>
                          <Text style={styles.trendPillNeutralText}>-</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ))}


          </ScrollView>

          {/* Modal Action Bar */}
          <View style={styles.footerRow}>
            {onDelete && (
              <TouchableOpacity
                style={styles.deleteActionBtn}
                onPress={handleDelete}
                activeOpacity={0.7}
              >
                <Trash2 size={16} color={colors.danger} />
              </TouchableOpacity>
            )}

            {onShare && (
              <TouchableOpacity
                style={styles.shareActionBtn}
                onPress={handleShare}
                activeOpacity={0.8}
              >
                <Share2 size={16} color="#000000" />
                <Text style={styles.shareActionText}>
                  {language === 'id' ? 'Bagikan Story' : 'Share Story'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.closeActionBtn}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Text style={styles.closeActionText}>
                {language === 'id' ? 'Tutup' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (c: ThemeColors) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.72)',
      justifyContent: 'flex-end',
    },
    backdropTouch: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    modalSheet: {
      backgroundColor: c.cardSurface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingTop: 18,
      paddingHorizontal: 20,
      paddingBottom: Platform.OS === 'ios' ? 36 : 24,
      maxHeight: '90%',
      borderTopWidth: 1,
      borderTopColor: c.borderSubtle,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
        },
        android: {
          elevation: 12,
        },
      }),
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
      marginRight: 10,
    },
    workoutIconBox: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    workoutTitle: {
      fontFamily: AppFonts.extraBold,
      fontSize: 18,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.3,
    },
    workoutDateSubtitle: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: '500',
      marginTop: 2,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.surfaceHighlight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },

    // Metrics Strip
    metricsStrip: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    metricCard: {
      flex: 1,
      backgroundColor: c.surfaceHighlight,
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 6,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    metricIconBox: {
      width: 24,
      height: 24,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    metricValue: {
      fontFamily: AppFonts.extraBold,
      fontSize: 14,
      fontWeight: '800',
      color: c.textPrimary,
      textAlign: 'center',
    },
    metricLabel: {
      fontFamily: AppFonts.medium,
      fontSize: 11,
      color: c.textMuted,
      fontWeight: '500',
      marginTop: 1,
      textAlign: 'center',
    },

    // Section Header
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: c.borderSubtle,
      marginBottom: 12,
    },
    sectionTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
    },
    sectionTitle: {
      fontFamily: AppFonts.bold,
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
    },
    overloadBadge: {
      backgroundColor: c.surfaceHighlight,
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 6,
    },
    overloadBadgeText: {
      fontFamily: AppFonts.bold,
      fontSize: 11,
      color: c.textSecondary,
      fontWeight: '700',
    },

    // Scroll List
    scrollList: {
      paddingBottom: 16,
      gap: 12,
    },
    exerciseCard: {
      backgroundColor: c.surfaceHighlight,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    exerciseTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 10,
      gap: 8,
    },
    exerciseNameCol: {
      flex: 1,
    },
    exerciseNameText: {
      fontFamily: AppFonts.bold,
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
    },
    exerciseMetaText: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
    },
    maxWeightPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(168, 85, 247, 0.12)',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(168, 85, 247, 0.25)',
    },
    maxWeightPillText: {
      fontFamily: AppFonts.bold,
      fontSize: 11,
      fontWeight: '700',
      color: '#A855F7',
    },

    // Table
    tableHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: c.borderSubtle,
      marginBottom: 6,
    },
    tableColHeader: {
      fontFamily: AppFonts.bold,
      fontSize: 11,
      fontWeight: '700',
      color: c.textMuted,
      letterSpacing: 0.5,
    },
    setRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
    },
    setNumberPill: {
      width: 44,
      backgroundColor: c.cardSurface,
      paddingVertical: 3,
      paddingHorizontal: 6,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    setNumberText: {
      fontFamily: AppFonts.bold,
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
    },
    setRepsText: {
      fontFamily: AppFonts.bold,
      fontSize: 13,
      fontWeight: '700',
      color: c.textPrimary,
    },
    setWeightCol: {
      width: 90,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    weightBadge: {
      backgroundColor: c.cardSurface,
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: c.primaryAction,
    },
    weightBadgeText: {
      fontFamily: AppFonts.extraBold,
      fontSize: 12,
      fontWeight: '800',
      color: c.primaryAction,
    },
    bodyweightText: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      color: c.textMuted,
    },
    trendCol: {
      width: 75,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    trendPillUp: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: 'rgba(34, 197, 94, 0.15)',
      paddingVertical: 2,
      paddingHorizontal: 6,
      borderRadius: 6,
    },
    trendPillUpText: {
      fontFamily: AppFonts.bold,
      fontSize: 11,
      fontWeight: '700',
      color: '#22C55E',
    },
    trendPillDown: {
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      paddingVertical: 2,
      paddingHorizontal: 6,
      borderRadius: 6,
    },
    trendPillDownText: {
      fontFamily: AppFonts.bold,
      fontSize: 11,
      fontWeight: '700',
      color: '#EF4444',
    },
    trendPillReps: {
      backgroundColor: 'rgba(56, 189, 248, 0.15)',
      paddingVertical: 2,
      paddingHorizontal: 6,
      borderRadius: 6,
    },
    trendPillRepsText: {
      fontFamily: AppFonts.bold,
      fontSize: 10,
      fontWeight: '700',
      color: '#38BDF8',
    },
    trendPillNeutral: {
      paddingHorizontal: 6,
    },
    trendPillNeutralText: {
      fontFamily: AppFonts.medium,
      fontSize: 11,
      color: c.textMuted,
    },



    // Footer Actions
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.borderSubtle,
    },
    deleteActionBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.25)',
    },
    shareActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 44,
      borderRadius: 12,
      backgroundColor: c.primaryAction,
    },
    shareActionText: {
      fontFamily: AppFonts.bold,
      fontSize: 13,
      fontWeight: '700',
      color: '#000000',
    },
    closeActionBtn: {
      paddingHorizontal: 16,
      height: 44,
      borderRadius: 12,
      backgroundColor: c.surfaceHighlight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    closeActionText: {
      fontFamily: AppFonts.bold,
      fontSize: 13,
      fontWeight: '700',
      color: c.textPrimary,
    },
  });
