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
  dateTextSelected: string;
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
  // Core Surfaces (Deep Contrast Obsidian)
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
  dateTextSelected: '#FFFFFF',
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
  // Core Surfaces (Clean Bionic Athletic Light)
  background: '#F8FAFC',
  cardSurface: '#FFFFFF',
  surfaceHighlight: '#F1F5F9',
  inputSurface: '#FFFFFF',
  borderSubtle: '#E2E8F0',

  // Actions & Brand (Consistent Electric Blue & Athletic Accents)
  primaryAction: '#3B82F6',
  accentLime: '#16A34A',
  accentSecondary: '#3B82F6',
  successBadge: '#16A34A',
  danger: '#EF4444',
  warning: '#F59E0B',
  accent: '#6366F1',

  // Typography (Sharp Slate Hierarchy)
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textPrimaryOnVolt: '#0F172A',

  // Shadows & Elevation
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  elevation: 2,

  // Components & Interactions
  actionIconBg: 'rgba(59, 130, 246, 0.08)',
  tabBar: 'rgba(255, 255, 255, 0.98)',
  overlay: 'rgba(15, 23, 42, 0.5)',
  dateBadgeSelected: '#3B82F6',
  dateTextSelected: '#FFFFFF',
  heroBackground: '#1E293B',
  heroTextSecondary: '#94A3B8',

  // Aliases for seamless backward compatibility
  card: '#FFFFFF',
  border: '#E2E8F0',
  primary: '#3B82F6',
  success: '#16A34A',
  text: '#0F172A',
};

export const theme = {
  dark: darkTheme,
  light: warmLightTheme,
};

export const AppFonts = {
  regular: 'PlusJakartaSans-Regular',
  medium: 'PlusJakartaSans-Medium',
  semiBold: 'PlusJakartaSans-SemiBold',
  bold: 'PlusJakartaSans-Bold',
  extraBold: 'PlusJakartaSans-ExtraBold',
};

export type ThemeMode = 'dark' | 'light';
