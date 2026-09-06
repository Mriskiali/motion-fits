import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import CustomAlert from '@/components/CustomAlert';
import { useUserStore } from '@/store/useUserStore';
import { useColorScheme as useNativeColorScheme } from 'react-native';



import { useWorkoutBackgroundTracker } from '@/hooks/useWorkoutBackgroundTracker';
import { setupNotificationChannels } from '@/utils/notifications';

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
  });

  useEffect(() => {
    setupNotificationChannels().catch(() => {});
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
  const themePreference = useUserStore(state => state.theme);
  const systemTheme = useNativeColorScheme();
  const activeTheme = themePreference === 'light' ? 'light' : (themePreference === 'dark' ? 'dark' : (systemTheme === 'light' ? 'light' : 'dark'));

  return (
    <ThemeProvider value={activeTheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <CustomAlert />
    </ThemeProvider>
  );
}
