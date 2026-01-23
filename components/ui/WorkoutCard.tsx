import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { IconSymbol } from '@/components/ui/IconSymbol';

// Example of how a simple component would look with Tailwind
const WorkoutCard = ({ 
  title, 
  subtitle, 
  icon, 
  color, 
  onPress 
}: {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  onPress: () => void;
}) => {
  const { dark: isDark } = useTheme();
  const colorScheme = isDark ? 'dark' : 'light';
  
  // Determine colors based on theme and props
  const bgColor = colorScheme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const textColor = colorScheme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondaryColor = colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const shadowColor = colorScheme === 'dark' ? 'shadow-gray-900/20' : 'shadow-gray-200/50';
  
  // Create a lightened version of the color for the background
  const lightColor = `${color}20`; // Adds 20% opacity
  
  return (
    <TouchableOpacity 
      className={`rounded-2xl p-4 mb-4 ${bgColor} shadow-lg ${shadowColor}`}
      onPress={onPress}
    >
      <View className="flex-row items-center">
        <View className={`w-14 h-14 rounded-xl items-center justify-center mr-4`} style={{ backgroundColor: lightColor }}>
          <IconSymbol name={icon as any} size={32} color={color} />
        </View>
        <View className="flex-1">
          <Text className={`text-lg font-bold ${textColor}`}>{title}</Text>
          <Text className={`text-sm ${textSecondaryColor}`}>{subtitle}</Text>
        </View>
        <View className="items-center">
          <Text className={`text-sm font-medium ${textSecondaryColor}`}>0/5</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default WorkoutCard;