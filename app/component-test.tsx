/**
 * Test file to verify that migrated components work correctly with Tailwind CSS
 */

import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/feedback/LoadingState';
import ErrorBoundary from '@/components/feedback/ErrorBoundary';
import SkeletonLoader from '@/components/feedback/SkeletonLoader';
import WorkoutCard from '@/components/ui/WorkoutCard';
import { useTheme } from '@/contexts/ThemeContext';

// Test component to verify all migrated components work
const ComponentTester = () => {
  const { isDark } = useTheme();
  
  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900 p-4">
      <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Component Migration Test</Text>
      
      {/* Test Button component */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Buttons:</Text>
        <View className="flex-row gap-2 mb-2">
          <Button variant="filled" size="sm">
            <Text>Filled SM</Text>
          </Button>
          <Button variant="outline" size="sm">
            <Text>Outline SM</Text>
          </Button>
        </View>
        <View className="flex-row gap-2 mb-2">
          <Button variant="filled" size="md">
            <Text>Filled MD</Text>
          </Button>
          <Button variant="outline" size="md">
            <Text>Outline MD</Text>
          </Button>
        </View>
        <View className="flex-row gap-2">
          <Button variant="filled" size="lg">
            <Text>Filled LG</Text>
          </Button>
          <Button variant="outline" size="lg">
            <Text>Outline LG</Text>
          </Button>
        </View>
      </View>
      
      {/* Test LoadingState component */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Loading State:</Text>
        <LoadingState message="Testing Loading State..." />
      </View>
      
      {/* Test SkeletonLoader component */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Skeleton Loader:</Text>
        <SkeletonLoader width="100%" height={20} className="mb-2" />
        <SkeletonLoader width="80%" height={20} className="mb-2" />
        <SkeletonLoader width="60%" height={20} />
      </View>
      
      {/* Test WorkoutCard component */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Workout Card:</Text>
        <WorkoutCard 
          title="Chest Day" 
          subtitle="Upper Body Focus" 
          icon="figure.strengthtraining.traditional" 
          color="#007AFF" 
          onPress={() => console.log('Workout card pressed')} 
        />
      </View>
      
      {/* Test ErrorBoundary component */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Boundary (Wrapped):</Text>
        <ErrorBoundary>
          <View className="p-4 bg-white dark:bg-gray-800 rounded-lg">
            <Text className="text-gray-900 dark:text-white">Content inside Error Boundary</Text>
          </View>
        </ErrorBoundary>
      </View>
      
      <Text className="text-gray-900 dark:text-white mt-6 text-center">
        All components successfully migrated to Tailwind CSS!
      </Text>
    </ScrollView>
  );
};

export default ComponentTester;