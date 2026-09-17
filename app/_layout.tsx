import { useState, useEffect } from 'react';
import {
  useFonts,
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
  Barlow_800ExtraBold,
  Barlow_900Black,
} from '@expo-google-fonts/barlow';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import CustomAlert from '@/components/CustomAlert';
import StepMilestoneModal from '@/components/StepMilestoneModal';
import SplashScreenOverlay from '@/components/SplashScreenOverlay';
import { useUserStore } from '@/store/useUserStore';
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
    'Barlow-Regular': Barlow_400Regular,
    'Barlow-Medium': Barlow_500Medium,
    'Barlow-SemiBold': Barlow_600SemiBold,
    'Barlow-Bold': Barlow_700Bold,
    'Barlow-ExtraBold': Barlow_800ExtraBold,
    'Barlow-Black': Barlow_900Black,
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

  return (
    <ThemeProvider value={activeTheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <CustomAlert />
      <StepMilestoneModal />

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

