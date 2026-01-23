import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { IconSymbol } from '../ui/IconSymbol';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentPage, setCurrentPage] = useState(0);

  const pages = [
    {
      title: "Welcome to Motion Fits",
      subtitle: "Your personal fitness companion",
      icon: "figure.run",
      description: "Track your workouts, set goals, and achieve your fitness journey with personalized plans."
    },
    {
      title: "Create Your Plan",
      subtitle: "Customize your workouts",
      icon: "figure.strengthtraining.traditional",
      description: "Design your own workout routines or choose from our pre-built plans tailored to your goals."
    },
    {
      title: "Track Progress",
      subtitle: "Monitor your achievements",
      icon: "chart.bar.fill",
      description: "Keep track of your workouts, see your progress over time, and celebrate your milestones."
    },
    {
      title: "Set Goals",
      subtitle: "Stay motivated",
      icon: "calendar.badge.clock",
      description: "Define your weekly targets and receive reminders to stay consistent with your fitness routine."
    }
  ];

  const handleNext = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      finishOnboarding();
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const finishOnboarding = async () => {
    try {
      await AsyncStorage.setItem('onboardingComplete', 'true');
      onComplete();
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      onComplete();
    }
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900 p-5">
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const page = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentPage(page);
        }}
        scrollEnabled={false} // Disable scrolling to force button navigation
      >
        {pages.map((page, index) => (
          <View key={index} className="flex-1 justify-center items-center px-5" style={{ width }}>
            <View className="w-30 h-30 rounded-full bg-blue-500/20 justify-center items-center mb-7.5">
              <IconSymbol name={page.icon as any} size={80} color="#007AFF" />
            </View>
            <Text className="text-2xl font-700 text-gray-900 dark:text-white text-center mb-2">{page.title}</Text>
            <Text className="text-base font-500 text-gray-500 dark:text-gray-400 text-center mb-5">{page.subtitle}</Text>
            <Text className="text-base text-gray-900 dark:text-white text-center leading-6">{page.description}</Text>
          </View>
        ))}
      </ScrollView>

      <View className="flex-row justify-center items-center my-7.5">
        {pages.map((_, index) => (
          <View
            key={index}
            className={`w-2 h-2 rounded-full mx-1 ${index === currentPage ? 'bg-blue-500 dark:bg-blue-400' : 'bg-gray-500 dark:bg-gray-400'}`}
          />
        ))}
      </View>

      <View className="flex-row justify-between w-full px-5 mb-10">
        <TouchableOpacity
          className={`flex-1 py-3.5 px-5 rounded-lg items-center mx-2 ${currentPage === 0 ? 'bg-gray-50 dark:bg-gray-700' : 'bg-gray-50 dark:bg-gray-700'}`}
          onPress={handlePrev}
          disabled={currentPage === 0}
          opacity={currentPage === 0 ? 0.5 : 1}
        >
          <Text className="text-base font-600 text-gray-900 dark:text-white">Previous</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 py-3.5 px-5 rounded-lg items-center mx-2 bg-blue-500 dark:bg-blue-600"
          onPress={handleNext}
        >
          <Text className="text-base font-600 text-white">
            {currentPage === pages.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Onboarding;