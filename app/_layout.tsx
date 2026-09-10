import { useState, useEffect } from 'react';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import CustomAlert from '@/components/CustomAlert';
import SplashScreenOverlay from '@/components/SplashScreenOverlay';
import OnboardingModal from '@/components/OnboardingModal';
import { useUserStore } from '@/store/useUserStore';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { useColorScheme as useNativeColorScheme } from 'react-native';

import { useWorkoutBackgroundTracker } from '@/hooks/useWorkoutBackgroundTracker';
import { setupNotificationChannels, requestPermissionsAsync } from '@/utils/notifications';
import { setAudioModeAsync } from 'expo-audio';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore potential race conditions */
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    'PlusJakartaSans-Regular': PlusJakartaSans_400Regular,
    'PlusJakartaSans-Medium': PlusJakartaSans_500Medium,
    'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
    'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
    'PlusJakartaSans-ExtraBold': PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    setupNotificationChannels().catch(() => {});
    requestPermissionsAsync().catch(() => {});
    // Configure audio mode to respect phone volume and silent/vibrate switches
    setAudioModeAsync({
      playsInSilentMode: false,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: true,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (error) {
      console.warn('Font loading error:', error);
    }
  }, [error]);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  useWorkoutBackgroundTracker();
  const router = useRouter();
  const themePreference = useUserStore((state) => state.theme);
  const hasCompletedOnboarding = useUserStore((state) => state.hasCompletedOnboarding);
  const isTourActive = useOnboardingStore((state) => state.isTourActive);
  const currentStep = useOnboardingStore((state) => state.currentStep);
  const startTour = useOnboardingStore((state) => state.startTour);
  const skipTour = useOnboardingStore((state) => state.skipTour);

  const [isSplashComplete, setIsSplashComplete] = useState(false);
  const systemTheme = useNativeColorScheme();
  const activeTheme =
    themePreference === 'light'
      ? 'light'
      : themePreference === 'dark'
      ? 'dark'
      : systemTheme === 'light'
      ? 'light'
      : 'dark';

  const handleStartTour = () => {
    startTour();
    router.push('/(tabs)/workout');
  };

  return (
    <ThemeProvider value={activeTheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <CustomAlert />

      {/* First-Run Interactive Hands-on Onboarding Modal */}
      {isSplashComplete && !hasCompletedOnboarding && (currentStep === 'idle' || currentStep === 'welcome') && (
        <OnboardingModal
          visible={!hasCompletedOnboarding && !isTourActive}
          onStartTour={handleStartTour}
          onSkipTour={skipTour}
        />
      )}

      {/* Animated Splash Screen Overlay */}
      {!isSplashComplete && (
        <SplashScreenOverlay
          isReady={true}
          onAnimationComplete={() => setIsSplashComplete(true)}
        />
      )}
    </ThemeProvider>
  );
}

