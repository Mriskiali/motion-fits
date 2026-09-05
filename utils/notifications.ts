// Stubbed to prevent any native crashes
export async function requestPermissionsAsync() {
  return false;
}

export async function scheduleRestTimerNotification(seconds: number) {
  return null;
}

export async function cancelNotification(notificationId: string) {
  // no-op
}

export async function scheduleDailyReminder(timeString: string) {
  // no-op
}

export async function cancelAllReminders() {
  // no-op
}
