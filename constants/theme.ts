/**
 * FitTrack Pro / Workout Tracker Design System Tokens
 * Inspired by Fitbod & Hevy (Modern Dark & Warm Light Themes)
 */

export interface ThemeColors {
  // Core Surfaces
  background: string;
  cardSurface: string;
  surfaceHighlight: string;
  inputSurface: string;
  borderSubtle: string;

  // Actions & Brand
  primaryAction: string;
  successBadge: string;
  danger: string;
  warning: string;
  accent: string;

  // Typography
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textPrimaryOnVolt: string;

  // Shadows & Elevation
  shadowColor: string;
  shadowOpacity: number;

  // Components & Interactions
  actionIconBg: string;
  tabBar: string;
  overlay: string;

  // Backward-compatibility aliases with existing screens
  card: string;
  border: string;
  primary: string;
  success: string;
  text: string;
}

export const darkTheme: ThemeColors = {
  // Core Surfaces
  background: '#0B0C0E',
  cardSurface: '#16181D',
  surfaceHighlight: '#20232B',
  inputSurface: '#0F1015',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',

  // Actions & Brand
  primaryAction: '#3B82F6',
  successBadge: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
  accent: '#6366F1',

  // Typography
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textPrimaryOnVolt: '#FFFFFF',

  // Shadows & Elevation
  shadowColor: 'transparent',
  shadowOpacity: 0,

  // Components & Interactions
  actionIconBg: 'rgba(255, 255, 255, 0.04)',
  tabBar: 'rgba(22, 24, 29, 0.95)',
  overlay: 'rgba(0, 0, 0, 0.7)',

  // Aliases for seamless backward compatibility
  card: '#16181D',
  border: 'rgba(255, 255, 255, 0.08)',
  primary: '#3B82F6',
  success: '#22C55E',
  text: '#FFFFFF',
};

export const warmLightTheme: ThemeColors = {
  // Core Surfaces
  background: '#F8F6F0',
  cardSurface: '#FFFFFF',
  surfaceHighlight: '#EFECE4',
  inputSurface: '#F1EFEA',
  borderSubtle: '#E6E1D7',

  // Actions & Brand
  primaryAction: '#2563EB',
  successBadge: '#15803D',
  danger: '#DC2626',
  warning: '#D97706',
  accent: '#4F46E5',

  // Typography
  textPrimary: '#1C1917',
  textSecondary: '#78716C',
  textMuted: '#A8A29E',
  textPrimaryOnVolt: '#FFFFFF',

  // Shadows & Elevation
  shadowColor: '#4A3B32',
  shadowOpacity: 0.06,

  // Components & Interactions
  actionIconBg: 'rgba(0, 0, 0, 0.04)',
  tabBar: 'rgba(255, 255, 255, 0.95)',
  overlay: 'rgba(28, 25, 23, 0.5)',

  // Aliases for seamless backward compatibility
  card: '#FFFFFF',
  border: '#E6E1D7',
  primary: '#2563EB',
  success: '#15803D',
  text: '#1C1917',
};

export const theme = {
  dark: darkTheme,
  light: warmLightTheme,
};

export type ThemeMode = 'dark' | 'light';
