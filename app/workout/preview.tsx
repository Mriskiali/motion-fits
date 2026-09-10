import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
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
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useUserStore } from '@/store/useUserStore';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDurationBadge } from '@/utils/time';

export default function PreviewWorkoutScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language } = useTranslation();
  const { hapticsEnabled } = useUserStore();

  const templates = useWorkoutStore((state) => state.templates);
  const template = templates.find((item) => item.id === id);

  const colors = useThemeColors();
  const styles = getStyles(colors);

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
          {template.subtitle ? (
            <Text style={styles.subtitle}>{template.subtitle}</Text>
          ) : null}

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
            <View style={[styles.statIconBadge, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
              <Dumbbell size={18} color="#3B82F6" strokeWidth={2.2} />
            </View>
            <Text style={styles.statValue}>{totalExercises}</Text>
            <Text style={styles.statCaption}>{t('exercises_count')}</Text>
          </View>

          {/* 2. Total Sets */}
          <View style={styles.statCard}>
            <View style={[styles.statIconBadge, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
              <Layers size={18} color="#22C55E" strokeWidth={2.2} />
            </View>
            <Text style={styles.statValue}>{totalSets}</Text>
            <Text style={styles.statCaption}>{t('total_sets')}</Text>
          </View>

          {/* 3. Estimated Duration */}
          <View style={styles.statCard}>
            <View style={[styles.statIconBadge, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
              <Clock size={18} color="#F59E0B" strokeWidth={2.2} />
            </View>
            <Text style={styles.statValue}>{estimatedDurationMinutes} {t('min_short')}</Text>
            <Text style={styles.statCaption}>{t('estimated_duration')}</Text>
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
                  { backgroundColor: isTimeBased ? '#10B981' : '#3B82F6' },
                ]}
              />

              <View style={styles.exerciseCardBody}>
                {/* Top Row: Number Badge, Title, and Type */}
                <View style={styles.exerciseTopRow}>
                  <View
                    style={[
                      styles.orderBadge,
                      { backgroundColor: isTimeBased ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.orderBadgeText,
                        { color: isTimeBased ? '#10B981' : '#3B82F6' },
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
                          <Timer size={12} color="#10B981" strokeWidth={2.2} />
                        ) : (
                          <Repeat size={12} color="#3B82F6" strokeWidth={2.2} />
                        )}
                        <Text
                          style={[
                            styles.typePillText,
                            { color: isTimeBased ? '#10B981' : '#3B82F6' },
                          ]}
                        >
                          {isTimeBased ? t('duration') : t('reps_label')}
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
                      <Repeat size={14} color={colors.textSecondary} strokeWidth={2} />
                    </View>
                    <View>
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
                        <Hourglass size={14} color={colors.textSecondary} strokeWidth={2} />
                      ) : (
                        <Flame size={14} color={colors.textSecondary} strokeWidth={2} />
                      )}
                    </View>
                    <View>
                      <Text style={styles.metricLabel}>
                        {isTimeBased ? t('duration').toUpperCase() : t('target').toUpperCase()}
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
                </View>
              </View>
            </View>
          );
        })}

        {/* Bottom space for pleasant scrolling */}
        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const getStyles = (c: ThemeColors) => {
  const isDark = c.background === '#0B0C0E';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'ios' ? 56 : 44,
      paddingBottom: 16,
      backgroundColor: c.background,
      borderBottomWidth: 1,
      borderBottomColor: c.borderSubtle,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.3,
    },
    headerIconBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: c.cardSurface,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 6,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    scrollContent: {
      padding: 20,
    },

    // Hero Section
    heroCard: {
      backgroundColor: c.cardSurface,
      borderRadius: 24,
      padding: 20,
      marginBottom: 20,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.4 : 0.08,
          shadowRadius: 12,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    heroHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    heroBadgePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.08)',
      paddingVertical: 5,
      paddingHorizontal: 12,
      borderRadius: 999,
    },
    heroDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.primaryAction,
    },
    heroBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: c.primaryAction,
      letterSpacing: 1,
    },
    title: {
      fontSize: 28,
      fontWeight: '900',
      color: c.textPrimary,
      letterSpacing: -0.6,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 14,
      color: c.textSecondary,
      lineHeight: 20,
      marginBottom: 16,
    },
    muscleTagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    muscleTagPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: c.surfaceHighlight,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 12,
    },
    muscleTagText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textPrimary,
    },

    // Stats Grid
    statsGrid: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 26,
    },
    statCard: {
      flex: 1,
      backgroundColor: c.cardSurface,
      borderRadius: 20,
      paddingVertical: 16,
      paddingHorizontal: 10,
      alignItems: 'center',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: isDark ? 0.3 : 0.06,
          shadowRadius: 8,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    statIconBadge: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    statValue: {
      fontSize: 20,
      fontWeight: '900',
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    statCaption: {
      fontSize: 11,
      color: c.textSecondary,
      fontWeight: '600',
      marginTop: 2,
      textAlign: 'center',
    },

    // Section Header
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
      marginTop: 4,
      paddingHorizontal: 4,
    },
    sectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sectionIndicator: {
      width: 4,
      height: 18,
      borderRadius: 2,
      backgroundColor: c.primaryAction,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.3,
    },
    countBadge: {
      backgroundColor: c.surfaceHighlight,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 8,
    },
    countBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
    },

    // Exercise Cards
    exerciseCard: {
      position: 'relative',
      backgroundColor: c.cardSurface,
      borderRadius: 22,
      marginBottom: 14,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: isDark ? 0.35 : 0.07,
          shadowRadius: 10,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    cardAccentBar: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
    },
    exerciseCardBody: {
      padding: 16,
      paddingLeft: 18,
    },
    exerciseTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14,
    },
    orderBadge: {
      width: 38,
      height: 38,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    orderBadgeText: {
      fontSize: 14,
      fontWeight: '900',
      fontVariant: ['tabular-nums'],
    },
    exerciseInfo: {
      flex: 1,
    },
    exerciseName: {
      fontSize: 16,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.3,
      marginBottom: 4,
    },
    typeBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    typePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 2,
      paddingHorizontal: 8,
      borderRadius: 6,
    },
    typePillReps: {
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
    },
    typePillTime: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
    },
    typePillText: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },

    // Metrics Row
    metricsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surfaceHighlight,
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    metricItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    metricIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    metricLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: c.textSecondary,
      letterSpacing: 0.8,
    },
    metricValue: {
      fontSize: 15,
      fontWeight: '900',
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
      marginTop: 1,
    },
    metricUnit: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textSecondary,
    },
    metricSeparator: {
      width: 1,
      height: 28,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
      marginHorizontal: 12,
    },

    // Not Found
    notFoundContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    notFoundIconBox: {
      width: 72,
      height: 72,
      borderRadius: 24,
      backgroundColor: c.cardSurface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    notFoundText: {
      fontSize: 16,
      color: c.textSecondary,
      marginBottom: 24,
      fontWeight: '600',
    },
    backButtonPrompt: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
      backgroundColor: c.cardSurface,
      borderRadius: 14,
    },
    backButtonPromptText: {
      fontSize: 14,
      fontWeight: '700',
      color: c.textPrimary,
    },
  });
};
