import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Vibration, Platform } from 'react-native';
import { useUserStore } from '@/store/useUserStore';

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

// Play sound safely using a persistent singleton player instance (auto-stops after durationMs)
export async function playTimerSound(
  audioNotification?: string,
  maxDurationMs?: number,
  startOffsetSecs?: number
) {
  try {
    stopTimerSound();

    if (audioNotification === 'none' || audioNotification === 'silent') {
      return;
    }

    const configuredDuration = useUserStore.getState().customAudioDuration || 5;
    const configuredStartOffset = useUserStore.getState().customAudioStartOffset || 0;

    const durationMs = maxDurationMs !== undefined ? maxDurationMs : Math.max(1000, configuredDuration * 1000);
    const startSecs = startOffsetSecs !== undefined ? startOffsetSecs : Math.max(0, configuredStartOffset);

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
      if (startSecs > 0) {
        try {
          if (typeof activePlayer.seekTo === 'function') {
            await activePlayer.seekTo(startSecs);
          } else if ('currentTime' in activePlayer) {
            activePlayer.currentTime = startSecs;
          }
        } catch (seekErr) {
          console.warn('Could not seek player to offset:', seekErr);
        }
      }
      activePlayer.play();
      notifyPlaybackState(true);

      // Automatically stop playback after durationMs with a smooth fade-out
      if (durationMs > 0) {
        const fadeDurationMs = Math.min(1500, Math.floor(durationMs * 0.3));
        const fadeStartMs = Math.max(0, durationMs - fadeDurationMs);

        stopTimerTimeout = setTimeout(() => {
          const steps = 10;
          const stepTime = Math.max(20, fadeDurationMs / steps);
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
        const fallbackDuration = maxDurationMs || 5000;
        stopTimerTimeout = setTimeout(() => {
          stopTimerSound();
        }, fallbackDuration);
      }
    } catch (e) {}
  }
}

// Play preview sound with explicit duration and start offset in seconds
export async function playPreviewSound(
  audioNotification?: string,
  durationSeconds?: number,
  startOffsetSeconds?: number
) {
  const userDuration = durationSeconds ?? useUserStore.getState().customAudioDuration ?? 5;
  const userStart = startOffsetSeconds ?? useUserStore.getState().customAudioStartOffset ?? 0;
  const durationMs = Math.max(1000, userDuration * 1000);
  await playTimerSound(audioNotification, durationMs, userStart);
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
