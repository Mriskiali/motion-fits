import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { IconSymbol } from '../ui/IconSymbol';

interface ProgressPhoto {
  id: string;
  uri: string;
  date: string;
  note?: string;
}

interface ProgressPhotoPickerProps {
  onPhotoAdded: (photo: ProgressPhoto) => void;
  photos: ProgressPhoto[];
  label?: string;
}

const ProgressPhotoPicker: React.FC<ProgressPhotoPickerProps> = ({
  onPhotoAdded,
  photos,
  label = 'Progress Photos'
}) => {
  const colorScheme = 'light'; // Default to light for now until we fix the NativeWind issue
  const [isAdding, setIsAdding] = useState(false);

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera access is required to take progress photos.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  };

  const requestMediaLibraryPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Media library access is required to select photos.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  };

  const takePhoto = async () => {
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const newPhoto: ProgressPhoto = {
          id: Date.now().toString(),
          uri: result.assets[0].uri,
          date: new Date().toISOString().split('T')[0],
        };
        onPhotoAdded(newPhoto);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Could not take photo. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const selectFromLibrary = async () => {
    try {
      const hasPermission = await requestMediaLibraryPermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const newPhoto: ProgressPhoto = {
          id: Date.now().toString(),
          uri: result.assets[0].uri,
          date: new Date().toISOString().split('T')[0],
        };
        onPhotoAdded(newPhoto);
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      Alert.alert('Error', 'Could not select photo. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddPhoto = () => {
    setIsAdding(true);
    Alert.alert(
      'Add Photo',
      'Choose how you want to add a progress photo:',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Select from Library', onPress: selectFromLibrary },
        { text: 'Cancel', style: 'cancel', onPress: () => setIsAdding(false) },
      ]
    );
  };

  // Determine colors based on theme
  const bgColor = colorScheme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const textColor = colorScheme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondaryColor = colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const bgSecondaryColor = colorScheme === 'dark' ? 'bg-gray-700' : 'bg-gray-100';
  const primaryColor = 'text-blue-500';

  return (
    <View className={`rounded-2xl p-4 mb-4 shadow-lg shadow-gray-200/50 dark:shadow-gray-800/50 ${bgColor}`}>
      <View className="flex-row justify-between items-center mb-3">
        <Text className={`font-bold text-base ${textColor}`}>{label}</Text>
        <TouchableOpacity
          className={`flex-row items-center bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full ${bgSecondaryColor}`}
          onPress={handleAddPhoto}
        >
          <IconSymbol name="camera.fill" size={20} color={colorScheme === 'dark' ? '#3b82f6' : '#3b82f6'} />
          <Text className={`font-semibold ml-1 ${primaryColor}`}>Add Photo</Text>
        </TouchableOpacity>
      </View>

      {photos.length > 0 ? (
        <View className="flex-row flex-wrap gap-3">
          {photos.map((photo) => (
            <View key={photo.id} className="items-center">
              <Image
                source={{ uri: photo.uri }}
                className="w-24 h-30 rounded-xl mb-1"
                resizeMode="cover"
              />
              <Text className={`text-xs ${textSecondaryColor}`}>{photo.date}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View className="items-center py-6">
          <IconSymbol name="camera" size={48} color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'} />
          <Text className={`font-bold text-lg mt-2 ${textColor}`}>No progress photos yet</Text>
          <Text className={`text-center mt-1 ${textSecondaryColor}`}>Add your first photo to track your journey</Text>
        </View>
      )}
    </View>
  );
};

export default ProgressPhotoPicker;