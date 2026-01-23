import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'large',
  color
}) => {
  const theme = useTheme();

  return (
    <View className="flex-1 justify-center items-center p-5">
      <ActivityIndicator
        size={size}
        color={color || theme.colors.primary}
      />
      {message ? (
        <Text className="mt-2.5 text-base text-center" style={{ color: theme.colors.text }}>
          {message}
        </Text>
      ) : null}
    </View>
  );
};