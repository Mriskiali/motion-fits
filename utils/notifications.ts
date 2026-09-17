import { Platform } from 'react-native';
import { useUserStore } from '@/store/useUserStore';

function getNotificationStrings(langOverride?: 'en' | 'id') {
  const lang = langOverride || useUserStore.getState().language || 'en';
  if (lang === 'id') {
    return {
      restFinishedTitle: 'Waktu Istirahat Selesai!',
      restFinishedBody: 'Yuk lanjut set berikutnya, gas terus!',
      activeWorkoutTitle: (name: string) => `Latihan Berjalan: ${name || 'Latihan'}`,
      activeWorkoutBody: 'Sesi latihan masih aktif. Ketuk untuk lanjut.',
      dailyReminderTitle: 'Waktunya Latihan!',
      dailyReminderBody: 'Yuk sempatkan latihan hari ini biar streak kamu tetap terjaga!',
    };
  }
  return {
    restFinishedTitle: 'Rest Time Finished!',
    restFinishedBody: "Time for your next set. Let's crush it!",
    activeWorkoutTitle: (name: string) => `Active Workout: ${name || 'Workout'}`,
    activeWorkoutBody: 'Workout session in progress. Tap to resume.',
    dailyReminderTitle: 'Workout Time!',
    dailyReminderBody: 'Keep your streak going! Time to hit your workout goal today.',
  };
}

let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
  if (Notifications && Notifications.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false, // Foreground audio is played by playTimerSound (expo-audio) to prevent duplicate or system default chime
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
        priority: Notifications?.AndroidNotificationPriority?.MAX,
      }),
    });
  }
} catch (e) {
  // Graceful fallback for Expo Go environment where remote notifications are removed in SDK 53+
  console.warn('expo-notifications is not available in Expo Go. Notifications will work in Development Build / standalone APK.');
}

