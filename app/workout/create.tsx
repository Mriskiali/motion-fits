import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Keyboard,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  ChevronLeft,
  Check,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  Minus,
  Dumbbell,
  Timer,
  User,
  ArrowUpDown,
  Sparkles,
  Flame,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useWorkoutStore, WorkoutTemplate, Exercise } from '@/store/useWorkoutStore';
import { useAlertStore } from '@/store/useAlertStore';
import { useUserStore } from '@/store/useUserStore';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { AppFonts } from '@/constants/theme';

export default function CreateWorkoutScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t, language } = useTranslation();
  const hapticsEnabled = useUserStore((state) => state.hapticsEnabled);

  const templates = useWorkoutStore((state) => state.templates);
  const addTemplate = useWorkoutStore((state) => state.addTemplate);
  const updateTemplate = useWorkoutStore((state) => state.updateTemplate);

  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Map of exerciseId -> 'sec' | 'min' | 'hour'
  const [durationUnitsMap, setDurationUnitsMap] = useState<Record<string, 'sec' | 'min' | 'hour'>>({});

  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (id) {
      const existing = templates.find((item) => item.id === id);
      if (existing) {
        setName(existing.name);
        setSubtitle(existing.subtitle || '');
        setExercises(existing.exercises);
      }
    }
  }, [id, templates]);

  const handleAddExercise = () => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newExercise: Exercise = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: '',
      type: 'reps',
      weightMode: 'weighted',
      weight: '' as any,
      sets: 3 as any,
      reps: '10',
      duration: '' as any,
    };
    setExercises([...exercises, newExercise]);
  };

  const handleUpdateExercise = (index: number, field: keyof Exercise, value: any) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  const handleSetWeightMode = (index: number, mode: 'weighted' | 'bodyweight' | 'none') => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = [...exercises];
    updated[index] = { ...updated[index], weightMode: mode };
    setExercises(updated);
  };

  const handleSetTrackingMode = (index: number, mode: 'weighted' | 'bodyweight' | 'time') => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = [...exercises];
    if (mode === 'time') {
      updated[index] = {
        ...updated[index],
        type: 'time',
        weightMode: 'none',
        duration: updated[index].duration || 30,
      };
    } else if (mode === 'bodyweight') {
      updated[index] = {
        ...updated[index],
        type: 'reps',
        weightMode: 'bodyweight',
      };
    } else {
      updated[index] = {
        ...updated[index],
        type: 'reps',
        weightMode: 'weighted',
      };
    }
    setExercises(updated);
  };

  const handleRemoveExercise = (index: number) => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = [...exercises];
    updated.splice(index, 1);
    setExercises(updated);
  };

  const handleDuplicateExercise = (index: number) => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const source = exercises[index];
    const cloned: Exercise = {
      ...source,
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    const updated = [...exercises];
    updated.splice(index + 1, 0, cloned);
    setExercises(updated);
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = [...exercises];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setExercises(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index >= exercises.length - 1) return;
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = [...exercises];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setExercises(updated);
  };

  const handleStepSets = (index: number, delta: number) => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const current = typeof exercises[index].sets === 'number' ? exercises[index].sets : parseInt(exercises[index].sets as any, 10) || 1;
    const nextVal = Math.max(1, current + delta);
    handleUpdateExercise(index, 'sets', nextVal);
  };

  const toggleExerciseType = (index: number, targetType: 'reps' | 'time') => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = [...exercises];
    const current = updated[index];
    if (targetType === 'time') {
      const dur = !current.duration || current.duration <= 0 ? 30 : current.duration;
      updated[index] = {
        ...current,
        type: 'time',
        duration: dur,
        weightMode: current.weightMode || 'none',
      };
    } else {
      updated[index] = {
        ...current,
        type: targetType,
        weightMode: current.weightMode && current.weightMode !== 'none' ? current.weightMode : 'weighted',
      };
    }
    setExercises(updated);
  };

  const getDurationUnit = (ex: Exercise): 'sec' | 'min' | 'hour' => {
    if (durationUnitsMap[ex.id]) return durationUnitsMap[ex.id];
    const dur = typeof ex.duration === 'number' ? ex.duration : parseInt(ex.duration as any, 10) || 0;
    if (dur >= 3600 && dur % 3600 === 0) return 'hour';
    if (dur >= 60 && dur % 60 === 0) return 'min';
    return 'sec';
  };

  const getDurationDisplayVal = (ex: Exercise): string => {
    const dur = typeof ex.duration === 'number' ? ex.duration : parseInt(ex.duration as any, 10) || 0;
    if (dur <= 0) return '';
    const unit = getDurationUnit(ex);
    if (unit === 'hour') return Math.round(dur / 3600).toString();
    if (unit === 'min') return Math.round(dur / 60).toString();
    return dur.toString();
  };

  const handleUpdateDurationVal = (index: number, valStr: string) => {
    const clean = valStr.replace(/[^0-9]/g, '');
    const num = clean ? parseInt(clean, 10) : 0;
    const ex = exercises[index];
    const unit = getDurationUnit(ex);
    let totalSec = num;
    if (unit === 'min') totalSec = num * 60;
    else if (unit === 'hour') totalSec = num * 3600;

    handleUpdateExercise(index, 'duration', clean === '' ? ('' as any) : totalSec);
  };

  const handleCycleDurationUnit = (index: number) => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ex = exercises[index];
    const currentUnit = getDurationUnit(ex);
    const dur = typeof ex.duration === 'number' ? ex.duration : parseInt(ex.duration as any, 10) || 0;
    
    let currentInputVal = dur;
    if (currentUnit === 'min') currentInputVal = Math.round(dur / 60);
    else if (currentUnit === 'hour') currentInputVal = Math.round(dur / 3600);

    const nextUnit: 'sec' | 'min' | 'hour' =
      currentUnit === 'sec' ? 'min' : currentUnit === 'min' ? 'hour' : 'sec';

    let nextTotalSec = currentInputVal;
    if (nextUnit === 'min') nextTotalSec = currentInputVal * 60;
    else if (nextUnit === 'hour') nextTotalSec = currentInputVal * 3600;

    setDurationUnitsMap((prev) => ({ ...prev, [ex.id]: nextUnit }));
    handleUpdateExercise(index, 'duration', nextTotalSec);
  };

  const showAlert = useAlertStore((state) => state.showAlert);

  const handleSave = () => {
    if (!name.trim()) {
      showAlert(t('error'), t('provide_name_error'));
      return;
    }

    if (exercises.length === 0) {
      showAlert(t('error'), t('add_exercise_error'));
      return;
    }

    const hasEmptyName = exercises.some((e) => !e.name || !e.name.trim());
    if (hasEmptyName) {
      showAlert(t('error'), t('exercise_name_empty_error'));
      return;
    }

    const hasInvalidSets = exercises.some((e) => {
      const setsNum = typeof e.sets === 'number' ? e.sets : parseInt(e.sets as any, 10);
      return isNaN(setsNum) || setsNum <= 0;
    });
    if (hasInvalidSets) {
      showAlert(t('error'), t('exercise_sets_empty_error'));
      return;
    }

    const hasInvalidRepsOrDuration = exercises.some((e) => {
      if (e.type === 'time') {
        const durNum = typeof e.duration === 'number' ? e.duration : parseInt(e.duration as any, 10);
        return isNaN(durNum) || durNum <= 0;
      } else {
        return !e.reps || !e.reps.toString().trim();
      }
    });
    if (hasInvalidRepsOrDuration) {
      showAlert(t('error'), t('exercise_reps_duration_empty_error'));
      return;
    }

    const processedExercises: Exercise[] = exercises.map((e) => {
      const isTime = e.type === 'time';
      const parsedSets = typeof e.sets === 'number' ? e.sets : parseInt(e.sets as any, 10);
      const parsedDuration = isTime
        ? (typeof e.duration === 'number' ? e.duration : parseInt(e.duration as any, 10))
        : undefined;
      const parsedReps = !isTime ? (e.reps ? e.reps.toString().trim() : '') : undefined;
      const mode = e.weightMode || (isTime ? 'none' : 'weighted');
      const parsedWeight =
        mode === 'weighted' && e.weight !== undefined && String(e.weight).trim() !== '' && !isNaN(Number(e.weight))
          ? Number(e.weight)
          : undefined;

      return {
        ...e,
        name: e.name.trim(),
        weightMode: mode,
        weight: parsedWeight,
        sets: parsedSets,
        ...(isTime ? { duration: parsedDuration } : { reps: parsedReps }),
      };
    });

    const template: WorkoutTemplate = {
      id: id || `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: name.trim(),
      subtitle: subtitle.trim(),
      icon: 'dumbbell',
      color: colors.primaryAction,
      exercises: processedExercises,
      defaultRestTime: 90,
    };

    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (id) {
      updateTemplate(id, template);
    } else {
      addTemplate(template);
    }

    router.back();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top Navigation Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBackBtn}
          activeOpacity={0.7}
        >
          <ChevronLeft color={colors.textPrimary} size={22} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {id ? t('edit_workout') : t('create_workout')}
        </Text>

        <TouchableOpacity
          onPress={handleSave}
          style={styles.saveHeaderBtn}
          activeOpacity={0.8}
        >
          <Check color="#000000" size={16} strokeWidth={2.5} />
          <Text style={styles.saveHeaderBtnText}>{t('save')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Routine Name & Muscle Focus Form Card */}
        <View style={styles.metadataCard}>
          <View style={styles.formFieldGroup}>
            <View style={styles.fieldLabelRow}>
              <Dumbbell size={13} color={colors.primaryAction} />
              <Text style={styles.fieldLabel}>{t('workout_name') || 'NAMA RUTINITAS'}</Text>
            </View>
            <View style={styles.fieldInputContainer}>
              <TextInput
                style={styles.fieldTextInput}
                placeholder={t('workout_name_placeholder') || 'cth. Chest & Triceps Push'}
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                selectionColor={colors.primaryAction}
              />
            </View>
          </View>

          <View style={[styles.formFieldGroup, { marginTop: 12 }]}>
            <View style={styles.fieldLabelRow}>
              <Flame size={13} color="#F59E0B" />
              <Text style={styles.fieldLabel}>{t('target_muscles') || 'FOKUS OTOT'}</Text>
            </View>
            <View style={styles.fieldInputContainer}>
              <TextInput
                style={styles.fieldTextInput}
                placeholder={t('subtitle_placeholder') || 'cth. Fokus Dada, Punggung, Bahu'}
                placeholderTextColor={colors.textMuted}
                value={subtitle}
                onChangeText={setSubtitle}
                selectionColor={colors.primaryAction}
              />
            </View>
          </View>
        </View>

        <View style={styles.sectionDivider} />

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderTitle}>{t('exercises').toUpperCase()}</Text>
          <View style={styles.exerciseCounterBadge}>
            <Text style={styles.exerciseCounterText}>{exercises.length}</Text>
          </View>
        </View>

        {/* Exercise Items (Modular Builder Card) */}
        {exercises.map((exercise, index) => {
          const isTimeBased = exercise.type === 'time';
          const weightMode = exercise.weightMode || (isTimeBased ? 'none' : 'weighted');
          const trackingMode: 'weighted' | 'bodyweight' | 'time' = isTimeBased
            ? 'time'
            : weightMode === 'bodyweight'
            ? 'bodyweight'
            : 'weighted';
          const orderNum = (index + 1).toString().padStart(2, '0');
          const currentSets =
            exercise.sets !== undefined && exercise.sets !== null && exercise.sets !== ('' as any)
              ? exercise.sets.toString()
              : '1';

          return (
            <View key={exercise.id} style={styles.exerciseCard}>
              {/* Header Row: Order badge, Name input, Actions */}
              <View style={styles.cardHeaderRow}>
                <View style={styles.orderBadge}>
                  <Text style={styles.orderBadgeText}>#{orderNum}</Text>
                </View>

                <View style={styles.exerciseNameInputWrapper}>
                  <TextInput
                    style={styles.exerciseNameInput}
                    placeholder={t('exercise_name_placeholder')}
                    placeholderTextColor={colors.textMuted}
                    value={exercise.name}
                    onChangeText={(val) => handleUpdateExercise(index, 'name', val)}
                    selectionColor={colors.primaryAction}
                  />
                </View>

                <View style={styles.actionsCluster}>
                  <TouchableOpacity
                    style={[styles.actionIconBtn, index === 0 && styles.actionIconBtnDisabled]}
                    onPress={() => handleMoveUp(index)}
                    disabled={index === 0}
                    activeOpacity={0.7}
                  >
                    <ChevronUp
                      size={15}
                      color={index === 0 ? colors.textMuted : colors.textSecondary}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionIconBtn,
                      index === exercises.length - 1 && styles.actionIconBtnDisabled,
                    ]}
                    onPress={() => handleMoveDown(index)}
                    disabled={index === exercises.length - 1}
                    activeOpacity={0.7}
                  >
                    <ChevronDown
                      size={15}
                      color={
                        index === exercises.length - 1
                          ? colors.textMuted
                          : colors.textSecondary
                      }
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionIconBtn}
                    onPress={() => handleDuplicateExercise(index)}
                    activeOpacity={0.7}
                  >
                    <Copy size={14} color={colors.textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionIconBtn, styles.deleteBtn]}
                    onPress={() => handleRemoveExercise(index)}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={14} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* 3-Way Tracking Segmented Switch [ Reps & Weight | Bodyweight | Duration / Time ] */}
              <View style={styles.segmentedContainer}>
                <TouchableOpacity
                  style={[
                    styles.segmentTab,
                    trackingMode === 'weighted' && styles.segmentTabActive,
                  ]}
                  onPress={() => handleSetTrackingMode(index, 'weighted')}
                  activeOpacity={0.75}
                >
                  <Dumbbell
                    size={13}
                    color={trackingMode === 'weighted' ? colors.primaryAction : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.segmentTabText,
                      trackingMode === 'weighted' && styles.segmentTabTextActive,
                    ]}
                  >
                    {t('weighted')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentTab,
                    trackingMode === 'bodyweight' && styles.segmentTabActive,
                  ]}
                  onPress={() => handleSetTrackingMode(index, 'bodyweight')}
                  activeOpacity={0.75}
                >
                  <User
                    size={13}
                    color={trackingMode === 'bodyweight' ? colors.primaryAction : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.segmentTabText,
                      trackingMode === 'bodyweight' && styles.segmentTabTextActive,
                    ]}
                  >
                    {t('bodyweight')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentTab,
                    trackingMode === 'time' && styles.segmentTabActive,
                  ]}
                  onPress={() => handleSetTrackingMode(index, 'time')}
                  activeOpacity={0.75}
                >
                  <Timer
                    size={13}
                    color={trackingMode === 'time' ? colors.primaryAction : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.segmentTabText,
                      trackingMode === 'time' && styles.segmentTabTextActive,
                    ]}
                  >
                    {t('duration')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Target Configuration Steppers */}
              <View style={styles.inputsRow}>
                {/* Sets Stepper */}
                <View style={styles.controlBox}>
                  <Text style={styles.controlLabel}>{t('sets').toUpperCase()}</Text>
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      style={styles.stepperButton}
                      onPress={() => handleStepSets(index, -1)}
                      activeOpacity={0.7}
                    >
                      <Minus size={14} color={colors.textPrimary} />
                    </TouchableOpacity>

                    <TextInput
                      style={styles.stepperInput}
                      keyboardType="number-pad"
                      value={currentSets}
                      onChangeText={(val) =>
                        handleUpdateExercise(index, 'sets', val.replace(/[^0-9]/g, ''))
                      }
                      selectTextOnFocus
                    />

                    <TouchableOpacity
                      style={styles.stepperButton}
                      onPress={() => handleStepSets(index, 1)}
                      activeOpacity={0.7}
                    >
                      <Plus size={14} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Target Weight (if weighted) */}
                {trackingMode === 'weighted' && (
                  <View style={styles.controlBox}>
                    <Text style={styles.controlLabel}>{t('weight_target').toUpperCase()}</Text>
                    <View style={styles.metricInputContainer}>
                      <TextInput
                        style={styles.metricInput}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        value={
                          exercise.weight !== undefined && exercise.weight !== null
                            ? String(exercise.weight)
                            : ''
                        }
                        onChangeText={(val) => {
                          const clean = val.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
                          handleUpdateExercise(index, 'weight', clean);
                        }}
                      />
                      <Text style={styles.metricUnitText}>{t('weight_unit')}</Text>
                    </View>
                  </View>
                )}

                {/* Target Reps (if weighted or bodyweight) */}
                {trackingMode !== 'time' && (
                  <View style={styles.controlBox}>
                    <Text style={styles.controlLabel}>{t('target').toUpperCase()}</Text>
                    <View style={styles.metricInputContainer}>
                      <TextInput
                        style={styles.metricInput}
                        keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                        placeholder={t('reps_placeholder')}
                        placeholderTextColor={colors.textMuted}
                        value={exercise.reps ? exercise.reps.toString() : ''}
                        onChangeText={(val) =>
                          handleUpdateExercise(
                            index,
                            'reps',
                            val.replace(/[^0-9-]/g, '').replace(/-{2,}/g, '-')
                          )
                        }
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <Text style={styles.metricUnitText}>{t('reps_label')}</Text>
                    </View>
                  </View>
                )}

                {/* Target Duration (if time) */}
                {trackingMode === 'time' && (
                  <View style={styles.controlBox}>
                    <Text style={styles.controlLabel}>{t('duration').toUpperCase()}</Text>
                    <View style={styles.metricInputContainer}>
                      <TextInput
                        style={styles.metricInput}
                        keyboardType="number-pad"
                        placeholder="30"
                        placeholderTextColor={colors.textMuted}
                        value={getDurationDisplayVal(exercise)}
                        onChangeText={(val) => handleUpdateDurationVal(index, val)}
                      />
                      <TouchableOpacity
                        style={styles.durationUnitToggle}
                        onPress={() => handleCycleDurationUnit(index)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.durationUnitText}>
                          {getDurationUnit(exercise) === 'hour'
                            ? t('hours_short')
                            : getDurationUnit(exercise) === 'min'
                            ? t('min_short')
                            : t('seconds_short')}
                        </Text>
                        <ArrowUpDown size={10} color={colors.primaryAction} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {/* Empty State vs Add Button */}
        {exercises.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Dumbbell size={32} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>{t('no_exercises_yet')}</Text>
            <Text style={styles.emptySubtitle}>{t('tap_add_routine')}</Text>
            <TouchableOpacity
              style={styles.addExerciseDashedBtn}
              onPress={handleAddExercise}
              activeOpacity={0.8}
            >
              <Plus size={16} color={colors.primaryAction} />
              <Text style={styles.addExerciseDashedText}>{t('add_exercise')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addExerciseDashedBtn}
            onPress={handleAddExercise}
            activeOpacity={0.8}
          >
            <Plus size={16} color={colors.primaryAction} />
            <Text style={styles.addExerciseDashedText}>{t('add_exercise')}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: keyboardHeight > 0 ? keyboardHeight + 40 : 80 }} />
      </ScrollView>
    </View>
  );
}

const getStyles = (c: ThemeColors) => {
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
      paddingTop: Platform.OS === 'ios' ? 56 : 44,
      paddingBottom: 12,
      backgroundColor: c.background,
      borderBottomWidth: 1,
      borderBottomColor: c.borderSubtle,
    },
    headerBackBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: c.cardSurface,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontFamily: AppFonts.bold,
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
      letterSpacing: -0.2,
    },
    saveHeaderBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.primaryAction,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 9999,
    },
    saveHeaderBtnText: {
      fontFamily: AppFonts.bold,
      fontSize: 13,
      fontWeight: '800',
      color: '#000000',
    },
    scrollContent: {
      padding: 16,
    },
    metadataCard: {
      backgroundColor: c.cardSurface,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      marginBottom: 16,
    },
    formFieldGroup: {},
    fieldLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    fieldLabel: {
      fontFamily: AppFonts.bold,
      fontSize: 12,
      fontWeight: '800',
      color: c.textSecondary,
      letterSpacing: 0.5,
    },
    fieldInputContainer: {
      backgroundColor: c.elevatedSurface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      paddingHorizontal: 12,
      height: 42,
      justifyContent: 'center',
    },
    fieldTextInput: {
      fontSize: 14,
      fontFamily: AppFonts.semiBold,
      fontWeight: '600',
      color: c.textPrimary,
      padding: 0,
    },
    sectionDivider: {
      height: 1,
      backgroundColor: c.borderSubtle,
      marginVertical: 14,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    sectionHeaderTitle: {
      fontFamily: AppFonts.bold,
      fontSize: 12,
      fontWeight: '800',
      color: c.textSecondary,
      letterSpacing: 0.8,
    },
    exerciseCounterBadge: {
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    exerciseCounterText: {
      fontFamily: AppFonts.extraBold,
      fontSize: 11,
      fontWeight: '800',
      color: c.primaryAction,
      fontVariant: ['tabular-nums'],
    },
    exerciseCard: {
      backgroundColor: c.cardSurface,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      borderRadius: 16,
      padding: 14,
      marginBottom: 14,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    orderBadge: {
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 6,
    },
    orderBadgeText: {
      fontFamily: AppFonts.extraBold,
      fontSize: 11,
      fontWeight: '800',
      color: c.primaryAction,
      fontVariant: ['tabular-nums'],
    },
    exerciseNameInputWrapper: {
      flex: 1,
      backgroundColor: c.elevatedSurface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      paddingHorizontal: 10,
      height: 38,
      justifyContent: 'center',
    },
    exerciseNameInput: {
      fontSize: 14,
      fontFamily: AppFonts.bold,
      fontWeight: '700',
      color: c.textPrimary,
      padding: 0,
    },
    actionsCluster: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    actionIconBtn: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: c.elevatedSurface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    actionIconBtnDisabled: {
      opacity: 0.3,
    },
    deleteBtn: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    segmentedContainer: {
      flexDirection: 'row',
      backgroundColor: c.elevatedSurface,
      borderRadius: 10,
      padding: 3,
      gap: 4,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    segmentTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 6,
      borderRadius: 8,
    },
    segmentTabActive: {
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    segmentTabText: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      fontWeight: '600',
      color: c.textMuted,
    },
    segmentTabTextActive: {
      fontFamily: AppFonts.bold,
      color: c.primaryAction,
      fontWeight: '700',
    },
    inputsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    controlBox: {
      flex: 1,
      backgroundColor: c.elevatedSurface,
      borderRadius: 12,
      padding: 8,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      alignItems: 'center',
    },
    controlLabel: {
      fontSize: 11,
      fontFamily: AppFonts.bold,
      fontWeight: '800',
      color: c.textMuted,
      letterSpacing: 0.5,
      marginBottom: 6,
      textAlign: 'center',
    },
    stepperContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      backgroundColor: c.cardSurface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      padding: 3,
      height: 38,
    },
    stepperButton: {
      width: 28,
      height: 28,
      borderRadius: 6,
      backgroundColor: c.surfaceHighlight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperInput: {
      fontSize: 15,
      fontFamily: AppFonts.extraBold,
      fontWeight: '800',
      color: c.textPrimary,
      textAlign: 'center',
      minWidth: 26,
      fontVariant: ['tabular-nums'],
      padding: 0,
    },
    metricInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      backgroundColor: c.cardSurface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      paddingHorizontal: 4,
      height: 38,
      gap: 4,
    },
    metricInput: {
      flex: 1,
      fontSize: 15,
      fontFamily: AppFonts.extraBold,
      fontWeight: '800',
      color: c.textPrimary,
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
      padding: 0,
    },
    metricUnitText: {
      fontSize: 12,
      fontFamily: AppFonts.bold,
      fontWeight: '700',
      color: c.textMuted,
    },
    durationUnitToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: 6,
      paddingVertical: 3,
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      borderRadius: 6,
    },
    durationUnitText: {
      fontSize: 10,
      fontFamily: AppFonts.bold,
      fontWeight: '800',
      color: c.primaryAction,
      textTransform: 'lowercase',
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 36,
      paddingHorizontal: 20,
      backgroundColor: c.cardSurface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      borderStyle: 'dashed',
      gap: 8,
      marginTop: 8,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
      marginTop: 4,
    },
    emptySubtitle: {
      fontSize: 12,
      color: c.textMuted,
      textAlign: 'center',
      marginBottom: 8,
    },
    addExerciseDashedBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: 'rgba(245, 158, 11, 0.35)',
      backgroundColor: 'rgba(245, 158, 11, 0.05)',
      borderRadius: 14,
      paddingVertical: 14,
      marginTop: 4,
    },
    addExerciseDashedText: {
      fontSize: 13,
      fontWeight: '700',
      color: c.primaryAction,
    },
  });
};
