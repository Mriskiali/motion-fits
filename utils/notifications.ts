import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Set notification handler to display notification pop-ups and play sound even when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Configure Android notification channels
export async function setupNotificationChannels() {
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
        showBadge: false,
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
      });
    } catch (e) {
      console.warn('Error configuring notification channels:', e);
    }
  }
}

// Request notification permission from user
export async function requestPermissionsAsync(): Promise<boolean> {
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

// Schedule notification for rest timer countdown
export async function scheduleRestTimerNotification(seconds: number): Promise<string | null> {
  if (seconds <= 0) return null;
  try {
    await setupNotificationChannels();
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Rest Time Finished!',
        body: 'Time for your next set. Stay strong!',
        sound: true,
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
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (e) {
    // Ignore cancellation errors
  }
}

// Schedule daily workout reminder at given time "HH:mm"
export async function scheduleDailyReminder(timeString: string) {
  try {
    await setupNotificationChannels();
    await cancelAllReminders();

    const [hoursStr, minutesStr] = timeString.split(':');
    const hour = parseInt(hoursStr, 10) || 9;
    const minute = parseInt(minutesStr, 10) || 0;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💪 Workout Time!',
        body: 'Keep your streak going! Time to hit your workout goal today.',
        sound: true,
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
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    // Ignore cancellation errors
  }
}
