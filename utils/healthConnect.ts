import { Platform, Linking } from 'react-native';
import {
  initialize,
  getSdkStatus,
  requestPermission,
  getGrantedPermissions,
  aggregateRecord,
  openHealthConnectSettings,
  SdkAvailabilityStatus,
  Permission,
} from 'react-native-health-connect';

export type HealthConnectAvailability =
  | 'available'
  | 'update_required'
  | 'unavailable'
  | 'unsupported_platform'
  | 'not_installed_or_unlinked';

export interface AvailabilityResult {
  available: boolean;
  status: HealthConnectAvailability;
  message?: string;
}

const HEALTH_CONNECT_PACKAGE = 'com.google.android.apps.healthdata';
const HEALTH_CONNECT_PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${HEALTH_CONNECT_PACKAGE}`;

/**
 * Checks whether Google Health Connect SDK is supported and available on this device.
 */
export async function checkHealthConnectAvailability(): Promise<AvailabilityResult> {
  if (Platform.OS !== 'android') {
    return {
      available: false,
      status: 'unsupported_platform',
      message: 'Google Health Connect is only supported on Android devices.',
    };
  }

  try {
    const status = await getSdkStatus();
    if (status === SdkAvailabilityStatus.SDK_AVAILABLE) {
      return { available: true, status: 'available' };
    } else if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
      return {
        available: false,
        status: 'update_required',
        message: 'Google Health Connect requires an update.',
      };
    } else {
      return {
        available: false,
        status: 'unavailable',
        message: 'Google Health Connect is not available on this device.',
      };
    }
  } catch (error: any) {
    return {
      available: false,
      status: 'not_installed_or_unlinked',
      message: error?.message || 'Health Connect native module is not linked or not installed.',
    };
  }
}

/**
 * Initializes Health Connect SDK safely.
 */
export async function initializeHealthConnect(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    return await initialize();
  } catch {
    return false;
  }
}

/**
 * Opens Google Play Store to install or update Health Connect app.
 */
export async function openHealthConnectStore(): Promise<void> {
  try {
    const marketUrl = `market://details?id=${HEALTH_CONNECT_PACKAGE}`;
    const canOpen = await Linking.canOpenURL(marketUrl);
    if (canOpen) {
      await Linking.openURL(marketUrl);
    } else {
      await Linking.openURL(HEALTH_CONNECT_PLAY_STORE_URL);
    }
  } catch (error) {
    console.warn('Could not open Health Connect in Play Store:', error);
  }
}

/**
 * Opens the Android Health Connect settings screen.
 */
export function openHealthConnectSettingsSafe(): void {
  if (Platform.OS !== 'android') return;
  try {
    openHealthConnectSettings();
  } catch (error) {
    console.warn('Could not open Health Connect settings:', error);
  }
}

const STEP_READ_PERMISSION: Permission = {
  accessType: 'read',
  recordType: 'Steps',
};

/**
 * Checks if the user has already granted permission to read steps.
 */
export async function checkStepPermissionGranted(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const isInit = await initializeHealthConnect();
    if (!isInit) return false;

    const permissions = await getGrantedPermissions();
    return permissions.some(
      (perm) => perm.recordType === 'Steps' && perm.accessType === 'read'
    );
  } catch {
    return false;
  }
}

/**
 * Requests permission from the user to read steps.
 */
export async function requestStepPermissionSafe(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const isInit = await initializeHealthConnect();
    if (!isInit) return false;

    const granted = await requestPermission([STEP_READ_PERMISSION]);
    return granted.some(
      (perm) => perm.recordType === 'Steps' && perm.accessType === 'read'
    );
  } catch (error) {
    console.warn('Error requesting Health Connect step permission:', error);
    return false;
  }
}

/**
 * Fetches total steps taken today (from 00:00:00 local time to now).
 */
export async function fetchTodayStepsFromHealthConnect(): Promise<number> {
  if (Platform.OS !== 'android') return 0;
  try {
    const isInit = await initializeHealthConnect();
    if (!isInit) return 0;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const now = new Date();

    const response = await aggregateRecord({
      recordType: 'Steps',
      timeRangeFilter: {
        operator: 'between',
        startTime: startOfDay.toISOString(),
        endTime: now.toISOString(),
      },
    });

    return Math.round(response.COUNT_TOTAL || 0);
  } catch (error) {
    console.warn('Failed to aggregate today steps:', error);
    return 0;
  }
}

/**
 * Fetches historical steps per day for the last `days` days from Health Connect.
 * Returns a dictionary mapping 'YYYY-MM-DD' to total steps on that day.
 */
export async function fetchStepsHistoryFromHealthConnect(days: number = 14): Promise<Record<string, number>> {
  if (Platform.OS !== 'android') return {};
  const history: Record<string, number> = {};

  try {
    const isInit = await initializeHealthConnect();
    if (!isInit) return {};

    const now = new Date();

    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${date}`;

      const startOfDay = new Date(d);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(d);
      if (i === 0) {
        endOfDay.setTime(now.getTime());
      } else {
        endOfDay.setHours(23, 59, 59, 999);
      }

      try {
        const response = await aggregateRecord({
          recordType: 'Steps',
          timeRangeFilter: {
            operator: 'between',
            startTime: startOfDay.toISOString(),
            endTime: endOfDay.toISOString(),
          },
        });
        history[dateKey] = Math.round(response.COUNT_TOTAL || 0);
      } catch {
        // Individual day fail, keep going
      }
    }
  } catch (err) {
    console.warn('Failed to fetch steps history from Health Connect:', err);
  }

  return history;
}
