import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '@/styles/commonStyles';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
  shimmerColor?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
  shimmerColor = colors.background,
}) => {
  const shimmerAnimation = new Animated.Value(0);

  React.useEffect(() => {
    const shimmerInterval = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );

    shimmerInterval.start();

    return () => {
      shimmerInterval.stop();
    };
  }, []);

  const shimmerColorInterpolation = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [shimmerColor, colors.card],
  });

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: shimmerColor,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: shimmerColorInterpolation,
            opacity: 0.5,
            transform: [
              {
                translateX: shimmerAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-100, 100],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
    position: 'relative',
  },
});

export default SkeletonLoader;