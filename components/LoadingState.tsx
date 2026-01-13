import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';

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
    <View style={styles.container}>
      <ActivityIndicator 
        size={size} 
        color={color || theme.colors.primary} 
      />
      {message ? (
        <Text style={[styles.text, { color: theme.colors.text }]}>
          {message}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
  },
});