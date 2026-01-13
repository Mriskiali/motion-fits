import * as Notifications from 'expo-notifications';
import Toast from 'react-native-toast-message';

// Toast utility functions
export const showToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => {
  Toast.show({
    type,
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: 3000,
    autoHide: true,
    topOffset: 60,
  });
};

export const showSuccessToast = (title: string, message?: string) => {
  showToast('success', title, message);
};

export const showErrorToast = (title: string, message?: string) => {
  showToast('error', title, message);
};

export const showInfoToast = (title: string, message?: string) => {
  showToast('info', title, message);
};

export const showWarningToast = (title: string, message?: string) => {
  showToast('warning', title, message);
};

// Notification scheduling functions
export const scheduleWorkoutReminder = async (date: Date, title: string, body: string) => {
  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        date,
      },
    });
    return identifier;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

export const scheduleDailyReminder = async (hour: number, minute: number, title: string, body: string) => {
  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    });
    return identifier;
  } catch (error) {
    console.error('Error scheduling daily notification:', error);
    return null;
  }
};

export const cancelNotification = async (identifier: string) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
};

export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling all notifications:', error);
  }
};

// Get all scheduled notifications
export const getScheduledNotifications = async () => {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
};