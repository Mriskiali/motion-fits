import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Vibration, Platform } from 'react-native';

let activePlayer: any = null;
let stopTimerTimeout: any = null;
let fadeInterval: any = null;

type PlaybackStateListener = (isPlaying: boolean) => void;
const playbackListeners = new Set<PlaybackStateListener>();

export function subscribeAudioPlayback(listener: PlaybackStateListener) {
  playbackListeners.add(listener);
  return () => {
    playbackListeners.delete(listener);
  };
}

function notifyPlaybackState(isPlaying: boolean) {
  playbackListeners.forEach((fn) => {
    try {
      fn(isPlaying);
    } catch (e) {}
  });
}

export function isAudioPlaying(): boolean {
  return activePlayer !== null;
}

// Initialize global audio mode
export async function initAudioMode() {
  try {
    await setAudioModeAsync({
      playsInSilentMode: false, // Respect phone silent/vibrate mode: if phone is silent, audio won't play and vibration takes over
      shouldPlayInBackground: true,
      interruptionMode: 'mixWithOthers',
    });
  } catch (e) {
    console.warn('Failed to set audio mode:', e);
  }
}

// Stop any currently playing timer audio
export function stopTimerSound() {
  if (stopTimerTimeout) {
    clearTimeout(stopTimerTimeout);
    stopTimerTimeout = null;
  }
  if (fadeInterval) {
    clearInterval(fadeInterval);
    fadeInterval = null;
  }
  if (activePlayer) {
    try {
      activePlayer.pause();
      activePlayer.remove();
    } catch (e) {}
    activePlayer = null;
  }
  notifyPlaybackState(false);
}

// Play sound safely using a persistent singleton player instance (auto-stops after maxDurationMs, default 10000ms / 10s)
export async function playTimerSound(audioNotification?: string, maxDurationMs: number = 10000) {
  try {
    stopTimerSound();

    if (
      !audioNotification ||
      audioNotification === 'default_notification' ||
      audioNotification === 'library_bell'
    ) {
      activePlayer = createAudioPlayer(require('@/assets/sounds/timerendsound.wav'));
    } else {
      const uri = audioNotification.startsWith('file://') || audioNotification.startsWith('content://') || audioNotification.startsWith('/')
        ? audioNotification
        : `file://${audioNotification}`;
      activePlayer = createAudioPlayer({ uri });
    }

    if (activePlayer) {
      activePlayer.volume = 1.0;
      activePlayer.play();
      notifyPlaybackState(true);

      // Automatically stop playback after maxDurationMs (default 10s) with a 2-second smooth fade-out
      if (maxDurationMs > 0) {
        const fadeDurationMs = 2000;
        const fadeStartMs = Math.max(0, maxDurationMs - fadeDurationMs);

        stopTimerTimeout = setTimeout(() => {
          const steps = 10;
          const stepTime = fadeDurationMs / steps;
          let currentStep = 0;

          fadeInterval = setInterval(() => {
            currentStep++;
            if (activePlayer) {
              try {
                activePlayer.volume = Math.max(0, 1.0 - currentStep / steps);
              } catch (e) {}
            }
            if (currentStep >= steps) {
              stopTimerSound();
            }
          }, stepTime);
        }, fadeStartMs);
      }
    }
  } catch (error) {
    console.warn('Error playing timer sound, falling back to default:', error);
    try {
      activePlayer = createAudioPlayer(require('@/assets/sounds/timerendsound.wav'));
      if (activePlayer) {
        activePlayer.volume = 1.0;
        activePlayer.play();
        notifyPlaybackState(true);
        if (maxDurationMs > 0) {
          stopTimerTimeout = setTimeout(() => {
            stopTimerSound();
          }, maxDurationMs);
        }
      }
    } catch (e) {}
  }
}

// Timer completion vibration: robust multi-pulse vibration for all Android & iOS devices
export function triggerTimerFinishedVibration(hapticsEnabled: boolean = true) {
  if (hapticsEnabled === false) return;

  try {
    // Physical vibration: 500ms on, 200ms off, 500ms on
    Vibration.vibrate([0, 500, 200, 500], false);

    // Also trigger haptic impact with slight delay for linear haptic engines
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      }, 550);
    }
  } catch (e) {
    console.warn('Vibration error:', e);
  }
}

// Countdown tick vibration (3, 2, 1)
export function triggerCountdownTickVibration(hapticsEnabled: boolean = true) {
  if (hapticsEnabled === false) return;

  try {
    Vibration.vibrate(150);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }
  } catch (e) {}
}

// Button tap tactile vibration
export function triggerButtonVibration(hapticsEnabled: boolean = true, duration: number = 60) {
  if (hapticsEnabled === false) return;

  try {
    Vibration.vibrate(duration);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  } catch (e) {}
}
