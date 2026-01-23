import React, { useEffect } from 'react';
import { View, Text, Animated } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';

interface AchievementCelebrationProps {
  visible: boolean;
  title: string;
  subtitle: string;
  onClose: () => void;
}

const AchievementCelebration: React.FC<AchievementCelebrationProps> = ({
  visible,
  title,
  subtitle,
  onClose
}) => {
  const scaleAnim = new Animated.Value(0);
  const opacityAnim = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 3,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        })
      ]).start();

      // Auto-close after 3 seconds
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 0.8,
            tension: 50,
            friction: 3,
            useNativeDriver: true,
          })
        ]).start(() => onClose());
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      // Reset animations
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      className="absolute top-25 left-5 right-5 z-50 items-center"
      style={[
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        }
      ]}
    >
      <View className="bg-white dark:bg-gray-800 rounded-xl p-5 items-center w-full shadow-lg shadow-black/10">
        <IconSymbol name="trophy.fill" size={48} color="#FF9500" />
        <Text className="text-xl font-700 text-gray-900 dark:text-white text-center mt-3"> {title}</Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">{subtitle}</Text>
      </View>
    </Animated.View>
  );
};

export default AchievementCelebration;