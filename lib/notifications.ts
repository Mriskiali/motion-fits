import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Avoid top-level import of expo-notifications in Expo Go (SDK 53+), use dynamic import.
// Shared type for Goals & Reminders feature
export type GoalsSettings = {
  weeklyTarget: number; // 0-7 sessions
  preferredDays: number[]; // 0=Sun ... 6=Sat
  remindersEnabled: boolean;
  reminderTime: string; // "HH:mm"
  scheduledNotificationIds: string[];
  updatedAt: number;
};

export const DEFAULT_GOALS_SETTINGS: GoalsSettings = {
  weeklyTarget: 3,
  preferredDays: [1, 3, 5], // Mon, Wed, Fri
  remindersEnabled: false,
  reminderTime: '18:00',
  scheduledNotificationIds: [],
  updatedAt: Date.now(),
};

// Detect Expo Go to gate notifications API usage
const isExpoGo = Constants?.appOwnership === 'expo';

// Dynamically load expo-notifications only when supported
async function getNotificationsModule(): Promise<any | null> {
  if (isExpoGo) return null;
  try {
    const mod = await import('expo-notifications');
    return mod;
  } catch (e) {
    console.log('expo-notifications dynamic import failed', e);
    return null;
  }
}
// Configure Android channel for reminders
export async function configureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  if (isExpoGo) {
    // Expo Go: skip channel setup to avoid unsupported push token registration warnings
    return;
  }
  try {
    const Notifications = await getNotificationsModule();
    if (!Notifications) return;
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Workout Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#64b5f6',
      sound: 'default',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  } catch (e) {
    console.log('configureAndroidChannel error', e);
  }
}
// Ask for permissions (gracefully) and return granted boolean
export async function ensurePermissions(): Promise<boolean> {
  if (isExpoGo) {
    // Expo Go: push tokens unsupported; avoid prompting in Expo Go
    return false;
  }
  try {
    const Notifications = await getNotificationsModule();
    if (!Notifications) return false;
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.log('ensurePermissions error', e);
    return false;
  }
}
// Cancel a batch of scheduled notifications by id
export async function cancelScheduled(ids: string[]) {
  if (isExpoGo) return;
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;
  for (const id of ids || []) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (e) {
      console.log('cancelScheduled error for', id, e);
    }
  }
}
// Parse "HH:mm" to { hour, minute }
function parseTime(time: string): { hour: number; minute: number } {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
  if (!m) return { hour: 18, minute: 0 };
  return { hour: parseInt(m[1], 10), minute: parseInt(m[2], 10) };
}

// Get start of week (Sunday) for a given date (local time)
function getWeekStartSunday(d: Date): Date {
  const x = new Date(d);
  x.setSeconds(0, 0);
  x.setMinutes(0);
  x.setHours(0);
  const day = x.getDay(); // 0-6, 0=Sun
  x.setDate(x.getDate() - day);
  return x;
}

// Build candidate reminder Date objects for next N weeks for preferred days/time
function buildReminderDates(settings: GoalsSettings, weeks: number = 8): Date[] {
  const now = new Date();
  const result: Date[] = [];
  const { hour, minute } = parseTime(settings.reminderTime);

  for (let w = 0; w < weeks; w++) {
    const start = getWeekStartSunday(new Date(now.getFullYear(), now.getMonth(), now.getDate() + w * 7));
    for (const day of settings.preferredDays) {
      const dt = new Date(start);
      dt.setDate(start.getDate() + day);
      dt.setHours(hour, minute, 0, 0);
      if (dt.getTime() > now.getTime()) {
        result.push(dt);
      }
    }
  }

  // Sort ascending
  result.sort((a, b) => a.getTime() - b.getTime());
  return result;
}

// Compat helper: construct the new 'date' trigger shape while satisfying current TypeScript types.
// This avoids deprecation warnings in SDK 53+ while compiling against older NotificationTriggerInput unions.
function makeDateTrigger(when: Date): any {
  return { type: 'date', date: when };
}
// Schedule one-shot local notifications for each candidate date/time.
// Returns newly scheduled IDs. Idempotency should be handled by caller (cancel old, then schedule new).
export async function scheduleWeeklyReminders(settings: GoalsSettings): Promise<string[]> {
  if (!settings.remindersEnabled) return [];
  if (!settings.preferredDays || settings.preferredDays.length === 0) return [];
  if (isExpoGo) {
    // Expo Go: skip scheduling to avoid warnings/errors; use a development build for reminders
    return [];
  }

  const Notifications = await getNotificationsModule();
  if (!Notifications) return [];

  const dates = buildReminderDates(settings, 8);
  const ids: string[] = [];

  if (Platform.OS === 'android') {
    await configureAndroidChannel();
  }

  for (const when of dates) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Time to Train',
          body: 'Stay consistent. Your workout is scheduled now.',
          sound: 'default',
        },
        trigger: makeDateTrigger(when),
      });
      ids.push(id);
    } catch (e) {
      console.log('scheduleNotification error', e);
    }
  }

  return ids;
}
// Return the next upcoming reminder Date based on current settings (without querying scheduled registry)
export function getNextReminderSummary(settings: GoalsSettings): Date | null {
  if (!settings.remindersEnabled) return null;
  if (!settings.preferredDays || settings.preferredDays.length === 0) return null;
  const dates = buildReminderDates(settings, 2); // next 2 weeks should be sufficient to find the next
  return dates[0] || null;
}