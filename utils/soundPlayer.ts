import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { Vibration, Platform } from 'react-native';
import { useUserStore } from '@/store/useUserStore';

let activePlayer: any = null;
let currentSessionId = 0;
let stopTimerTimeout: any = null;
let fadeInterval: any = null;
let cachedDefaultSource: any = null;

type PlaybackStateListener = (isPlaying: boolean, durationSeconds?: number) => void;
const playbackListeners = new Set<PlaybackStateListener>();

export function subscribeAudioPlayback(listener: PlaybackStateListener) {
  playbackListeners.add(listener);
  return () => {
    playbackListeners.delete(listener);
  };
}

function notifyPlaybackState(isPlaying: boolean, durationSeconds?: number) {
  playbackListeners.forEach((fn) => {
    try {
      fn(isPlaying, durationSeconds);
    } catch (e) {}
  });
}

export function isAudioPlaying(): boolean {
  return activePlayer !== null;
}

// Resolve and preload default sound asset to guaranteed local file
export async function getDefaultSoundSource(): Promise<any> {
  if (cachedDefaultSource) return cachedDefaultSource;
  try {
    const asset = Asset.fromModule(require('@/assets/sounds/timerendsound.wav'));
    if (!asset.localUri) {
      await asset.downloadAsync();
    }
    if (asset.localUri) {
      cachedDefaultSource = { uri: asset.localUri };
      return cachedDefaultSource;
    }
  } catch (e) {
    console.warn('[soundPlayer] Asset download failed, using module require:', e);
  }
  return require('@/assets/sounds/timerendsound.wav');
}

// Initialize global audio mode - playsInSilentMode: true ensures timer alarms and previews are always heard
export async function initAudioMode() {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true, // Always allow timer alarms and sound previews to be audible
      shouldPlayInBackground: true,
      interruptionMode: 'mixWithOthers',
    });
  } catch (e) {
    console.warn('[soundPlayer] Failed to set audio mode:', e);
  }
}

// Stop any currently playing timer audio
export function stopTimerSound() {
  currentSessionId++; // Invalidate any ongoing asynchronous playback attempts
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
      if (typeof activePlayer.pause === 'function') activePlayer.pause();
      if (typeof activePlayer.remove === 'function') activePlayer.remove();
    } catch (e) {}
    activePlayer = null;
  }
  notifyPlaybackState(false);
}

