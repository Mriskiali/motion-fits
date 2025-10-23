
import React from 'react';
import { Platform } from 'react-native';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { Stack } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';

export default function TabLayout() {
  // Define the tabs configuration
  const tabs: TabBarItem[] = [
    {
      name: '(home)',
      route: '/(tabs)/(home)/',
      icon: 'house.fill',
      label: 'Home',
    },
    {
      name: 'workout',
      route: '/(tabs)/workout',
      icon: 'figure.run',
      label: 'Workout',
    },
    {
      name: 'history',
      route: '/(tabs)/history',
      icon: 'chart.bar.fill',
      label: 'History',
    },
    {
      name: 'goals',
      route: '/(tabs)/goals',
      icon: 'calendar.badge.clock',
      label: 'Goals',
    },
  ];

  // Use NativeTabs for iOS, custom FloatingTabBar for Android and Web
  if (Platform.OS === 'ios') {
    return (
      <NativeTabs>
        <NativeTabs.Trigger name="(home)">
          <Icon sf="house.fill" drawable="ic_home" />
          <Label>Home</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="workout">
          <Icon sf="figure.run" drawable="ic_workout" />
          <Label>Workout</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="history">
          <Icon sf="chart.bar.fill" drawable="ic_history" />
          <Label>History</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="goals">
          <Icon sf="calendar.badge.clock" drawable="ic_goals" />
          <Label>Goals</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  // For Android and Web, use Stack navigation with custom floating tab bar
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none', // Remove fade animation to prevent black screen flash
        }}
      >
        <Stack.Screen name="(home)" />
        <Stack.Screen name="workout" />
        <Stack.Screen name="history" />
        <Stack.Screen name="goals" />
      </Stack>
      <FloatingTabBar tabs={tabs} />
    </>
  );
}
