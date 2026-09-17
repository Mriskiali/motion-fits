import { NativeModules, Platform } from 'react-native';

const { WidgetBridgeModule } = NativeModules;

export interface WidgetData {
  streak?: number;
  weeklyWorkoutsDone?: number;
  weeklyGoal?: number;
  todaySteps?: number;
}

/**
 * Updates the MotionFit Android Home Screen Widget with the latest user metrics.
 * Safe to call on any platform (gracefully no-ops on iOS/web).
 */
export async function updateWidget(data: WidgetData): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    if (WidgetBridgeModule?.updateWidgetData) {
      await WidgetBridgeModule.updateWidgetData(data);
    }
  } catch (err) {
    // Silent fail so it never breaks app experience
    console.warn('[WidgetBridge] Failed to update widget:', err);
  }
}

/**
 * Forces an immediate refresh/redraw of all active MotionFit widgets.
 */
export async function refreshWidget(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    if (WidgetBridgeModule?.refreshWidgets) {
      await WidgetBridgeModule.refreshWidgets();
    }
  } catch (err) {
    console.warn('[WidgetBridge] Failed to refresh widget:', err);
  }
}
