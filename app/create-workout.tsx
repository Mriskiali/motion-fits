
import React, { useState } from "react";
import { 
  StyleSheet, 
  View, 
  Text, 
  Platform, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  Alert
} from "react-native";
import { Stack, router } from "expo-router";
import { IconSymbol } from "@/components/IconSymbol";
import { colors } from "@/styles/commonStyles";
import * as Haptics from "expo-haptics";
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Exercise {
  id: string;
  name: string;
  sets: string;
  reps?: string;
  duration?: string;
  notes?: string;
}

interface WorkoutPlan {
  id: string;
  name: string;
  subtitle: string;
  exercises: Exercise[];
  icon: string;
  color: string;
  isCustom: boolean;
}

const WORKOUT_COLORS = [
  { name: 'Blue', value: '#64b5f6' },
  { name: 'Green', value: '#aed581' },
  { name: 'Orange', value: '#ffb74d' },
  { name: 'Purple', value: '#ba68c8' },
  { name: 'Red', value: '#ef5350' },
  { name: 'Teal', value: '#4db6ac' },
  { name: 'Pink', value: '#f06292' },
  { name: 'Indigo', value: '#7986cb' },
];

const WORKOUT_ICONS = [
  'figure.strengthtraining.traditional',
  'figure.strengthtraining.functional',
  'figure.core.training',
  'figure.run',
  'figure.walk',
  'figure.yoga',
  'figure.flexibility',
  'figure.cooldown',
];

