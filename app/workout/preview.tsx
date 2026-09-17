import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Edit3,
  Flame,
  Dumbbell,
  Layers,
  Clock,
  Timer,
  Repeat,
  Hourglass,
  Play,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useUserStore } from '@/store/useUserStore';
import { useAlertStore } from '@/store/useAlertStore';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { AppFonts } from '@/constants/theme';
import { formatDurationBadge } from '@/utils/time';

export default function PreviewWorkoutScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language } = useTranslation();
  const hapticsEnabled = useUserStore((state) => state.hapticsEnabled);
  const showAlert = useAlertStore((state) => state.showAlert);

  const templates = useWorkoutStore((state) => state.templates);
  const activeSession = useWorkoutStore((state) => state.activeSession);
  const startSession = useWorkoutStore((state) => state.startSession);
  const scheduleWorkout = useWorkoutStore((state) => state.scheduleWorkout);
  const template = templates.find((item) => item.id === id);

  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  if (!template) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.notFoundContainer}>
          <View style={styles.notFoundIconBox}>
            <Dumbbell size={40} color={colors.textSecondary} strokeWidth={1.5} />
          </View>
          <Text style={styles.notFoundText}>{t('template_not_found')}</Text>
          <TouchableOpacity
            style={styles.backButtonPrompt}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <ArrowLeft size={16} color={colors.textPrimary} strokeWidth={2.2} />
            <Text style={styles.backButtonPromptText}>{t('cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Statistics
  const totalExercises = template.exercises.length;
  const totalSets = template.exercises.reduce((acc, ex) => {
    const s = typeof ex.sets === 'number' ? ex.sets : parseInt(ex.sets as any, 10);
    return acc + (isNaN(s) ? 0 : s);
  }, 0);

  // Approximate duration: ~2.5 minutes per set (including lift + rest)
  const estimatedDurationMinutes = Math.max(10, Math.round(totalSets * 2.5));

  // Targeted muscle tags
  const inferMuscleGroups = (): string[] => {
    const allNames = (
      template.name +
      ' ' +
      (template.subtitle || '') +
      ' ' +
      template.exercises.map((e) => e.name).join(' ')
    ).toLowerCase();
    const tags: string[] = [];

    if (/chest|bench|push|pec|dada/.test(allNames)) tags.push(t('muscle_chest'));
    if (/back|pull|row|lat|punggung/.test(allNames)) tags.push(t('muscle_back'));
    if (/leg|squat|calf|quad|hamstring|kaki/.test(allNames)) tags.push(t('muscle_legs'));
    if (/shoulder|press|delt|lateral|bahu/.test(allNames)) tags.push(t('muscle_shoulders'));
    if (/arm|bicep|tricep|curl|lengan/.test(allNames)) tags.push(t('muscle_arms'));
    if (/core|abs|plank|crunch|perut/.test(allNames)) tags.push(t('muscle_core'));

    return tags.length > 0 ? tags : [t('muscle_full_body')];
  };

  const muscleTags = inferMuscleGroups();

  const handleEdit = () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    router.push(`/workout/create?id=${template.id}`);
  };

  const handleStartWorkout = () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    // If there's already an active session for this template, resume it
    if (activeSession && activeSession.templateId === template.id) {
      router.push('/workout/active');
      return;
    }

    // If there's an active session for a DIFFERENT template, ask the user
    if (activeSession) {
      showAlert(
        t('active_workout'),
        t('active_session_alert_msg'),
        [
          { text: t('cancel'), style: 'cancel' },
          {
            text: t('resume'),
            onPress: () => {
              router.push('/workout/active');
            },
          },
          {
            text: t('start_new'),
            style: 'destructive',
            onPress: () => {
              startSession(template.id);
              router.push('/workout/active');
            },
          },
        ]
      );
      return;
    }

    startSession(template.id);
    router.push('/workout/active');
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Modern Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerIconBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft color={colors.textPrimary} size={20} strokeWidth={2.2} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t('workout_preview')}</Text>

        <TouchableOpacity
          onPress={handleEdit}
          style={styles.headerIconBtn}
          activeOpacity={0.7}
        >
          <Edit3 color={colors.primaryAction} size={18} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      {/* Scrollable Blueprint Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card with Vibrant Accent Glow */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroBadgePill}>
              <View style={styles.heroDot} />
              <Text style={styles.heroBadgeText}>{t('workout').toUpperCase()}</Text>
            </View>
          </View>

          <Text style={styles.title}>{template.name}</Text>

          {/* Muscle Target Chips with Subtle Gradient Background */}
          <View style={styles.muscleTagsRow}>
            {muscleTags.map((tag, idx) => (
              <View key={idx} style={styles.muscleTagPill}>
                <Flame size={12} color="#F59E0B" strokeWidth={2.2} />
                <Text style={styles.muscleTagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 3 Floating Stat Cards (Elevated & Dynamic) */}
        <View style={styles.statsGrid}>
          {/* 1. Exercises Count */}
          <View style={styles.statCard}>
            <View style={[styles.statIconBadge, { backgroundColor: colors.actionIconBg }]}>
              <Dumbbell size={18} color={colors.primaryAction} strokeWidth={2.2} />
            </View>
            <Text style={styles.statValue}>{totalExercises}</Text>
            <Text style={styles.statCaption} numberOfLines={1}>
              {language === 'id' ? 'Total Gerakan' : t('exercises_count')}
            </Text>
          </View>

          {/* 2. Total Sets */}
          <View style={styles.statCard}>
            <View style={[styles.statIconBadge, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
              <Layers size={18} color="#22C55E" strokeWidth={2.2} />
            </View>
            <Text style={styles.statValue}>{totalSets}</Text>
            <Text style={styles.statCaption} numberOfLines={1}>{t('total_sets')}</Text>
          </View>

          {/* 3. Estimated Duration */}
          <View style={styles.statCard}>
            <View style={[styles.statIconBadge, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
              <Clock size={18} color="#F59E0B" strokeWidth={2.2} />
            </View>
            <Text style={styles.statValue}>{estimatedDurationMinutes} {t('min_short')}</Text>
            <Text style={styles.statCaption} numberOfLines={1}>
              {language === 'id' ? 'Estimasi Waktu' : t('estimated_duration')}
            </Text>
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <View style={styles.sectionIndicator} />
            <Text style={styles.sectionTitle}>{t('exercises')}</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {totalExercises} {t('exercises_count')}
            </Text>
          </View>
        </View>

        {/* Exercise Cards (Layered & Elegant) */}
        {template.exercises.map((exercise, index) => {
          const isTimeBased = exercise.type === 'time';
          const orderNum = (index + 1).toString().padStart(2, '0');

          return (
            <View key={exercise.id || index.toString()} style={styles.exerciseCard}>
              {/* Exercise Card Left Gradient Strip Accent */}
              <View
                style={[
                  styles.cardAccentBar,
                  { backgroundColor: isTimeBased ? colors.successBadge : colors.primaryAction },
                ]}
              />

              <View style={styles.exerciseCardBody}>
                {/* Top Row: Number Badge, Title, and Type */}
                <View style={styles.exerciseTopRow}>
                  <View
                    style={[
                      styles.orderBadge,
                      { backgroundColor: isTimeBased ? 'rgba(16, 185, 129, 0.12)' : colors.actionIconBg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.orderBadgeText,
                        { color: isTimeBased ? colors.successBadge : colors.primaryAction },
                      ]}
                    >
                      {orderNum}
                    </Text>
                  </View>

                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName} numberOfLines={2}>
                      {exercise.name || t('unnamed_exercise')}
                    </Text>
                    <View style={styles.typeBadgeRow}>
                      <View
                        style={[
                          styles.typePill,
                          isTimeBased ? styles.typePillTime : styles.typePillReps,
                        ]}
                      >
                        {isTimeBased ? (
                          <Timer size={12} color={colors.successBadge} strokeWidth={2.2} />
                        ) : (
                          <Repeat size={12} color={colors.primaryAction} strokeWidth={2.2} />
                        )}
                        <Text
                          style={[
                            styles.typePillText,
                            { color: isTimeBased ? colors.successBadge : colors.primaryAction },
                          ]}
                        >
                          {isTimeBased
                            ? (language === 'id' ? 'BERBASIS WAKTU' : 'TIME')
                            : (language === 'id' ? 'REPETISI' : 'REPS')}
                        </Text>
                      </View>

                      {/* Weight Mode Badges */}
                      {exercise.weightMode === 'weighted' && (
                        <View style={[styles.typePill, styles.typePillWeighted]}>
                          <Dumbbell size={12} color="#F59E0B" strokeWidth={2.2} />
                          <Text style={[styles.typePillText, { color: '#F59E0B' }]}>
                            {exercise.weight ? `${exercise.weight} ${t('weight_unit')}` : t('weighted')}
                          </Text>
                        </View>
                      )}

                      {exercise.weightMode === 'bodyweight' && (
                        <View style={[styles.typePill, styles.typePillBW]}>
                          <Text style={[styles.typePillText, { color: '#818CF8', fontWeight: '800' }]}>
                            {t('bodyweight_short')}
                          </Text>
                        </View>
                      )}

                      {/* Rest duration pill */}
                      <View style={[styles.typePill, styles.typePillRest]}>
                        <Clock size={11} color={colors.textSecondary} strokeWidth={2} />
                        <Text style={[styles.typePillText, { color: colors.textSecondary }]}>
                          {template.defaultRestTime || 60}{t('sec_short')} {t('rest_duration_label')}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Specs Metrics Container */}
                <View style={styles.metricsContainer}>
                  {/* Sets Metric */}
                  <View style={styles.metricItem}>
                    <View style={styles.metricIconWrap}>
                      <Repeat size={13} color={colors.textSecondary} strokeWidth={2} />
                    </View>
                    <View style={styles.metricTextBox}>
                      <Text style={styles.metricLabel}>{t('sets').toUpperCase()}</Text>
                      <Text style={styles.metricValue}>
                        {exercise.sets} <Text style={styles.metricUnit}>{t('set')}</Text>
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metricSeparator} />

                  {/* Reps or Duration Metric */}
                  <View style={styles.metricItem}>
                    <View style={styles.metricIconWrap}>
                      {isTimeBased ? (
                        <Hourglass size={13} color={colors.textSecondary} strokeWidth={2} />
                      ) : (
                        <Flame size={13} color={colors.textSecondary} strokeWidth={2} />
                      )}
                    </View>
                    <View style={styles.metricTextBox}>
                      <Text style={styles.metricLabel}>
                        {isTimeBased ? t('time_metric_label').toUpperCase() : t('target_metric_label').toUpperCase()}
                      </Text>
                      <Text style={styles.metricValue}>
                        {isTimeBased
                          ? formatDurationBadge(exercise.duration || 30, language)
                          : `${exercise.reps || 10}`}
                        {!isTimeBased && (
                          <Text style={styles.metricUnit}>
                            {` ${t('reps_label')}`}
                          </Text>
                        )}
                      </Text>
                    </View>
                  </View>

                  {/* Weight Metric (if weighted) */}
                  {exercise.weightMode === 'weighted' && !!exercise.weight && (
                    <>
                      <View style={styles.metricSeparator} />
                      <View style={styles.metricItem}>
                        <View style={styles.metricIconWrap}>
                          <Dumbbell size={13} color="#F59E0B" strokeWidth={2} />
                        </View>
                        <View style={styles.metricTextBox}>
                          <Text style={styles.metricLabel}>{t('weight_metric_label').toUpperCase()}</Text>
                          <Text style={styles.metricValue}>
                            {exercise.weight} <Text style={styles.metricUnit}>{t('weight_unit')}</Text>
                          </Text>
                        </View>
                      </View>
                    </>
                  )}
                </View>
              </View>
            </View>
          );
        })}

        {/* Bottom space for pleasant scrolling above the sticky CTA */}
        <View style={{ height: 72 }} />
      </ScrollView>

      {/* Sticky Bottom CTA Button */}
      <View style={styles.bottomBarDock}>
        <TouchableOpacity
          style={styles.startCtaBtn}
          onPress={handleStartWorkout}
          activeOpacity={0.85}
        >
          <Play size={16} color="#000000" fill="#000000" />
          <Text style={styles.startCtaBtnText}>{t('start_workout_cta')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (c: ThemeColors) => {
  const isDark = c.isDark;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 52 : 38,
      paddingBottom: 10,
      backgroundColor: c.background,
      borderBottomWidth: 1,
      borderBottomColor: c.borderSubtle,
    },
    headerTitle: {
      fontFamily: AppFonts.bold,
      fontSize: 16,
      color: c.textPrimary,
      letterSpacing: -0.3,
    },
    headerIconBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: c.cardSurface,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDark ? 0.3 : 0.06,
          shadowRadius: 4,
        },
        android: {
          elevation: 1,
        },
      }),
    },
    scrollContent: {
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 20,
    },

    // Hero Section
    heroCard: {
      backgroundColor: c.cardSurface,
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.05,
          shadowRadius: 6,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    heroHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    heroBadgePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.25)',
    },
    heroDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: '#F59E0B',
    },
    heroBadgeText: {
      fontFamily: AppFonts.bold,
      fontSize: 10,
      color: '#F59E0B',
      letterSpacing: 0.8,
    },
    title: {
      fontFamily: AppFonts.extraBold,
      fontSize: 18,
      color: c.textPrimary,
      letterSpacing: -0.4,
      marginBottom: 8,
    },
    muscleTagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 2,
    },
    muscleTagPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.surfaceHighlight,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    muscleTagText: {
      fontFamily: AppFonts.semiBold,
      fontSize: 11,
      color: c.textSecondary,
    },

    // Stats Grid
    statsGrid: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: c.cardSurface,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 6,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.borderSubtle,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDark ? 0.25 : 0.05,
          shadowRadius: 4,
        },
        android: {
          elevation: 1,
        },
      }),
    },
    statIconBadge: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    statValue: {
      fontFamily: AppFonts.extraBold,
      fontSize: 16,
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    statCaption: {
      fontFamily: AppFonts.medium,
      fontSize: 11,
      color: c.textSecondary,
      marginTop: 2,
      textAlign: 'center',
    },

    // Section Header
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
      marginTop: 2,
      paddingHorizontal: 2,
    },
    sectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    sectionIndicator: {
      width: 3,
      height: 14,
      borderRadius: 1.5,
      backgroundColor: '#F59E0B',
    },
    sectionTitle: {
      fontFamily: AppFonts.bold,
      fontSize: 15,
      color: c.textPrimary,
      letterSpacing: -0.2,
    },
    countBadge: {
      backgroundColor: c.surfaceHighlight,
      paddingVertical: 2,
      paddingHorizontal: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    countBadgeText: {
      fontFamily: AppFonts.semiBold,
      fontSize: 11,
      color: c.textSecondary,
    },

    // Exercise Cards
    exerciseCard: {
      position: 'relative',
      backgroundColor: c.cardSurface,
      borderRadius: 12,
      marginBottom: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.borderSubtle,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDark ? 0.25 : 0.05,
          shadowRadius: 4,
        },
        android: {
          elevation: 1,
        },
      }),
    },
    cardAccentBar: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 3,
    },
    exerciseCardBody: {
      padding: 10,
      paddingLeft: 12,
    },
    exerciseTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 8,
    },
    orderBadge: {
      width: 26,
      height: 26,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
    },
    orderBadgeText: {
      fontFamily: AppFonts.extraBold,
      fontSize: 12,
      fontVariant: ['tabular-nums'],
    },
    exerciseInfo: {
      flex: 1,
    },
    exerciseName: {
      fontFamily: AppFonts.bold,
      fontSize: 15,
      color: c.textPrimary,
      letterSpacing: -0.2,
      marginBottom: 3,
    },
    typeBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    typePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 2.5,
      paddingHorizontal: 7,
      borderRadius: 4,
    },
    typePillReps: {
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
    },
    typePillTime: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
    },
    typePillWeighted: {
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
    },
    typePillBW: {
      backgroundColor: 'rgba(99, 102, 241, 0.12)',
    },
    typePillRest: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
    },
    typePillText: {
      fontFamily: AppFonts.bold,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },

    // Metrics Row
    metricsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surfaceHighlight,
      borderRadius: 8,
      paddingVertical: 7,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    metricItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    metricTextBox: {
      flex: 1,
    },
    metricIconWrap: {
      width: 22,
      height: 22,
      borderRadius: 6,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    metricLabel: {
      fontFamily: AppFonts.semiBold,
      fontSize: 11,
      color: c.textSecondary,
      letterSpacing: 0.5,
    },
    metricValue: {
      fontFamily: AppFonts.extraBold,
      fontSize: 14,
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
      marginTop: 1,
    },
    metricUnit: {
      fontFamily: AppFonts.medium,
      fontSize: 11,
      color: c.textSecondary,
    },
    metricSeparator: {
      width: 1,
      height: 22,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
      marginHorizontal: 8,
    },

    // Not Found
    notFoundContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    notFoundIconBox: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: c.cardSurface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    notFoundText: {
      fontFamily: AppFonts.medium,
      fontSize: 14,
      color: c.textSecondary,
      marginBottom: 16,
    },
    backButtonPrompt: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 18,
      backgroundColor: c.cardSurface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    backButtonPromptText: {
      fontFamily: AppFonts.bold,
      fontSize: 13,
      color: c.textPrimary,
    },
    bottomBarDock: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: c.background,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: Platform.OS === 'ios' ? 28 : 14,
      borderTopWidth: 1,
      borderTopColor: c.borderSubtle,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: isDark ? 0.4 : 0.08,
          shadowRadius: 8,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    startCtaBtn: {
      backgroundColor: '#F59E0B',
      borderRadius: 12,
      height: 46,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      ...Platform.select({
        ios: {
          shadowColor: '#F59E0B',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.35,
          shadowRadius: 6,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    startCtaBtnText: {
      fontFamily: AppFonts.bold,
      fontSize: 14,
      color: '#000000',
      letterSpacing: 0.2,
    },
  });
};
