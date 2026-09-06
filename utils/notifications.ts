import { Platform } from 'react-native';

let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
  if (Notifications && Notifications.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
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
      await Notifications.setNotificationChannelAsync('workout-timer', {
        name: 'Workout Rest Timer',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#3B82F6',
        enableLights: true,
        enableVibrate: true,
        sound: 'default',
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      });

      await Notifications.setNotificationChannelAsync('workout-reminders', {
        name: 'Daily Workout Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
        enableLights: true,
        enableVibrate: true,
        sound: 'default',
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      await Notifications.setNotificationChannelAsync('active-workout-ongoing', {
        name: 'Active Workout in Progress',
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
    await Notifications.scheduleNotificationAsync({
      identifier: ONGOING_WORKOUT_NOTIFICATION_ID,
      content: {
        title: `Active Workout: ${workoutName || 'Workout'}`,
        body: 'Workout session in progress. Tap to resume.',
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

// Immediately trigger pop-up notification when rest timer completes
export async function showRestTimerFinishedNotification() {
  if (!Notifications) return;
  try {
    await setupNotificationChannels();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Rest Time Finished!',
        body: 'Time for your next set. Stay strong!',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 500, 250, 500],
      },
      trigger: Platform.OS === 'android' ? { channelId: 'workout-timer' } : null,
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
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Rest Time Finished!',
        body: 'Time for your next set. Stay strong!',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
        repeats: false,
        channelId: 'workout-timer',
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

// Schedule daily workout reminder at given time "HH:mm"
export async function scheduleDailyReminder(timeString: string) {
  if (!Notifications) return;
  try {
    await setupNotificationChannels();
    await cancelAllReminders();

    const [hoursStr, minutesStr] = timeString.split(':');
    const hour = parseInt(hoursStr, 10) || 9;
    const minute = parseInt(minutesStr, 10) || 0;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Workout Time!',
        body: 'Keep your streak going! Time to hit your workout goal today.',
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
