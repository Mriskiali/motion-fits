import { Platform } from 'react-native';

let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  console.warn('expo-notifications is not available in this environment');
}

export async function requestPermissionsAsync() {
  if (!Notifications) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  return finalStatus === 'granted';
}

export async function scheduleDailyReminder(timeString: string) {
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  
  // timeString is expected to be 'HH:mm'
  const [hours, minutes] = timeString.split(':').map(Number);
  
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Workout Time! 💪",
      body: "It's time for your daily workout. Let's get moving!",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      channelId: 'default',
      hour: hours,
      minute: minutes,
      repeats: true,
    } as any,
  });
}

export async function cancelAllReminders() {
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleRestTimerNotification(seconds: number): Promise<string | null> {
  if (!Notifications) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: "Rest Complete! ⏱️",
        body: "Time's up! Get ready for your next set.",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        channelId: 'default',
        seconds: seconds,
      },
    });
  } catch (e) {
    console.warn('Failed to schedule rest timer notification', e);
    return null;
  }
}

export async function cancelNotification(id: string) {
  if (!Notifications || !id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (e) {
    console.warn('Failed to cancel notification', e);
  }
}
