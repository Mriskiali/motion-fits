import { ClerkProvider, useAuth, useUser } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { performFullSync, checkAndRunPendingSync, clearLocalUserData } from '@/services/syncService';
import { getHasPendingSync, resetSyncStateOnLogout } from '@/services/syncState';
import { isPendingSignedIn, clearPendingSignedIn, isPendingSignedOut, clearPendingSignedOut } from '@/services/authIntent';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
import {
  useFonts,
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
  Barlow_800ExtraBold,
  Barlow_900Black,
} from '@expo-google-fonts/barlow';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import CustomAlert from '@/components/CustomAlert';
import StepMilestoneModal from '@/components/StepMilestoneModal';
import SplashScreenOverlay from '@/components/SplashScreenOverlay';
import { useUserStore, loadUserPartition } from '@/store/useUserStore';
import { useWorkoutStore, defaultTemplates, loadWorkoutPartition } from '@/store/useWorkoutStore';
import { useStepStore, loadStepPartition } from '@/store/useStepStore';
import { useColorScheme as useNativeColorScheme, AppState, AppStateStatus } from 'react-native';
import { enableFreeze } from 'react-native-screens';

// Activate react-native-screens' freeze mechanism. Required for `freezeOnBlur` to
// actually take effect (offscreen tabs won't re-render), which keeps tab switching
// and theme/language changes responsive.
enableFreeze(true);

import { useWorkoutBackgroundTracker } from '@/hooks/useWorkoutBackgroundTracker';
import { setupNotificationChannels, requestPermissionsAsync } from '@/utils/notifications';
import { setAudioModeAsync } from 'expo-audio';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

if (!publishableKey) {
  throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Add your key to .env.local.\nRun: 1) clerk auth login  2) clerk link  3) clerk env pull — then restart the dev server.");
}

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
    // Configure audio mode so timer notification sounds and previews are always audible
    setAudioModeAsync({
      playsInSilentMode: true,
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

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <RootLayoutNav />
    </ClerkProvider>
  );
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

  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const segments = useSegments();

  // Keep a ref to the latest user so the auth-transition effect can run purely on
  // sign-in/out changes without re-firing every time Clerk hands us a new user object.
  const userRef = useRef(user);
  userRef.current = user;

  // Mandatory Authentication Guard: user must sign in before accessing the app.
  // This is the SINGLE source of truth for auth navigation.
  const lastRedirectRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    // If Clerk hasn't reported signed-in yet but the sign-in flow has just completed
    // and already navigated optimistically, do NOT bounce the user back to /(auth) —
    // that flap was what made login/logout feel like a multi-second stall.
    if (!isSignedIn && !inAuthGroup && isPendingSignedIn()) {
      return;
    }

    // Symmetric case for sign-out: we've already navigated to /(auth) but Clerk still
    // reports signed-in. Don't bounce the user back to /(tabs) mid sign-out.
    if (isSignedIn && inAuthGroup && isPendingSignedOut()) {
      return;
    }

    const target = !isSignedIn && !inAuthGroup
      ? '/(auth)/sign-in'
      : isSignedIn && inAuthGroup
      ? '/(tabs)'
      : null;

    if (!target) {
      // We've settled into the correct group — clear the pending intent.
      clearPendingSignedIn();
      clearPendingSignedOut();
      lastRedirectRef.current = null;
      return;
    }

    // Avoid issuing redundant redirects (extra router work / animation churn).
    if (lastRedirectRef.current === target) return;
    lastRedirectRef.current = target;
    router.replace(target as any);
  }, [isLoaded, isSignedIn, segments]);

  // Background cloud backup on login & app resume
  useEffect(() => {
    let isCancelled = false;

    const handleAuthTransition = async () => {
      try {
        const currentUser = userRef.current;
        if (isSignedIn && userId) {
          // Load isolated user partitions for this specific user (parallelized)
           await Promise.all([
             loadWorkoutPartition(userId),
             loadStepPartition(userId),
             loadUserPartition(userId),
           ]);
           await AsyncStorage.setItem('lastActiveUserId', userId);

           if (currentUser?.fullName || currentUser?.firstName) {
             const clerkName = currentUser.fullName || currentUser.firstName || '';
             if (clerkName && useUserStore.getState().name !== clerkName) {
               useUserStore.getState().setName(clerkName);
             }
           }

           if (!isCancelled) {
             // Defer sync to run after interactions (screen render complete)
             InteractionManager.runAfterInteractions(() => {
               if (isCancelled) return;
               performFullSync(userId, {
                 email: currentUser?.primaryEmailAddress?.emailAddress,
                 name: currentUser?.fullName || undefined,
               }).catch((err) => {
                 console.warn('[Sync] Auto-sync notice:', err);
               });
             });
           }
        } else if (!isSignedIn) {
          // Pusatkan logout cleanup di clearLocalUserData; hindari unload* langsung
          // untuk mencegah race condition dengan user-initiated signOut di settings.tsx.
          // Fire-and-forget so it never blocks the auth-transition / redirect.
          clearLocalUserData(true).catch(() => {});
        }
      } catch (e) {
        console.warn('[Auth] Error in auth transition:', e);
      }
    };

    handleAuthTransition();

    return () => {
      isCancelled = true;
    };
  }, [isSignedIn, userId]);

  // Automatic sync on app resume or internet recovery (Offline -> Online)
  useEffect(() => {
    if (!isSignedIn || !userId) return;

    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        checkAndRunPendingSync(userId).catch(() => {});
      }
    });

    // Periodic retry every 30 seconds if there are changes pending sync
    const interval = setInterval(() => {
      if (getHasPendingSync()) {
        checkAndRunPendingSync(userId).catch(() => {});
      }
    }, 30000);

    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [isSignedIn, userId]);

  return (
    <ThemeProvider value={activeTheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack>
      <CustomAlert />
      <StepMilestoneModal />

      {/* Animated Splash Screen Overlay */}
      {!isSplashComplete && (
        <SplashScreenOverlay
          isReady={isLoaded}
          onAnimationComplete={() => setIsSplashComplete(true)}
        />
      )}
    </ThemeProvider>
  );
}