// Play sound safely using a persistent singleton player instance (auto-stops after durationMs)
export async function playTimerSound(
  audioNotification?: string,
  maxDurationMs?: number,
  startOffsetSecs?: number,
  isPreview: boolean = false
) {
  stopTimerSound();
  const sessionId = ++currentSessionId;

  try {
    if (audioNotification === 'none' || audioNotification === 'silent') {
      return;
    }

    // Ensure audio mode allows audible playback
    await initAudioMode();
    if (sessionId !== currentSessionId) return;

    const isDefault =
      !audioNotification ||
      audioNotification === 'default_notification' ||
      audioNotification === 'library_bell';

    const configuredDuration = useUserStore.getState().customAudioDuration || 5;
    const configuredStartOffset = useUserStore.getState().customAudioStartOffset || 0;

    // Default sound is a short bell chime (~1.5s), durationMs 5s max, start offset ALWAYS 0
    const durationMs =
      maxDurationMs !== undefined
        ? maxDurationMs
        : (isDefault ? 5000 : Math.max(1000, configuredDuration * 1000));
    const startSecs = isDefault
      ? 0
      : (startOffsetSecs !== undefined ? startOffsetSecs : Math.max(0, configuredStartOffset));

    let createdPlayer: any = null;

    if (isDefault) {
      const source = await getDefaultSoundSource();
      if (sessionId !== currentSessionId) return;
      createdPlayer = createAudioPlayer(source);
    } else {
      let uri = audioNotification.trim();
      if (uri.startsWith('/')) {
        uri = `file://${uri}`;
      } else if (
        !uri.startsWith('file://') &&
        !uri.startsWith('content://') &&
        !uri.startsWith('http://') &&
        !uri.startsWith('https://')
      ) {
        uri = `file://${uri}`;
      }

      // Check if file exists on disk if it's a file:// URI
      if (uri.startsWith('file://')) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri);
          if (fileInfo && fileInfo.exists === false) {
            console.warn('[soundPlayer] Custom audio file does not exist at URI:', uri);
            if (isPreview) {
              // In preview mode: NEVER fall back to default sound!
              notifyPlaybackState(false);
              return;
            }
            throw new Error('Custom audio file does not exist');
          }
        } catch (fileErr) {
          console.warn('[soundPlayer] Note on file existence check, proceeding to playback:', fileErr);
        }
      }

      if (sessionId !== currentSessionId) return;
      createdPlayer = createAudioPlayer({ uri });
    }

    if (sessionId !== currentSessionId) {
      if (createdPlayer) {
        try { createdPlayer.remove(); } catch (e) {}
      }
      return;
    }

    if (!createdPlayer) {
      if (isPreview) {
        notifyPlaybackState(false);
        return;
      }
      throw new Error('Could not create audio player');
    }

    activePlayer = createdPlayer;
    activePlayer.volume = 1.0;

    // Only seek if custom audio and startSecs > 0
    if (!isDefault && startSecs > 0) {
      try {
        if (typeof activePlayer.seekTo === 'function') {
          await activePlayer.seekTo(startSecs);
        } else if ('currentTime' in activePlayer) {
          activePlayer.currentTime = startSecs;
        }
      } catch (seekErr) {
        console.warn('[soundPlayer] Could not seek player to offset:', seekErr);
      }
    }

    if (sessionId !== currentSessionId) {
      try {
        if (typeof activePlayer.pause === 'function') activePlayer.pause();
        if (typeof activePlayer.remove === 'function') activePlayer.remove();
      } catch (e) {}
      activePlayer = null;
      return;
    }

    if (activePlayer && typeof activePlayer.play === 'function') {
      activePlayer.play();
      const durationSecs = Math.max(1, Math.round(durationMs / 1000));
      notifyPlaybackState(true, durationSecs);

      // Automatically stop playback after durationMs with a smooth fade-out
      if (durationMs > 0) {
        const fadeDurationMs = Math.min(1500, Math.floor(durationMs * 0.3));
        const fadeStartMs = Math.max(0, durationMs - fadeDurationMs);

        stopTimerTimeout = setTimeout(() => {
          if (sessionId !== currentSessionId) return;
          const steps = 10;
          const stepTime = Math.max(20, fadeDurationMs / steps);
          let currentStep = 0;

          fadeInterval = setInterval(() => {
            if (sessionId !== currentSessionId) {
              if (fadeInterval) clearInterval(fadeInterval);
              fadeInterval = null;
              return;
            }
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
    console.warn('[soundPlayer] Error playing timer sound:', error);
    if (isPreview) {
      // IN PREVIEW: NEVER FALL BACK TO DEFAULT SOUND!
      notifyPlaybackState(false);
      return;
    }
    // Only in background / workout session fallback to default sound so the user doesn't miss the timer
    try {
      if (sessionId !== currentSessionId) return;
      const defaultSource = await getDefaultSoundSource();
      if (sessionId !== currentSessionId) return;
      const fallbackPlayer = createAudioPlayer(defaultSource);
      if (fallbackPlayer && typeof fallbackPlayer.play === 'function') {
        activePlayer = fallbackPlayer;
        activePlayer.volume = 1.0;
        activePlayer.play();
        notifyPlaybackState(true, 5);
        const fallbackDuration = maxDurationMs || 5000;
        stopTimerTimeout = setTimeout(() => {
          if (sessionId === currentSessionId) {
            stopTimerSound();
          }
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
  const isDefault =
    !audioNotification ||
    audioNotification === 'default_notification' ||
    audioNotification === 'library_bell';

  const userDuration =
    durationSeconds !== undefined
      ? durationSeconds
      : (isDefault ? 5 : (useUserStore.getState().customAudioDuration || 5));

  const userStart = isDefault
    ? 0
    : (startOffsetSeconds !== undefined
        ? startOffsetSeconds
        : (useUserStore.getState().customAudioStartOffset || 0));

  const durationMs = Math.max(1000, userDuration * 1000);
  await playTimerSound(audioNotification, durationMs, userStart, true /* isPreview */);
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

// Button tap tactile vibration - uses crisp zero-latency micro-haptics on both iOS and Android
export function triggerButtonVibration(hapticsEnabled: boolean = true, duration: number = 40) {
  if (hapticsEnabled === false) return;

  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      // Fallback only if native haptics engine is unavailable
      try {
        Vibration.vibrate(duration);
      } catch (e) {}
    });
  } catch (e) {}
}
