import React from 'react';
import { View, Animated } from 'react-native';

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
  shimmerColor = '#f5f5f7',
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
    outputRange: [shimmerColor, '#ffffff'],
  });

  return (
    <View
      className="overflow-hidden relative"
      style={[
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
          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
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

export default SkeletonLoader;