// Configure Android notification channels
export async function setupNotificationChannels() {
  if (!Notifications) return;
  if (Platform.OS === 'android') {
    try {
      const isId = useUserStore.getState().language === 'id';
      // Explicitly delete previous channels so Android clears old cached channel settings
      await Notifications.deleteNotificationChannelAsync('workout-timer').catch(() => {});
      await Notifications.deleteNotificationChannelAsync('workout-rest-timer-v2').catch(() => {});
      await Notifications.deleteNotificationChannelAsync('workout-rest-timer-v3').catch(() => {});
      await Notifications.deleteNotificationChannelAsync('workout-rest-timer-v4').catch(() => {});
      await Notifications.deleteNotificationChannelAsync('workout-rest-timer-v5').catch(() => {});
      await Notifications.deleteNotificationChannelAsync('workout-rest-timer-silent-v5').catch(() => {});
      await Notifications.deleteNotificationChannelAsync('workout-rest-timer-v6').catch(() => {});
      await Notifications.deleteNotificationChannelAsync('workout-rest-timer-silent-v6').catch(() => {});

      // Channel with vibration (v7):
      // - sound: 'timerendsound.wav' -> plays app's timer end sound when native res/raw asset is available
      // - usage: NOTIFICATION -> obeys phone's ring/notification volume & silent mode, won't blast on alarm stream
      // - bypassDnd: true -> allows vibration motor to run even if phone is in silent/DND mode
      await Notifications.setNotificationChannelAsync('workout-rest-timer-v7', {
        name: isId ? 'Timer Istirahat Latihan' : 'Workout Rest Timer',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#F59E0B',
        enableLights: true,
        enableVibrate: true,
        sound: 'timerendsound.wav',
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
        audioAttributes: {
          usage: Notifications?.AndroidAudioUsage?.NOTIFICATION ?? 5,
          contentType: Notifications?.AndroidAudioContentType?.SONIFICATION ?? 4,
        },
      });

      // Channel without vibration (v7): used when user turns OFF haptics in the app
      await Notifications.setNotificationChannelAsync('workout-rest-timer-silent-v7', {
        name: isId ? 'Timer Istirahat (Tanpa Getar)' : 'Workout Rest Timer (No Vibration)',
        importance: Notifications.AndroidImportance.MAX,
        enableVibrate: false,
        vibrationPattern: null,
        lightColor: '#F59E0B',
        enableLights: true,
        sound: 'timerendsound.wav',
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
        audioAttributes: {
          usage: Notifications?.AndroidAudioUsage?.NOTIFICATION ?? 5,
          contentType: Notifications?.AndroidAudioContentType?.SONIFICATION ?? 4,
        },
      });

      // Channel with vibration & NO audio (mute v7): used when user selects 'Hening' sound
      await Notifications.setNotificationChannelAsync('workout-rest-timer-mute-v7', {
        name: isId ? 'Timer Istirahat (Hening)' : 'Workout Rest Timer (Mute)',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#F59E0B',
        enableLights: true,
        enableVibrate: true,
        sound: null,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      });

      // Channel without vibration & NO audio (silent mute v7)
      await Notifications.setNotificationChannelAsync('workout-rest-timer-silent-mute-v7', {
        name: isId ? 'Timer Istirahat (Hening & Tanpa Getar)' : 'Workout Rest Timer (Mute & No Vibration)',
        importance: Notifications.AndroidImportance.MAX,
        enableVibrate: false,
        vibrationPattern: null,
        lightColor: '#F59E0B',
        enableLights: true,
        sound: null,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
      });

      await Notifications.setNotificationChannelAsync('workout-reminders', {
        name: isId ? 'Pengingat Latihan Harian' : 'Daily Workout Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F59E0B',
        enableLights: true,
        enableVibrate: true,
        sound: undefined,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      await Notifications.setNotificationChannelAsync('active-workout-ongoing', {
        name: isId ? 'Sesi Latihan Berjalan' : 'Active Workout in Progress',
        importance: Notifications.AndroidImportance.LOW,
        enableLights: false,
        enableVibrate: false,
        sound: null,
        showBadge: false,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    } catch (e) {
      console.warn('Error configuring notification channels:', e);
    }
  }
}

const ONGOING_WORKOUT_NOTIFICATION_ID = 'motionfit-active-workout-ongoing';

// Show persistent non-dismissible notification while workout is active in background
export async function showActiveWorkoutNotification(workoutName: string) {
  if (!Notifications) return;
  try {
    await setupNotificationChannels();
    const strings = getNotificationStrings();
    await Notifications.scheduleNotificationAsync({
      identifier: ONGOING_WORKOUT_NOTIFICATION_ID,
      content: {
        title: strings.activeWorkoutTitle(workoutName),
        body: strings.activeWorkoutBody,
        sticky: true, // Non-dismissible: cannot be swiped away until workout finishes
        autoDismiss: false,
        priority: Notifications.AndroidNotificationPriority.LOW,
      },
      trigger: Platform.OS === 'android' ? { channelId: 'active-workout-ongoing' } : null,
    });
  } catch (e) {
    console.warn('Failed to show ongoing workout notification:', e);
  }
}

// Dismiss ongoing workout notification
export async function dismissActiveWorkoutNotification() {
  if (!Notifications) return;
  try {
    await Notifications.dismissNotificationAsync(ONGOING_WORKOUT_NOTIFICATION_ID);
    await Notifications.cancelScheduledNotificationAsync(ONGOING_WORKOUT_NOTIFICATION_ID);
  } catch (e) {}
}

// Request notification permission from user
export async function requestPermissionsAsync(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    await setupNotificationChannels();
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Error requesting notification permissions:', error);
    return false;
  }
}

const REST_TIMER_NOTIFICATION_ID = 'motionfit-rest-timer-finished';
let lastRestTimerNotificationTimestamp = 0;

// Immediately trigger pop-up notification when rest timer completes
export async function showRestTimerFinishedNotification() {
  if (!Notifications) return;
  const now = Date.now();
  // Prevent duplicate notifications firing within 3 seconds
  if (now - lastRestTimerNotificationTimestamp < 3000) {
    return;
  }
  lastRestTimerNotificationTimestamp = now;

  try {
    await setupNotificationChannels();
    const strings = getNotificationStrings();
    const { hapticsEnabled, audioNotification } = useUserStore.getState();
    const isMuted = audioNotification === 'none' || audioNotification === 'silent';
    let channelId = 'workout-rest-timer-v7';
    if (isMuted) {
      channelId = hapticsEnabled ? 'workout-rest-timer-mute-v7' : 'workout-rest-timer-silent-mute-v7';
    } else {
      channelId = hapticsEnabled ? 'workout-rest-timer-v7' : 'workout-rest-timer-silent-v7';
    }

    // Dismiss any previously scheduled notification with this ID first
    await Notifications.dismissNotificationAsync(REST_TIMER_NOTIFICATION_ID).catch(() => {});
    await Notifications.cancelScheduledNotificationAsync(REST_TIMER_NOTIFICATION_ID).catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: REST_TIMER_NOTIFICATION_ID,
      content: {
        title: strings.restFinishedTitle,
        body: strings.restFinishedBody,
        sound: false, // Foreground sound is played by playTimerSound via expo-audio
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: hapticsEnabled ? [0, 500, 250, 500] : undefined,
        data: { type: 'workout-timer' },
      },
      trigger: Platform.OS === 'android' ? { channelId } : null,
    });
  } catch (error) {
    console.warn('Failed to display rest timer popup notification:', error);
  }
}

// Schedule notification for rest timer countdown (for background use)
export async function scheduleRestTimerNotification(seconds: number): Promise<string | null> {
  if (!Notifications || seconds <= 0) return null;
  try {
    await setupNotificationChannels();
    const strings = getNotificationStrings();
    const { hapticsEnabled, audioNotification } = useUserStore.getState();
    const isMuted = audioNotification === 'none' || audioNotification === 'silent';
    let channelId = 'workout-rest-timer-v7';
    if (isMuted) {
      channelId = hapticsEnabled ? 'workout-rest-timer-mute-v7' : 'workout-rest-timer-silent-mute-v7';
    } else {
      channelId = hapticsEnabled ? 'workout-rest-timer-v7' : 'workout-rest-timer-silent-v7';
    }

    // Cancel previous scheduled rest timer notification if any
    await Notifications.cancelScheduledNotificationAsync(REST_TIMER_NOTIFICATION_ID).catch(() => {});

    // Using DATE trigger with exact timestamp so Android AlarmManager fires accurately during Doze / Sleep
    const targetDate = new Date(Date.now() + Math.max(1, Math.round(seconds)) * 1000);

    const id = await Notifications.scheduleNotificationAsync({
      identifier: REST_TIMER_NOTIFICATION_ID,
      content: {
        title: strings.restFinishedTitle,
        body: strings.restFinishedBody,
        sound: isMuted ? false : 'timerendsound.wav',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: hapticsEnabled ? [0, 500, 250, 500] : undefined,
        data: { type: 'workout-timer' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: targetDate,
        channelId,
      },
    });
    return id;
  } catch (error) {
    console.warn('Failed to schedule rest timer notification:', error);
    return null;
  }
}

// Cancel a specific notification
export async function cancelNotification(notificationId: string) {
  if (!Notifications || !notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (e) {
    // Ignore cancellation errors
  }
}

// Dismiss the rest timer notification from tray and cancel any pending scheduled one
export async function dismissRestTimerNotification() {
  if (!Notifications) return;
  try {
    await Notifications.dismissNotificationAsync(REST_TIMER_NOTIFICATION_ID).catch(() => {});
    await Notifications.cancelScheduledNotificationAsync(REST_TIMER_NOTIFICATION_ID).catch(() => {});
  } catch (e) {
    // Ignore errors
  }
}

// Schedule daily workout reminder at given time "HH:mm"
export async function scheduleDailyReminder(timeString: string, langOverride?: 'en' | 'id') {
  if (!Notifications) return;
  try {
    await setupNotificationChannels();
    await cancelAllReminders();

    const [hoursStr, minutesStr] = timeString.split(':');
    const hour = parseInt(hoursStr, 10) || 9;
    const minute = parseInt(minutesStr, 10) || 0;
    const strings = getNotificationStrings(langOverride);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: strings.dailyReminderTitle,
        body: strings.dailyReminderBody,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: 'workout-reminders',
      },
    });
  } catch (error) {
    console.warn('Failed to schedule daily reminder:', error);
  }
}

// Cancel all scheduled reminders
export async function cancelAllReminders() {
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    // Ignore cancellation errors
  }
}
