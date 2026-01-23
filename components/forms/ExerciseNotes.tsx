import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Alert, Platform } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import * as Haptics from 'expo-haptics';

interface ExerciseNote {
  exerciseId: string;
  note: string;
  timestamp: number;
}

interface ExerciseNotesProps {
  exerciseId: string;
  initialNote?: string;
  onSave: (note: ExerciseNote) => void;
  onClose: () => void;
  visible: boolean;
}

const ExerciseNotes: React.FC<ExerciseNotesProps> = ({
  exerciseId,
  initialNote = '',
  onSave,
  onClose,
  visible
}) => {
  const colorScheme = 'light'; // Default to light for now until we fix the NativeWind issue
  const [note, setNote] = useState(initialNote);

  const handleSave = () => {
    if (note.trim()) {
      const noteObj: ExerciseNote = {
        exerciseId,
        note: note.trim(),
        timestamp: Date.now(),
      };
      onSave(noteObj);

      // Provide haptic feedback
      if (typeof Haptics.impactAsync !== 'undefined') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } else {
      Alert.alert('Empty Note', 'Please enter a note before saving.');
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Clear Note',
      'Are you sure you want to clear this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setNote('');
            onSave({
              exerciseId,
              note: '',
              timestamp: Date.now(),
            });

            // Provide haptic feedback
            if (typeof Haptics.impactAsync !== 'undefined') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          },
        },
      ]
    );
  };

  // Determine colors based on theme
  const bgColor = colorScheme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const textColor = colorScheme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondaryColor = colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const bgSecondaryColor = colorScheme === 'dark' ? 'bg-gray-700' : 'bg-gray-100';
  const primaryColor = colorScheme === 'dark' ? 'bg-blue-600' : 'bg-blue-500';
  const destructiveColor = colorScheme === 'dark' ? 'bg-red-700' : 'bg-red-500';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className={`rounded-t-3xl p-6 max-h-[60%] ${bgColor}`}>
          <View className="flex-row justify-between items-center mb-5">
            <Text className={`text-xl font-bold ${textColor}`}>Exercise Notes</Text>
            <TouchableOpacity onPress={onClose}>
              <IconSymbol name="xmark.circle.fill" size={32} color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
          </View>

          <TextInput
            className={`flex-1 border rounded-xl p-4 text-base ${colorScheme === 'dark' ? 'border-gray-700 bg-gray-700 text-white' : 'border-gray-200 bg-gray-50 text-gray-900'}`}
            value={note}
            onChangeText={setNote}
            placeholder="Add notes about this exercise (form, equipment, etc.)"
            multiline
            autoFocus
          />

          <View className="flex-row justify-end gap-3 mt-4">
            {note.trim() ? (
              <TouchableOpacity
                className={`flex-row items-center px-4 py-3 rounded-lg ${destructiveColor}`}
                onPress={handleClear}
              >
                <IconSymbol name="trash.fill" size={20} color="white" />
                <Text className="text-white font-semibold ml-2">Clear</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              className={`flex-row items-center px-4 py-3 rounded-lg ${primaryColor}`}
              onPress={handleSave}
            >
              <IconSymbol name="checkmark.circle.fill" size={20} color="white" />
              <Text className="text-white font-semibold ml-2">Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ExerciseNotes;