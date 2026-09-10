import React, { useState, useEffect } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useWorkoutStore, WorkoutTemplate, Exercise } from '@/store/useWorkoutStore';
import { useAlertStore } from '@/store/useAlertStore';
import { useUserStore } from '@/store/useUserStore';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

export default function CreateWorkoutScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t, language } = useTranslation();
  const { hapticsEnabled } = useUserStore();

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
  const styles = getStyles(colors);

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
    if (targetType === 'time' && (!current.duration || current.duration <= 0)) {
      updated[index] = { ...current, type: targetType, duration: 30 };
    } else {
      updated[index] = { ...current, type: targetType };
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

      return {
        ...e,
        name: e.name.trim(),
        sets: parsedSets,
        ...(isTime ? { duration: parsedDuration } : { reps: parsedReps }),
      };
    });

    const template: WorkoutTemplate = {
      id: id || `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: name.trim(),
      subtitle: subtitle.trim(),
      icon: 'dumbbell',
      color: '#3B82F6',
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

      {/* Modern Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerIconBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" color={colors.textPrimary} size={20} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {id ? t('edit_workout') : t('create_workout')}
        </Text>

        <TouchableOpacity
          onPress={handleSave}
          style={styles.saveHeaderBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark" color="#FFFFFF" size={18} />
          <Text style={styles.saveHeaderBtnText}>{t('save')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Workout Details Card (Clean & Elevated) */}
        <View style={styles.routineCard}>
          <View style={styles.routineCardHeader}>
            <View style={styles.routineIconBox}>
              <Ionicons name="sparkles" size={18} color={colors.primaryAction} />
            </View>
            <View>
              <Text style={styles.routineCardTitle}>
                {t('workout_details')}
              </Text>
              <Text style={styles.routineCardSubtitle}>
                {t('manage_routines_subtitle')}
              </Text>
            </View>
          </View>

          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>{t('workout_name')}</Text>
            <TextInput
              style={styles.textInput}
              placeholder={t('workout_name_placeholder')}
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>{t('subtitle_optional')}</Text>
            <TextInput
              style={styles.textInput}
              placeholder={t('subtitle_placeholder')}
              placeholderTextColor={colors.textMuted}
              value={subtitle}
              onChangeText={setSubtitle}
            />
          </View>
        </View>

        {/* Exercises Section Header */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>{t('exercises')}</Text>
            <View style={styles.exerciseCounterBadge}>
              <Text style={styles.exerciseCounterText}>{exercises.length}</Text>
            </View>
          </View>
        </View>

        {/* Modular Exercise Cards */}
        {exercises.map((exercise, index) => {
          const isTimeBased = exercise.type === 'time';
          const orderNum = (index + 1).toString().padStart(2, '0');
          const currentSets =
            exercise.sets !== undefined && exercise.sets !== null && exercise.sets !== ('' as any)
              ? exercise.sets.toString()
              : '1';

          return (
            <View key={exercise.id} style={styles.exerciseCard}>
              {/* Card Left Color Accent */}
              <View
                style={[
                  styles.cardSideAccent,
                  { backgroundColor: isTimeBased ? '#10B981' : '#3B82F6' },
                ]}
              />

              <View style={styles.exerciseCardContent}>
                {/* Top Toolbar */}
                <View style={styles.cardToolbar}>
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
                      #{orderNum}
                    </Text>
                  </View>

                  {/* Actions Group */}
                  <View style={styles.actionsCluster}>
                    <TouchableOpacity
                      style={[styles.actionIconBtn, index === 0 && styles.actionIconBtnDisabled]}
                      onPress={() => handleMoveUp(index)}
                      disabled={index === 0}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="chevron-up"
                        size={16}
                        color={index === 0 ? colors.textMuted : colors.textPrimary}
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
                      <Ionicons
                        name="chevron-down"
                        size={16}
                        color={
                          index === exercises.length - 1
                            ? colors.textMuted
                            : colors.textPrimary
                        }
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionIconBtn, styles.duplicateBtn]}
                      onPress={() => handleDuplicateExercise(index)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="copy-outline" size={15} color={colors.primaryAction} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionIconBtn, styles.deleteBtn]}
                      onPress={() => handleRemoveExercise(index)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={15} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Exercise Name Input */}
                <View style={styles.exerciseInputWrap}>
                  <TextInput
                    style={styles.exerciseNameInput}
                    placeholder={t('exercise_name_placeholder')}
                    placeholderTextColor={colors.textMuted}
                    value={exercise.name}
                    onChangeText={(val) => handleUpdateExercise(index, 'name', val)}
                  />
                </View>

                {/* Type Toggle Segment (Reps vs Time) */}
                <View style={styles.typeSegment}>
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      !isTimeBased && styles.typeOptionActiveReps,
                    ]}
                    onPress={() => toggleExerciseType(index, 'reps')}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name="repeat-outline"
                      size={14}
                      color={!isTimeBased ? '#FFFFFF' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.typeOptionText,
                        !isTimeBased && styles.typeOptionTextActive,
                      ]}
                    >
                      {t('reps')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      isTimeBased && styles.typeOptionActiveTime,
                    ]}
                    onPress={() => toggleExerciseType(index, 'time')}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name="timer-outline"
                      size={14}
                      color={isTimeBased ? '#FFFFFF' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.typeOptionText,
                        isTimeBased && styles.typeOptionTextActive,
                      ]}
                    >
                      {t('duration')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Dual Input Controls (Sets Stepper & Target) */}
                <View style={styles.inputsGrid}>
                  {/* Sets Stepper Widget */}
                  <View style={styles.controlBox}>
                    <Text style={styles.controlBoxLabel}>{t('sets').toUpperCase()}</Text>
                    <View style={styles.stepperRow}>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => handleStepSets(index, -1)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="remove" size={16} color={colors.textPrimary} />
                      </TouchableOpacity>

                      <TextInput
                        style={styles.stepperNumberInput}
                        keyboardType="number-pad"
                        value={currentSets}
                        onChangeText={(val) =>
                          handleUpdateExercise(index, 'sets', val.replace(/[^0-9]/g, ''))
                        }
                        selectTextOnFocus
                      />

                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => handleStepSets(index, 1)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add" size={16} color={colors.textPrimary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Target Reps or Duration */}
                  <View style={styles.controlBox}>
                    <Text style={styles.controlBoxLabel}>
                      {isTimeBased ? t('duration').toUpperCase() : t('target').toUpperCase()}
                    </Text>
                    {isTimeBased ? (
                      <View style={styles.targetInputRow}>
                        <TextInput
                          style={styles.targetNumberInput}
                          keyboardType="number-pad"
                          placeholder="30"
                          placeholderTextColor={colors.textMuted}
                          value={getDurationDisplayVal(exercise)}
                          onChangeText={(val) => handleUpdateDurationVal(index, val)}
                        />
                        <TouchableOpacity
                          style={styles.unitCycleBtn}
                          onPress={() => handleCycleDurationUnit(index)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.unitCycleBtnText}>
                            {getDurationUnit(exercise) === 'hour'
                              ? t('hours_short')
                              : getDurationUnit(exercise) === 'min'
                              ? t('min_short')
                              : t('seconds_short')}
                          </Text>
                          <Ionicons name="swap-vertical" size={12} color={colors.primaryAction} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.targetInputRow}>
                        <TextInput
                          style={styles.targetNumberInput}
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
                        <Text style={styles.targetUnitText}>{t('reps_label')}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>
          );
        })}

        {/* Empty State */}
        {exercises.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="barbell-outline" size={36} color={colors.primaryAction} />
            </View>
            <Text style={styles.emptyTitle}>{t('no_exercises_yet')}</Text>
            <Text style={styles.emptySubtitle}>{t('tap_add_routine')}</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={handleAddExercise}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>{t('add_exercise')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Bottom Add Exercise Wide Action Button */
          <TouchableOpacity
            style={styles.addExerciseWideBtn}
            onPress={handleAddExercise}
            activeOpacity={0.88}
          >
            <View style={styles.addWidePlusIconWrap}>
              <Ionicons name="add" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.addExerciseWideText}>{t('add_exercise')}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: keyboardHeight > 0 ? keyboardHeight + 40 : 80 }} />
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
    saveHeaderBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: c.primaryAction,
      paddingVertical: 9,
      paddingHorizontal: 16,
      borderRadius: 14,
      ...Platform.select({
        ios: {
          shadowColor: c.primaryAction,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    saveHeaderBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    scrollContent: {
      padding: 20,
    },

    // Routine Info Card
    routineCard: {
      backgroundColor: c.cardSurface,
      borderRadius: 24,
      padding: 20,
      marginBottom: 24,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.35 : 0.07,
          shadowRadius: 12,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    routineCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 18,
    },
    routineIconBox: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    routineCardTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.3,
    },
    routineCardSubtitle: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
    },
    inputWrap: {
      marginBottom: 14,
    },
    inputLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: c.textSecondary,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    textInput: {
      backgroundColor: c.surfaceHighlight,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 13,
      color: c.textPrimary,
      fontSize: 15,
      fontWeight: '600',
    },

    // Section Header
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      paddingHorizontal: 2,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sectionDot: {
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
    exerciseCounterBadge: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.08)',
      paddingVertical: 2,
      paddingHorizontal: 8,
      borderRadius: 999,
    },
    exerciseCounterText: {
      fontSize: 12,
      fontWeight: '800',
      color: c.primaryAction,
    },

    // Exercise Cards
    exerciseCard: {
      position: 'relative',
      backgroundColor: c.cardSurface,
      borderRadius: 24,
      marginBottom: 16,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.4 : 0.07,
          shadowRadius: 12,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    cardSideAccent: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
    },
    exerciseCardContent: {
      padding: 16,
      paddingLeft: 18,
    },
    cardToolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    orderBadge: {
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 10,
    },
    orderBadgeText: {
      fontSize: 12,
      fontWeight: '900',
      fontVariant: ['tabular-nums'],
    },
    actionsCluster: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    actionIconBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: c.surfaceHighlight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionIconBtnDisabled: {
      opacity: 0.3,
    },
    duplicateBtn: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.08)',
    },
    deleteBtn: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    exerciseInputWrap: {
      marginBottom: 12,
    },
    exerciseNameInput: {
      backgroundColor: c.surfaceHighlight,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: c.textPrimary,
      fontSize: 15,
      fontWeight: '700',
    },

    // Type Segment
    typeSegment: {
      flexDirection: 'row',
      backgroundColor: c.surfaceHighlight,
      borderRadius: 14,
      padding: 3,
      marginBottom: 14,
    },
    typeOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 7,
      borderRadius: 11,
    },
    typeOptionActiveReps: {
      backgroundColor: c.primaryAction,
    },
    typeOptionActiveTime: {
      backgroundColor: '#10B981',
    },
    typeOptionText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
    },
    typeOptionTextActive: {
      color: '#FFFFFF',
    },

    // Inputs Grid
    inputsGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    controlBox: {
      flex: 1,
      backgroundColor: c.surfaceHighlight,
      borderRadius: 16,
      padding: 12,
    },
    controlBoxLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: c.textSecondary,
      letterSpacing: 0.6,
      marginBottom: 6,
      textAlign: 'center',
    },
    stepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    stepperBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperNumberInput: {
      fontSize: 18,
      fontWeight: '800',
      color: c.textPrimary,
      textAlign: 'center',
      minWidth: 36,
      paddingVertical: 0,
      includeFontPadding: false,
      fontVariant: ['tabular-nums'],
    },
    targetInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 38,
      gap: 4,
    },
    targetNumberInput: {
      fontSize: 17,
      fontWeight: '800',
      color: c.textPrimary,
      textAlign: 'center',
      paddingVertical: 0,
      includeFontPadding: false,
      minWidth: 50,
      fontVariant: ['tabular-nums'],
    },
    targetUnitText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
    },
    unitCycleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingVertical: 5,
      paddingHorizontal: 8,
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.16)' : 'rgba(59, 130, 246, 0.08)',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)',
    },
    unitCycleBtnText: {
      fontSize: 12,
      fontWeight: '800',
      color: c.primaryAction,
      textTransform: 'lowercase',
    },

    // Add Wide Button (Solid, crisp & elevated without Android semi-transparent shadow glitch)
    addExerciseWideBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: c.primaryAction,
      paddingVertical: 15,
      borderRadius: 18,
      marginTop: 10,
      ...Platform.select({
        ios: {
          shadowColor: c.primaryAction,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    addWidePlusIconWrap: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    addExerciseWideText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.2,
    },

    // Empty State
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
      paddingHorizontal: 20,
      backgroundColor: c.cardSurface,
      borderRadius: 24,
      marginTop: 8,
    },
    emptyIconBox: {
      width: 64,
      height: 64,
      borderRadius: 22,
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: c.textPrimary,
      marginBottom: 4,
    },
    emptySubtitle: {
      fontSize: 13,
      color: c.textSecondary,
      marginBottom: 20,
      textAlign: 'center',
    },
    emptyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.primaryAction,
      paddingVertical: 12,
      paddingHorizontal: 22,
      borderRadius: 16,
    },
    emptyButtonText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
    },
  });
};
