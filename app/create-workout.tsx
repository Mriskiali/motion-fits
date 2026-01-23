import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform, KeyboardAvoidingView, SafeAreaView, Keyboard, Dimensions } from 'react-native';
import { Stack, router } from 'expo-router';
import { useTheme } from '@react-navigation/native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/ui/IconSymbol';
import * as Haptics from 'expo-haptics';
import { dataStore } from '@/lib/dataStore';

interface Exercise {
  id: string;
  name: string;
  type: 'strength' | 'cardio' | 'duration'; // strength (sets/reps/weight), cardio (duration), duration (just time)
  sets?: string;
  reps?: string;
  weight?: string; // for strength exercises
  duration?: string; // for cardio/duration exercises
  hours?: string; // for cardio/duration exercises
  minutes?: string; // for cardio/duration exercises
  seconds?: string; // for cardio/duration exercises
  notes?: string;
}

export default function CreateWorkoutScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <CreateWorkoutContent />
    </>
  );
}

function CreateWorkoutContent() {
  const theme = useTheme();
  const [workoutName, setWorkoutName] = useState('');
  const [workoutSubtitle, setWorkoutSubtitle] = useState('');
  const [workoutIcon, setWorkoutIcon] = useState('figure.strengthtraining.traditional');
  const [workoutColor, setWorkoutColor] = useState('#64b5f6');
  const [exercises, setExercises] = useState<Exercise[]>([
    { id: Date.now().toString(), name: '', type: 'strength', sets: '3', reps: '10' }
  ]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  React.useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardWillShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });

    const hideSubscription = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription?.remove();
      hideSubscription?.remove();
    };
  }, []);

  const addExercise = () => {
    const newExercise: Exercise = {
      id: Date.now().toString(),
      name: '',
      type: 'strength', // Default to strength exercise
      sets: '3',
      reps: '10',
      hours: '0',
      minutes: '0',
      seconds: '0'
    };
    setExercises([...exercises, newExercise]);
    if (Platform.OS !== 'web' && Haptics?.ImpactFeedbackStyle?.Light) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const updateExercise = (id: string, field: keyof Exercise, value: string) => {
    setExercises(exercises.map(ex => 
      ex.id === id ? { ...ex, [field]: value } : ex
    ));
  };

  const removeExercise = (id: string) => {
    if (exercises.length <= 1) {
      Alert.alert('Cannot remove', 'A workout must have at least one exercise');
      return;
    }
    
    setExercises(exercises.filter(ex => ex.id !== id));
    if (Platform.OS !== 'web') {
      if (Haptics?.ImpactFeedbackStyle?.Medium) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  };

  const saveWorkout = async () => {
    if (!workoutName.trim()) {
      Alert.alert('Missing Name', 'Please enter a name for your workout');
      return;
    }

    if (exercises.some(ex => !ex.name.trim())) {
      Alert.alert('Incomplete Exercise', 'Please fill in all exercise names');
      return;
    }

    try {
      // Get existing custom workouts
      const existingWorkouts = await dataStore.getCustomWorkoutPlans();
      
      // Create new workout
      const newWorkout = {
        id: `custom_${Date.now()}`,
        name: workoutName.trim(),
        subtitle: workoutSubtitle.trim() || 'Custom workout',
        exercises: exercises.map(ex => ({
          id: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: ex.name,
          type: ex.type || 'strength', // Default to strength if not specified
          sets: ex.sets || '3',
          reps: ex.reps || '10',
          weight: ex.weight, // May be undefined for non-strength exercises
          duration: (ex.type === 'cardio' || ex.type === 'duration')
            ? `${ex.hours || '0'}h ${ex.minutes || '0'}m ${ex.seconds || '0'}s`
            : ex.duration, // May be undefined for strength exercises
          hours: ex.hours,
          minutes: ex.minutes,
          seconds: ex.seconds,
          notes: ex.notes
        })),
        icon: workoutIcon,
        color: workoutColor,
        isCustom: true
      };

      // Save the new workout
      const updatedWorkouts = [...existingWorkouts, newWorkout];
      await dataStore.setCustomWorkoutPlans(updatedWorkouts);

      if (Platform.OS !== 'web') {
        if (Haptics?.NotificationFeedbackType?.Success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
      
      Alert.alert(
        'Success', 
        'Workout created successfully!', 
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error saving workout:', error);
      Alert.alert('Error', 'Failed to save workout. Please try again.');
    }
  };

  // Icon options
  const iconOptions = [
    { name: 'figure.strengthtraining.traditional', label: 'Strength' },
    { name: 'figure.strengthtraining.functional', label: 'Functional' },
    { name: 'figure.core.training', label: 'Core' },
    { name: 'figure.dance', label: 'Cardio' },
    { name: 'figure.yoga', label: 'Yoga' },
    { name: 'figure.flexibility', label: 'Flexibility' },
  ];

  // Color options
  const colorOptions = [
    { value: '#64b5f6', label: 'Blue' },
    { value: '#aed581', label: 'Green' },
    { value: '#ffb74d', label: 'Orange' },
    { value: '#ff8a65', label: 'Red' },
    { value: '#ba68c8', label: 'Purple' },
    { value: '#4db6ac', label: 'Teal' },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            keyboardHeight > 0 ? { paddingBottom: keyboardHeight } : {}
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <IconSymbol name="chevron.left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Create Custom Workout</Text>
            <TouchableOpacity onPress={saveWorkout}>
              <IconSymbol name="checkmark.circle.fill" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Workout Info */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Workout Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Workout Name</Text>
              <TextInput
                style={styles.input}
                value={workoutName}
                onChangeText={setWorkoutName}
                placeholder="e.g. My Upper Body Routine"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Subtitle (optional)</Text>
              <TextInput
                style={styles.input}
                value={workoutSubtitle}
                onChangeText={setWorkoutSubtitle}
                placeholder="e.g. Chest, Shoulders, Triceps"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.optionGroup}>
              <Text style={styles.label}>Icon</Text>
              <View style={styles.iconOptions}>
                {iconOptions.map((option) => (
                  <TouchableOpacity
                    key={option.name}
                    style={[
                      styles.iconOption,
                      workoutIcon === option.name && styles.iconOptionSelected
                    ]}
                    onPress={() => setWorkoutIcon(option.name)}
                  >
                    <IconSymbol
                      name={option.name as any}
                      size={24}
                      color={workoutIcon === option.name ? colors.card : colors.text}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.optionGroup}>
              <Text style={styles.label}>Color</Text>
              <View style={styles.colorOptions}>
                {colorOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.colorOption,
                      { backgroundColor: option.value },
                      workoutColor === option.value && styles.colorOptionSelected
                    ]}
                    onPress={() => setWorkoutColor(option.value)}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* Exercises */}
          <View style={styles.card}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.sectionTitle}>Exercises</Text>
              <TouchableOpacity style={styles.addButton} onPress={addExercise}>
                <IconSymbol name="plus.circle.fill" size={20} color={colors.primary} />
                <Text style={styles.addButtonText}>Add Exercise</Text>
              </TouchableOpacity>
            </View>

            {exercises.map((exercise, index) => (
              <View key={exercise.id} style={styles.exerciseCard}>
                <View style={styles.exerciseHeaderRow}>
                  <Text style={styles.exerciseNumber}>{index + 1}.</Text>
                  <Text style={styles.exerciseLabel}>Exercise</Text>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeExercise(exercise.id)}
                  >
                    <IconSymbol name="trash" size={20} color="#ef5350" />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={[styles.input, styles.exerciseNameInput]}
                  value={exercise.name}
                  onChangeText={(value) => updateExercise(exercise.id, 'name', value)}
                  placeholder="Exercise name"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="words"
                />

                {/* Exercise Type Selector */}
                <View style={styles.exerciseTypeSelector}>
                  <Text style={styles.detailLabel}>Exercise Type</Text>
                  <View style={styles.typeOptions}>
                    <TouchableOpacity
                      style={[
                        styles.typeOption,
                        exercise.type === 'strength' && styles.typeOptionSelected
                      ]}
                      onPress={() => updateExercise(exercise.id, 'type', 'strength')}
                    >
                      <Text style={[
                        styles.typeOptionText,
                        exercise.type === 'strength' && styles.typeOptionTextSelected
                      ]}>Strength</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.typeOption,
                        exercise.type === 'cardio' && styles.typeOptionSelected
                      ]}
                      onPress={() => updateExercise(exercise.id, 'type', 'cardio')}
                    >
                      <Text style={[
                        styles.typeOptionText,
                        exercise.type === 'cardio' && styles.typeOptionTextSelected
                      ]}>Cardio</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.typeOption,
                        exercise.type === 'duration' && styles.typeOptionSelected
                      ]}
                      onPress={() => updateExercise(exercise.id, 'type', 'duration')}
                    >
                      <Text style={[
                        styles.typeOptionText,
                        exercise.type === 'duration' && styles.typeOptionTextSelected
                      ]}>Duration</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Conditional Inputs based on exercise type */}
                {exercise.type === 'strength' && (
                  <View style={styles.exerciseDetailsRow}>
                    <View style={styles.detailInputGroup}>
                      <Text style={styles.detailLabel}>Sets</Text>
                      <TextInput
                        style={styles.smallInput}
                        value={exercise.sets || '3'}
                        onChangeText={(value) => updateExercise(exercise.id, 'sets', value)}
                        placeholder="3"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>

                    <View style={styles.detailInputGroup}>
                      <Text style={styles.detailLabel}>Reps</Text>
                      <TextInput
                        style={styles.smallInput}
                        value={exercise.reps || '10'}
                        onChangeText={(value) => updateExercise(exercise.id, 'reps', value)}
                        placeholder="10"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>

                    <View style={styles.detailInputGroup}>
                      <Text style={styles.detailLabel}>Weight (kg)</Text>
                      <TextInput
                        style={styles.smallInput}
                        value={exercise.weight || ''}
                        onChangeText={(value) => updateExercise(exercise.id, 'weight', value)}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>
                )}

                {(exercise.type === 'cardio' || exercise.type === 'duration') && (
                  <View style={styles.exerciseDetailsRow}>
                    <View style={styles.detailInputGroup}>
                      <Text style={styles.detailLabel}>Hours</Text>
                      <TextInput
                        style={styles.smallInput}
                        value={exercise.hours || ''}
                        onChangeText={(value) => updateExercise(exercise.id, 'hours', value)}
                        placeholder="0"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                    <View style={styles.detailInputGroup}>
                      <Text style={styles.detailLabel}>Minutes</Text>
                      <TextInput
                        style={styles.smallInput}
                        value={exercise.minutes || ''}
                        onChangeText={(value) => updateExercise(exercise.id, 'minutes', value)}
                        placeholder="0"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                    <View style={styles.detailInputGroup}>
                      <Text style={styles.detailLabel}>Seconds</Text>
                      <TextInput
                        style={styles.smallInput}
                        value={exercise.seconds || ''}
                        onChangeText={(value) => updateExercise(exercise.id, 'seconds', value)}
                        placeholder="0"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16, // Increased border radius for consistency
    padding: 16,
    marginBottom: 16,
    // Enhanced shadow for better depth perception
    boxShadow: '0px 6px 20px rgba(0, 0, 0, 0.1), 0px 2px 6px rgba(0, 0, 0, 0.06)',
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: colors.text,
    backgroundColor: colors.card,
    fontSize: 16,
  },
  optionGroup: {
    marginBottom: 16,
  },
  iconOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconOptionSelected: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.background,
  },
  colorOptionSelected: {
    borderColor: colors.card,
    borderWidth: 3,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 4,
  },
  exerciseCard: {
    backgroundColor: colors.background,
    borderRadius: 16, // Increased border radius for consistency
    padding: 16, // Increased padding for better spacing
    marginBottom: 12,
    // Enhanced shadow for better depth perception
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.06)',
    elevation: 3,
  },
  exerciseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  exerciseLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  exerciseNameInput: {
    marginBottom: 12,
  },
  exerciseDetailsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailInputGroup: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  smallInput: {
    height: 40,
    borderWidth: 1,
    borderColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    color: colors.text,
    backgroundColor: colors.card,
    fontSize: 16,
    textAlign: 'center',
  },
  removeButton: {
    padding: 8,
    marginLeft: 8,
    marginTop: 4,
  },
  exerciseTypeSelector: {
    marginBottom: 12,
  },
  typeOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.background,
    alignItems: 'center',
  },
  typeOptionSelected: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  typeOptionTextSelected: {
    color: colors.primary,
  },
});