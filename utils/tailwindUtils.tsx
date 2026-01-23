// Optimized utility classes for common patterns in MotionFit app
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';

// Pre-computed theme classes for performance
const THEME_CLASSES = {
  light: {
    bg: 'bg-white',
    bgSecondary: 'bg-gray-100',
    bgTertiary: 'bg-gray-50',
    text: 'text-gray-900',
    textSecondary: 'text-gray-600',
    textTertiary: 'text-gray-500',
    border: 'border-gray-200',
    shadow: 'shadow-gray-200/50',
    primary: 'bg-blue-500 text-blue-500',
    secondary: 'bg-green-500 text-green-500',
    accent: 'bg-orange-500 text-orange-500',
  },
  dark: {
    bg: 'bg-gray-800',
    bgSecondary: 'bg-gray-700',
    bgTertiary: 'bg-gray-900',
    text: 'text-white',
    textSecondary: 'text-gray-300',
    textTertiary: 'text-gray-400',
    border: 'border-gray-700',
    shadow: 'shadow-gray-900/20',
    primary: 'bg-blue-600 text-blue-400',
    secondary: 'bg-green-600 text-green-400',
    accent: 'bg-orange-600 text-orange-400',
  }
};

// Common reusable components with Tailwind
export const Card = React.memo(({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const { dark: isDark } = useTheme();
  const colorScheme = isDark ? 'dark' : 'light';
  const theme = THEME_CLASSES[colorScheme || 'light'];
  const baseClass = `rounded-2xl p-4 ${theme.bg} shadow-lg ${theme.shadow}`;
  return <View className={`${baseClass} ${className}`}>{children}</View>;
});

export const Button = React.memo(({
  children,
  onPress,
  variant = 'primary',
  className = ''
}: {
  children: React.ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  className?: string;
}) => {
  const { dark: isDark } = useTheme();
  const colorScheme = isDark ? 'dark' : 'light';
  const theme = THEME_CLASSES[colorScheme || 'light'];
  let baseClass = 'rounded-lg py-3 px-4 items-center justify-center ';

  switch(variant) {
    case 'primary':
      baseClass += colorScheme === 'dark' ? 'bg-blue-600' : 'bg-blue-500';
      break;
    case 'secondary':
      baseClass += colorScheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200';
      break;
    case 'outline':
      baseClass += `border ${colorScheme === 'dark' ? 'border-blue-400' : 'border-blue-500'} bg-transparent`;
      break;
    case 'ghost':
      baseClass += 'bg-transparent';
      break;
  }

  return (
    <TouchableOpacity className={`${baseClass} ${className}`} onPress={onPress}>
      {children}
    </TouchableOpacity>
  );
});

export const TextWithTheme = React.memo(({
  children,
  variant = 'body',
  className = ''
}: {
  children: React.ReactNode;
  variant?: 'heading' | 'subheading' | 'body' | 'caption' | 'label';
  className?: string;
}) => {
  const { dark: isDark } = useTheme();
  const colorScheme = isDark ? 'dark' : 'light';
  const theme = THEME_CLASSES[colorScheme || 'light'];
  let baseClass = '';

  switch(variant) {
    case 'heading':
      baseClass = 'text-xl font-bold ';
      break;
    case 'subheading':
      baseClass = 'text-lg font-semibold ';
      break;
    case 'body':
      baseClass = 'text-base ';
      break;
    case 'caption':
      baseClass = 'text-xs ';
      break;
    case 'label':
      baseClass = 'text-sm font-medium ';
      break;
  }

  baseClass += theme.text;

  return <Text className={`${baseClass} ${className}`}>{children}</Text>;
});

// Common layout patterns
export const ScreenContainer = React.memo(({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const { dark: isDark } = useTheme();
  const colorScheme = isDark ? 'dark' : 'light';
  const theme = THEME_CLASSES[colorScheme || 'light'];
  const baseClass = `flex-1 ${theme.bgTertiary} p-4`;
  return <View className={`${baseClass} ${className}`}>{children}</View>;
});

export const SectionHeader = React.memo(({ title, action, className = '' }: {
  title: string;
  action?: { label: string; onPress: () => void };
  className?: string;
}) => {
  const { dark: isDark } = useTheme();
  const colorScheme = isDark ? 'dark' : 'light';
  const theme = THEME_CLASSES[colorScheme || 'light'];

  return (
    <View className={`flex-row justify-between items-center mb-4 ${className}`}>
      <Text className={`text-lg font-bold ${theme.text}`}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={action.onPress}>
          <Text className={`${theme.primary.split(' ')[1]} font-semibold`}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});