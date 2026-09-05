/**
 * Bionic Health & Warm Wellness Design Tokens
 * Full Dynamic Dual-Theme Architecture (Modern Dark & Warm Light)
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
  accentLime: string;
  accentSecondary: string;
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
  shadowRadius: number;
  elevation: number;

  // Components & Interactions
  actionIconBg: string;
  tabBar: string;
  overlay: string;
  dateBadgeSelected: string;
  heroBackground: string;
  heroTextSecondary: string;

  // Backward-compatibility aliases
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
  accentLime: '#B7F34D',
  accentSecondary: '#22C55E',
  successBadge: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
  accent: '#6366F1',

  // Typography
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textPrimaryOnVolt: '#0B0C0E',

  // Shadows & Elevation
  shadowColor: 'transparent',
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,

  // Components & Interactions
  actionIconBg: 'rgba(255, 255, 255, 0.06)',
  tabBar: 'rgba(22, 24, 29, 0.95)',
  overlay: 'rgba(0, 0, 0, 0.75)',
  dateBadgeSelected: '#3B82F6',
  heroBackground: '#132A1E',
  heroTextSecondary: '#A7F3D0',

  // Aliases for seamless backward compatibility
  card: '#16181D',
  border: 'rgba(255, 255, 255, 0.08)',
  primary: '#3B82F6',
  success: '#22C55E',
  text: '#FFFFFF',
};

export const warmLightTheme: ThemeColors = {
  // Core Surfaces (Warm Wellness & Sage Tinted)
  background: '#F4F6F2',
  cardSurface: '#FFFFFF',
  surfaceHighlight: '#EFECE4',
  inputSurface: '#F1EFEA',
  borderSubtle: '#E6E1D7',

  // Actions & Brand
  primaryAction: '#1B4D3E', // Forest Emerald Primary
  accentLime: '#9EE837', // High Energy Lime
  accentSecondary: '#1B4D3E',
  successBadge: '#15803D',
  danger: '#DC2626',
  warning: '#D97706',
  accent: '#4F46E5',

  // Typography
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textPrimaryOnVolt: '#111827',

  // Shadows & Elevation
  shadowColor: '#1A2E20',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  elevation: 2,

  // Components & Interactions
  actionIconBg: 'rgba(27, 77, 62, 0.06)',
  tabBar: 'rgba(255, 255, 255, 0.95)',
  overlay: 'rgba(19, 42, 30, 0.4)',
  dateBadgeSelected: '#EAE5D9',
  heroBackground: '#132A1E',
  heroTextSecondary: '#A7F3D0',

  // Aliases for seamless backward compatibility
  card: '#FFFFFF',
  border: '#E6E1D7',
  primary: '#1B4D3E',
  success: '#15803D',
  text: '#111827',
};

export const theme = {
  dark: darkTheme,
  light: warmLightTheme,
};

export type ThemeMode = 'dark' | 'light';
