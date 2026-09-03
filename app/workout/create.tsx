import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Platform, Keyboard } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutStore, WorkoutTemplate, Exercise } from '@/store/useWorkoutStore';
import { useAlertStore } from '@/store/useAlertStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

export default function CreateWorkoutScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t } = useTranslation();
  
  const templates = useWorkoutStore((state) => state.templates);
  const addTemplate = useWorkoutStore((state) => state.addTemplate);
  const updateTemplate = useWorkoutStore((state) => state.updateTemplate);

  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const colors = useThemeColors();
  const styles = getStyles(colors);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (id) {
      const existing = templates.find(t => t.id === id);
      if (existing) {
        setName(existing.name);
        setSubtitle(existing.subtitle || '');
        setExercises(existing.exercises);
      }
    }
  }, [id, templates]);

  const handleAddExercise = () => {
    const newExercise: Exercise = {
      id: Date.now().toString(),
      name: '',
      type: 'reps',
      sets: 3,
      reps: '10',
      duration: 60, // default 60s for time based
    };
    setExercises([...exercises, newExercise]);
  };

  const handleUpdateExercise = (index: number, field: keyof Exercise, value: any) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  const handleRemoveExercise = (index: number) => {
    const updated = [...exercises];
    updated.splice(index, 1);
    setExercises(updated);
  };

  const toggleExerciseType = (index: number) => {
    const current = exercises[index].type || 'reps';
    handleUpdateExercise(index, 'type', current === 'reps' ? 'time' : 'reps');
  };

  const showAlert = useAlertStore(state => state.showAlert);

  const handleSave = () => {
    if (!name.trim()) {
      showAlert(t('error'), t('provide_name_error'));
      return;
    }

    if (exercises.length === 0) {
      showAlert(t('error'), t('add_exercise_error'));
      return;
    }

    const template: WorkoutTemplate = {
      id: id || Date.now().toString(),
      name,
      subtitle,
      icon: 'dumbbell',
      color: '#3b82f6',
      exercises,
      defaultRestTime: 90,
    };

    if (id) {
      updateTemplate(id, template);
    } else {
      addTemplate(template);
    }

    router.back();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: id ? t('edit_workout') : t('create_workout'),
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
              <Ionicons name="arrow-back" color={colors.text} size={24} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleSave}>
              <Ionicons name="save-outline" color={colors.primary} size={24} />
            </TouchableOpacity>
          ),
        }} 
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('workout_name')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('workout_name_placeholder')}
            placeholderTextColor="#475569"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('subtitle_optional')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('subtitle_placeholder')}
            placeholderTextColor="#475569"
            value={subtitle}
            onChangeText={setSubtitle}
          />
        </View>

        <View style={styles.exercisesHeader}>
          <Text style={styles.sectionTitle}>{t('exercises')}</Text>
          <TouchableOpacity onPress={handleAddExercise} style={styles.addExerciseButton}>
            <Ionicons name="add" color="#3b82f6" size={20} />
            <Text style={styles.addExerciseText}>{t('add')}</Text>
          </TouchableOpacity>
        </View>

        {exercises.map((exercise, index) => {
          const isTimeBased = exercise.type === 'time';

          return (
            <View key={exercise.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <TextInput
                  style={styles.exerciseNameInput}
                  placeholder={t('exercise_name_placeholder')}
                  placeholderTextColor="#475569"
                  value={exercise.name}
                  onChangeText={(val) => handleUpdateExercise(index, 'name', val)}
                />
                
                <TouchableOpacity onPress={() => toggleExerciseType(index)} style={styles.typeToggleButton}>
                  {isTimeBased ? <Ionicons name="time-outline" color="#10b981" size={20} /> : <Ionicons name="repeat-outline" color="#3b82f6" size={20} />}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handleRemoveExercise(index)} style={styles.deleteButton}>
                  <Ionicons name="trash-outline" color="#ef4444" size={20} />
                </TouchableOpacity>
              </View>

              <View style={styles.exerciseDetailsRow}>
                <View style={styles.detailInputGroup}>
                  <Text style={styles.detailLabel}>{isTimeBased ? t('intervals_sets') : t('sets')}</Text>
                  <TextInput
                    style={styles.detailInput}
                    keyboardType="numeric"
                    value={exercise.sets.toString()}
                    onChangeText={(val) => handleUpdateExercise(index, 'sets', parseInt(val) || 0)}
                  />
                </View>

                {isTimeBased ? (
                  <View style={styles.detailInputGroup}>
                    <Text style={styles.detailLabel}>{t('duration_sec')}</Text>
                    <TextInput
                      style={styles.detailInput}
                      keyboardType="numeric"
                      placeholder={t('duration_placeholder')}
                      placeholderTextColor="#475569"
                      value={exercise.duration?.toString() || '60'}
                      onChangeText={(val) => handleUpdateExercise(index, 'duration', parseInt(val) || 0)}
                    />
                  </View>
                ) : (
                  <View style={styles.detailInputGroup}>
                    <Text style={styles.detailLabel}>{t('reps')}</Text>
                    <TextInput
                      style={styles.detailInput}
                      placeholder={t('reps_placeholder')}
                      placeholderTextColor="#475569"
                      value={exercise.reps?.toString() || ''}
                      onChangeText={(val) => handleUpdateExercise(index, 'reps', val)}
                    />
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {exercises.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>{t('no_exercises_yet')}</Text>
            <Text style={styles.emptyStateSubtext}>{t('tap_add_routine')}</Text>
          </View>
        )}
        
        {/* Dummy view that expands when keyboard opens so you can scroll */}
        <View style={{ height: keyboardHeight > 0 ? keyboardHeight + 20 : 0 }} />
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exercisesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addExerciseText: {
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  exerciseCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseNameInput: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginRight: 8,
  },
  typeToggleButton: {
    padding: 8,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    borderRadius: 8,
    marginRight: 8,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
  },
  exerciseDetailsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailInputGroup: {
    flex: 1,
  },
  detailLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '500',
  },
  detailInput: {
    backgroundColor: colors.background,
    color: colors.text,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyStateText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
