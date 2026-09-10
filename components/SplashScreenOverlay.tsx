import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Image, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useThemeColors } from '@/hooks/useThemeColors';

interface SplashScreenOverlayProps {
  onAnimationComplete: () => void;
  isReady: boolean;
}

export default function SplashScreenOverlay({
  onAnimationComplete,
  isReady,
}: SplashScreenOverlayProps) {
  const colors = useThemeColors();
  const isDark = colors.background === '#0B0C0E';

  // Animation values
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0.92);
  const logoPulse = useSharedValue(1);
  const progressBar = useSharedValue(0);

  useEffect(() => {
    // Gentle pulse animation for the logo
    logoPulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Initial enter animation
    scale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });

    // Progress bar animation
    progressBar.value = withTiming(1, {
      duration: 1100,
      easing: Easing.inOut(Easing.quad),
    });
  }, []);

  useEffect(() => {
    if (isReady) {
      // Hold for a moment to ensure visual stability and smooth transition
      const timer = setTimeout(() => {
        opacity.value = withTiming(
          0,
          {
            duration: 450,
            easing: Easing.inOut(Easing.cubic),
          },
          (finished) => {
            if (finished) {
              runOnJS(onAnimationComplete)();
            }
          }
        );
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isReady]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * logoPulse.value }],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressBar.value * 100}%`,
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: isDark ? '#0B0C0E' : '#F8FAFC' },
        containerAnimatedStyle,
      ]}
      pointerEvents="auto"
    >
      <View style={styles.centerBox}>
        {/* Glow ambient circle */}
        <View
          style={[
            styles.ambientGlow,
            { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.18)' : 'rgba(59, 130, 246, 0.12)' },
          ]}
        />

        {/* Animated App Mascot / Logo */}
        <Animated.View style={[styles.iconWrapper, logoAnimatedStyle]}>
          <Image
            source={require('@/assets/images/onboarding.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Brand Name */}
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
            Motion<Text style={styles.titleAccent}>Fit</Text>
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Smart Bionic Training
          </Text>
        </View>

        {/* Minimalist Loading Bar */}
        <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
          <Animated.View
            style={[
              styles.progressBar,
              { backgroundColor: colors.primaryAction },
              progressAnimatedStyle,
            ]}
          />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ambientGlow: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    opacity: 0.85,
  },
  iconWrapper: {
    width: 320,
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  logoImage: {
    width: 300,
    height: 300,
  },
  textWrap: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  titleAccent: {
    color: '#3B82F6',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  progressTrack: {
    width: 160,
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
});