export default function CreateWorkoutScreen() {
  const [workoutName, setWorkoutName] = useState('');
  const [workoutSubtitle, setWorkoutSubtitle] = useState('');
  const [selectedColor, setSelectedColor] = useState(WORKOUT_COLORS[0].value);
  const [selectedIcon, setSelectedIcon] = useState(WORKOUT_ICONS[0]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  
  // Exercise form fields
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseSets, setExerciseSets] = useState('');
  const [exerciseReps, setExerciseReps] = useState('');
  const [exerciseDuration, setExerciseDuration] = useState('');
  const [exerciseType, setExerciseType] = useState<'reps' | 'duration'>('reps');
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);

  const handleAddExercise = () => {
    if (!exerciseName.trim() || !exerciseSets.trim()) {
      Alert.alert('Missing Information', 'Please enter exercise name and sets.');
      return;
    }

    if (exerciseType === 'reps' && !exerciseReps.trim()) {
      Alert.alert('Missing Information', 'Please enter reps for this exercise.');
      return;
    }

    if (exerciseType === 'duration' && !exerciseDuration.trim()) {
      Alert.alert('Missing Information', 'Please enter duration for this exercise.');
      return;
    }

    const newExercise: Exercise = {
      id: editingExerciseId || `ex-${Date.now()}`,
      name: exerciseName.trim(),
      sets: exerciseSets.trim(),
      reps: exerciseType === 'reps' ? exerciseReps.trim() : undefined,
      duration: exerciseType === 'duration' ? exerciseDuration.trim() : undefined,
    };

    if (editingExerciseId) {
      setExercises(exercises.map(ex => ex.id === editingExerciseId ? newExercise : ex));
      } else {
      setExercises([...exercises, newExercise]);
      }

    resetExerciseForm();
    setShowExerciseForm(false);

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleEditExercise = (exercise: Exercise) => {
    setExerciseName(exercise.name);
    setExerciseSets(exercise.sets);
    setExerciseReps(exercise.reps || '');
    setExerciseDuration(exercise.duration || '');
    setExerciseType(exercise.reps ? 'reps' : 'duration');
    setEditingExerciseId(exercise.id);
    setShowExerciseForm(true);
  };

  const handleDeleteExercise = (exerciseId: string) => {
    setExercises(exercises.filter(ex => ex.id !== exerciseId));
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const resetExerciseForm = () => {
    setExerciseName('');
    setExerciseSets('');
    setExerciseReps('');
    setExerciseDuration('');
    setExerciseType('reps');
    setEditingExerciseId(null);
  };

  const handleSaveWorkout = async () => {
    if (!workoutName.trim()) {
      Alert.alert('Missing Information', 'Please enter a workout name.');
      return;
    }

    if (!workoutSubtitle.trim()) {
      Alert.alert('Missing Information', 'Please enter a workout description.');
      return;
    }

    if (exercises.length === 0) {
      Alert.alert('No Exercises', 'Please add at least one exercise to your workout.');
      return;
    }

    const newWorkout: WorkoutPlan = {
      id: `custom-${Date.now()}`,
      name: workoutName.trim(),
      subtitle: workoutSubtitle.trim(),
      exercises: exercises,
      icon: selectedIcon,
      color: selectedColor,
      isCustom: true,
    };

    try {
      const existingPlansData = await AsyncStorage.getItem('customWorkoutPlans');
      const existingPlans = existingPlansData ? JSON.parse(existingPlansData) : [];
      const updatedPlans = [...existingPlans, newWorkout];
      await AsyncStorage.setItem('customWorkoutPlans', JSON.stringify(updatedPlans));
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert(
        'Success!',
        'Your custom workout has been created.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save workout. Please try again.');
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Create Workout",
          headerBackTitle: "Back",
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Create Custom Workout</Text>
            <Text style={styles.subtitle}>Design your own workout plan</Text>
          </View>

          {/* Workout Name */}
          <View style={styles.section}>
            <Text style={styles.label}>Workout Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Full Body Workout"
              placeholderTextColor={colors.textSecondary}
              value={workoutName}
              onChangeText={setWorkoutName}
            />
          </View>

          {/* Workout Description */}
          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Chest, Back, Legs"
              placeholderTextColor={colors.textSecondary}
              value={workoutSubtitle}
              onChangeText={setWorkoutSubtitle}
            />
          </View>

          {/* Color Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Color Theme</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.colorScrollContent}
            >
              {WORKOUT_COLORS.map((color) => (
                <TouchableOpacity
                  key={color.value}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color.value },
                    selectedColor === color.value && styles.colorOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedColor(color.value);
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                >
                  {selectedColor === color.value && (
                    <IconSymbol name="checkmark" size={20} color={colors.card} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Icon Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Icon</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.iconScrollContent}
            >
              {WORKOUT_ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconOption,
                    selectedIcon === icon && styles.iconOptionSelected,
                    { borderColor: selectedColor },
                  ]}
                  onPress={() => {
                    setSelectedIcon(icon);
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                >
                  <IconSymbol 
                    name={icon as any} 
                    size={28} 
                    color={selectedIcon === icon ? selectedColor : colors.textSecondary} 
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Exercises List */}
          <View style={styles.section}>
            <View style={styles.exercisesHeader}>
              <Text style={styles.label}>Exercises ({exercises.length})</Text>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: selectedColor }]}
                onPress={() => {
                  resetExerciseForm();
                  setShowExerciseForm(true);
                }}
              >
                <IconSymbol name="plus" size={20} color={colors.card} />
                <Text style={styles.addButtonText}>Add Exercise</Text>
              </TouchableOpacity>
            </View>

            {exercises.length === 0 ? (
              <View style={styles.emptyExercises}>
                <IconSymbol name="figure.walk" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyExercisesText}>No exercises yet</Text>
                <Text style={styles.emptyExercisesSubtext}>Tap &quot;Add Exercise&quot; to get started</Text>
              </View>
            ) : (
              <View style={styles.exercisesList}>
                {exercises.map((exercise, index) => (
                  <View key={exercise.id} style={styles.exerciseCard}>
                    <View style={styles.exerciseCardLeft}>
                      <View style={[styles.exerciseNumber, { backgroundColor: selectedColor + '20' }]}>
                        <Text style={[styles.exerciseNumberText, { color: selectedColor }]}>
                          {index + 1}
                        </Text>
                      </View>
                      <View style={styles.exerciseInfo}>
                        <Text style={styles.exerciseName}>{exercise.name}</Text>
                        <Text style={styles.exerciseDetails}>
                          {exercise.sets} sets × {exercise.reps || exercise.duration}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.exerciseActions}>
                      <TouchableOpacity
                        style={styles.exerciseActionButton}
                        onPress={() => handleEditExercise(exercise)}
                      >
                        <IconSymbol name="pencil" size={18} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.exerciseActionButton}
                        onPress={() => handleDeleteExercise(exercise.id)}
                      >
                        <IconSymbol name="trash" size={18} color="#ef5350" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Exercise Form */}
          {showExerciseForm && (
            <View style={styles.exerciseForm}>
              <View style={styles.exerciseFormHeader}>
                <Text style={styles.exerciseFormTitle}>
                  {editingExerciseId ? 'Edit Exercise' : 'Add Exercise'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    resetExerciseForm();
                    setShowExerciseForm(false);
                  }}
                >
                  <IconSymbol name="xmark.circle.fill" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Exercise Name</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., Push-ups"
                  placeholderTextColor={colors.textSecondary}
                  value={exerciseName}
                  onChangeText={setExerciseName}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Sets</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., 3"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={exerciseSets}
                  onChangeText={setExerciseSets}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Type</Text>
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      exerciseType === 'reps' && styles.typeOptionSelected,
                      exerciseType === 'reps' && { backgroundColor: selectedColor },
                    ]}
                    onPress={() => setExerciseType('reps')}
                  >
                    <Text style={[
                      styles.typeOptionText,
                      exerciseType === 'reps' && styles.typeOptionTextSelected,
                    ]}>
                      Reps
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      exerciseType === 'duration' && styles.typeOptionSelected,
                      exerciseType === 'duration' && { backgroundColor: selectedColor },
                    ]}
                    onPress={() => setExerciseType('duration')}
                  >
                    <Text style={[
                      styles.typeOptionText,
                      exerciseType === 'duration' && styles.typeOptionTextSelected,
                    ]}>
                      Duration
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {exerciseType === 'reps' ? (
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Reps</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g., 12"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    value={exerciseReps}
                    onChangeText={setExerciseReps}
                  />
                </View>
              ) : (
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Duration</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g., 30 seconds"
                    placeholderTextColor={colors.textSecondary}
                    value={exerciseDuration}
                    onChangeText={setExerciseDuration}
                  />
                </View>
              )}

              <TouchableOpacity
                style={[styles.saveExerciseButton, { backgroundColor: selectedColor }]}
                onPress={handleAddExercise}
              >
                <IconSymbol 
                  name={editingExerciseId ? "checkmark.circle.fill" : "plus.circle.fill"} 
                  size={20} 
                  color={colors.card} 
                />
                <Text style={styles.saveExerciseButtonText}>
                  {editingExerciseId ? 'Update Exercise' : 'Add Exercise'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Save Workout Button */}
          <TouchableOpacity
            style={[styles.saveWorkoutButton, { backgroundColor: selectedColor }]}
            onPress={handleSaveWorkout}
          >
            <IconSymbol name="checkmark.circle.fill" size={24} color={colors.card} />
            <Text style={styles.saveWorkoutButtonText}>Save Workout</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  colorScrollContent: {
    paddingRight: 16,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: colors.card,
  },
  iconScrollContent: {
    paddingRight: 16,
  },
  iconOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.card,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  iconOptionSelected: {
    borderWidth: 3,
  },
  exercisesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.card,
    marginLeft: 6,
  },
  emptyExercises: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: colors.card,
    borderRadius: 12,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  emptyExercisesText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
  },
  emptyExercisesSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  exercisesList: {
    gap: 12,
  },
  exerciseCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  exerciseCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  exerciseNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseNumberText: {
    fontSize: 16,
    fontWeight: '700',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  exerciseDetails: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  exerciseActions: {
    flexDirection: 'row',
    gap: 8,
  },
  exerciseActionButton: {
    padding: 8,
  },
  exerciseForm: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  exerciseFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  exerciseFormTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  formField: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: colors.text,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  typeOptionSelected: {
    backgroundColor: colors.primary,
  },
  typeOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  typeOptionTextSelected: {
    color: colors.card,
  },
  saveExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  saveExerciseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.card,
    marginLeft: 8,
  },
  saveWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
    elevation: 4,
  },
  saveWorkoutButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.card,
    marginLeft: 8,
  },
});
