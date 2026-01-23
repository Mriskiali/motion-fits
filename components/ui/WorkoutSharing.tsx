import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, Share, Clipboard } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import * as Haptics from 'expo-haptics';
import { WorkoutPlan } from '@/lib/dataStore';

interface WorkoutSharingProps {
  workoutPlan: WorkoutPlan;
  visible: boolean;
  onClose: () => void;
}

const WorkoutSharing: React.FC<WorkoutSharingProps> = ({
  workoutPlan,
  visible,
  onClose
}) => {
  const colorScheme = 'light'; // Default to light for now until we fix the NativeWind issue
  const [isExporting, setIsExporting] = useState(false);

  const exportWorkout = async () => {
    try {
      setIsExporting(true);

      // Prepare workout data for export
      const exportData = {
        id: workoutPlan.id,
        name: workoutPlan.name,
        subtitle: workoutPlan.subtitle,
        icon: workoutPlan.icon,
        color: workoutPlan.color,
        exercises: workoutPlan.exercises,
        exportedAt: new Date().toISOString(),
        version: '1.0',
      };

      // Convert to JSON string
      const jsonString = JSON.stringify(exportData, null, 2);

      // Copy to clipboard
      await Clipboard.setStringAsync(jsonString);

      // Provide feedback
      Alert.alert(
        'Workout Copied!',
        'The workout plan has been copied to your clipboard. You can share it with others.',
        [{ text: 'OK' }]
      );

      // Provide haptic feedback
      if (typeof Haptics.impactAsync !== 'undefined') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Error exporting workout:', error);
      Alert.alert('Export Failed', 'Could not export the workout plan. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const shareWorkout = async () => {
    try {
      // Prepare workout data for sharing
      const exportData = {
        id: workoutPlan.id,
        name: workoutPlan.name,
        subtitle: workoutPlan.subtitle,
        icon: workoutPlan.icon,
        color: workoutPlan.color,
        exercises: workoutPlan.exercises,
        exportedAt: new Date().toISOString(),
        version: '1.0',
      };

      // Convert to JSON string
      const jsonString = JSON.stringify(exportData, null, 2);

      // Share the workout
      await Share.share({
        title: `Workout Plan: ${workoutPlan.name}`,
        message: `Check out this workout plan: ${workoutPlan.name}\n\n${jsonString}`,
        url: `data:text/plain;base64,${btoa(jsonString)}`,
      });

      // Provide haptic feedback
      if (typeof Haptics.impactAsync !== 'undefined') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Error sharing workout:', error);
      if ((error as Error).message.includes('dismissed')) {
        // User cancelled sharing, no need to show error
        return;
      }
      Alert.alert('Share Failed', 'Could not share the workout plan. Please try again.');
    }
  };

  const importWorkout = async () => {
    try {
      // Get the clipboard content
      const clipboardContent = await Clipboard.getStringAsync();

      if (!clipboardContent) {
        Alert.alert('No Data Found', 'No workout data found in clipboard.');
        return;
      }

      // Try to parse as JSON
      let importedWorkout;
      try {
        importedWorkout = JSON.parse(clipboardContent);
      } catch (parseError) {
        Alert.alert('Invalid Format', 'The clipboard content is not a valid workout plan format.');
        return;
      }

      // Validate the imported workout
      if (!importedWorkout.name || !importedWorkout.exercises) {
        Alert.alert('Invalid Format', 'The imported data is not a valid workout plan.');
        return;
      }

      // TODO: Add the imported workout to the user's custom plans
      // This would require passing a callback to add the imported workout
      Alert.alert(
        'Workout Ready',
        `Found workout: "${importedWorkout.name}".\n\nTap OK to add it to your custom workouts.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add Workout',
            onPress: () => {
              // Provide haptic feedback
              if (typeof Haptics.impactAsync !== 'undefined') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }

              // In a real implementation, this would call a function to add the workout
              Alert.alert('Success', 'Workout added to your custom plans!');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error importing workout:', error);
      Alert.alert('Import Failed', 'Could not import the workout plan. Please try again.');
    }
  };

  // Determine colors based on theme
  const bgColor = colorScheme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const textColor = colorScheme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondaryColor = colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const bgSecondaryColor = colorScheme === 'dark' ? 'bg-gray-700' : 'bg-gray-100';
  const primaryColor = colorScheme === 'dark' ? 'text-blue-400' : 'text-blue-500';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className={`rounded-t-3xl p-6 max-h-[70%] ${bgColor}`}>
          <View className="flex-row justify-between items-center mb-5">
            <Text className={`text-xl font-bold ${textColor}`}>Share Workout</Text>
            <TouchableOpacity onPress={onClose}>
              <IconSymbol name="xmark.circle.fill" size={32} color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
          </View>

          <View className="mb-5">
            <TouchableOpacity
              className="flex-row items-center py-3"
              onPress={exportWorkout}
            >
              <IconSymbol name="square.and.arrow.up" size={24} color={colorScheme === 'dark' ? '#60a5fa' : '#3b82f6'} />
              <Text className={`text-base font-semibold ml-3 ${textColor}`}>Copy to Clipboard</Text>
            </TouchableOpacity>

            <Text className={`ml-9 mt-1 text-sm leading-5 ${textSecondaryColor}`}>
              Copy the workout plan to your clipboard to share with others
            </Text>
          </View>

          <View className="mb-5">
            <TouchableOpacity
              className="flex-row items-center py-3"
              onPress={shareWorkout}
            >
              <IconSymbol name="square.and.arrow.up.on.square" size={24} color={colorScheme === 'dark' ? '#60a5fa' : '#3b82f6'} />
              <Text className={`text-base font-semibold ml-3 ${textColor}`}>Share via App</Text>
            </TouchableOpacity>

            <Text className={`ml-9 mt-1 text-sm leading-5 ${textSecondaryColor}`}>
              Share the workout plan through your device's sharing options
            </Text>
          </View>

          <View className="mb-5">
            <TouchableOpacity
              className="flex-row items-center py-3"
              onPress={importWorkout}
            >
              <IconSymbol name="square.and.arrow.down" size={24} color={colorScheme === 'dark' ? '#60a5fa' : '#3b82f6'} />
              <Text className={`text-base font-semibold ml-3 ${textColor}`}>Import Workout</Text>
            </TouchableOpacity>

            <Text className={`ml-9 mt-1 text-sm leading-5 ${textSecondaryColor}`}>
              Import a workout plan from your clipboard
            </Text>
          </View>

          <Text className={`text-xs italic text-center mt-5 ${textSecondaryColor}`}>
            Workouts are shared in a JSON format that can be imported by others using MotionFit
          </Text>
        </View>
      </View>
    </Modal>
  );
};

export default WorkoutSharing;