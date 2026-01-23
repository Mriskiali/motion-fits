import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import WorkoutCard from '@/components/ui/WorkoutCard';

// Example of how the main workout screen would look with Tailwind
const WorkoutScreenExample = () => {
  const { dark: isDark } = useTheme();
  const colorScheme = isDark ? 'dark' : 'light';
  
  // Determine colors based on theme
  const bgColor = colorScheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50';
  const textColor = colorScheme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondaryColor = colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  
  // Sample workout data
  const workouts = [
    {
      id: 'upper1',
      name: 'UPPER',
      subtitle: 'Chest, Shoulder, Triceps',
      icon: 'figure.strengthtraining.traditional',
      color: '#64b5f6',
    },
    {
      id: 'lower',
      name: 'LOWER',
      subtitle: 'Legs + Glutes + Calves',
      icon: 'figure.strengthtraining.functional',
      color: '#aed581',
    },
    {
      id: 'upper2',
      name: 'UPPER',
      subtitle: 'Back, Biceps, Forearm, Core',
      icon: 'figure.core.training',
      color: '#ffb74d',
    },
  ];

  return (
    <View className={`flex-1 ${bgColor}`}>
      <ScrollView className="flex-1 px-4 pt-4">
        <View className="mb-6">
          <Text className={`text-3xl font-bold ${textColor}`}>Weekly Workout Plan</Text>
          <Text className={`text-base ${textSecondaryColor}`}>Select a day and assign your workout</Text>
        </View>

        {/* Week Day Tabs */}
        <View className="mb-6">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pb-2">
            <View className="flex-row space-x-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                <TouchableOpacity 
                  key={day}
                  className={`w-16 h-20 items-center justify-center rounded-xl ${
                    index === 1 
                      ? 'bg-blue-500' 
                      : colorScheme === 'dark' 
                        ? 'bg-gray-800' 
                        : 'bg-gray-200'
                  }`}
                >
                  <Text className={`font-semibold ${
                    index === 1 
                      ? 'text-white' 
                      : colorScheme === 'dark' 
                        ? 'text-gray-300' 
                        : 'text-gray-700'
                  }`}>
                    {day}
                  </Text>
                  <Text className={`text-lg font-bold ${
                    index === 1 
                      ? 'text-white' 
                      : colorScheme === 'dark' 
                        ? 'text-gray-200' 
                        : 'text-gray-800'
                  }`}>
                    {index + 1}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Selected Day Info */}
        <View className={`rounded-2xl p-4 mb-6 ${
          colorScheme === 'dark' 
            ? 'bg-gray-800' 
            : 'bg-white'
        } shadow-lg shadow-gray-200/50 dark:shadow-gray-800/50`}>
          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              <Text className={`text-lg font-bold ${textColor}`}>Monday, January 20</Text>
              <Text className={`text-base ${textSecondaryColor}`}>UPPER - Chest, Shoulder, Triceps</Text>
            </View>
            <TouchableOpacity className="bg-blue-500 w-14 h-14 rounded-full items-center justify-center">
              <IconSymbol name="pencil" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Workout Cards */}
        <View className="mb-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className={`text-xl font-bold ${textColor}`}>Available Workouts</Text>
            <TouchableOpacity className="flex-row items-center bg-gray-200 dark:bg-gray-700 px-3 py-2 rounded-full">
              <IconSymbol name="plus.circle.fill" size={24} color="#3b82f6" />
              <Text className="text-blue-500 font-semibold ml-1">Create</Text>
            </TouchableOpacity>
          </View>
          
          {workouts.map((workout) => (
            <WorkoutCard
              key={workout.id}
              title={workout.name}
              subtitle={workout.subtitle}
              icon={workout.icon}
              color={workout.color}
              onPress={() => console.log('Pressed', workout.name)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default WorkoutScreenExample;