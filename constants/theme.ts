/**
 * Bionic Health & Warm Wellness Design Tokens
 * Full Dynamic Dual-Theme Architecture (Modern Dark & Warm Light)
 */

export interface ThemeColors {
  // Mode flag
  isDark: boolean;

  // Core Surfaces
  background: string;
  cardSurface: string;
  surfaceHighlight: string;
  elevatedSurface: string;
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
  isDark: true,

  // Core Surfaces (Obsidian Stealth & Kinetic Volt specification)
  background: '#090A0F',
  cardSurface: '#12131A',
  surfaceHighlight: '#1A1B24',
  elevatedSurface: '#1A1B24',
  inputSurface: '#1A1B24',
  borderSubtle: 'rgba(255, 255, 255, 0.06)',

  // Actions & Brand
  primaryAction: '#F59E0B',
  accentLime: '#10B981',
  accentSecondary: '#F97316',
  successBadge: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  accent: '#F59E0B',

  // Typography (Slate hierarchy)
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textPrimaryOnVolt: '#000000',

  // Shadows & Elevation
  shadowColor: '#000000',
  shadowOpacity: 0.5,
  shadowRadius: 12,
  elevation: 4,

  // Components & Interactions
  actionIconBg: 'rgba(245, 158, 11, 0.12)',
  tabBar: 'rgba(18, 19, 26, 0.96)',
  overlay: 'rgba(9, 10, 15, 0.85)',
  dateBadgeSelected: '#F59E0B',
  dateTextSelected: '#000000',
  heroBackground: '#12131A',
  heroTextSecondary: '#94A3B8',

  // Aliases for seamless backward compatibility
  card: '#12131A',
  border: 'rgba(255, 255, 255, 0.06)',
  primary: '#F59E0B',
  success: '#10B981',
  text: '#F1F5F9',
};

export const warmLightTheme: ThemeColors = {
  isDark: false,

  // Core Surfaces (Warm organic cream/linen tones - comforting and natural)
  background: '#F8F6F0',
  cardSurface: '#FFFFFF',
  surfaceHighlight: '#EFECE4',
  elevatedSurface: '#FFFFFF',
  inputSurface: '#FFFFFF',
  borderSubtle: '#E4DFD5',

  // Actions & Brand (Warm deep amber & forest/terracotta athletic tones)
  primaryAction: '#D97706',
  accentLime: '#059669',
  accentSecondary: '#EA580C',
  successBadge: '#059669',
  danger: '#DC2626',
  warning: '#D97706',
  accent: '#EA580C',

  // Typography (Warm Espresso / Deep Charcoal)
  textPrimary: '#24211D',
  textSecondary: '#6B655C',
  textMuted: '#9B9488',
  textPrimaryOnVolt: '#24211D',

  // Shadows & Elevation
  shadowColor: '#24211D',
  shadowOpacity: 0.05,
  shadowRadius: 10,
  elevation: 2,

  // Components & Interactions
  actionIconBg: 'rgba(217, 119, 6, 0.1)',
  tabBar: 'rgba(255, 255, 255, 0.97)',
  overlay: 'rgba(36, 33, 29, 0.45)',
  dateBadgeSelected: '#D97706',
  dateTextSelected: '#FFFFFF',
  heroBackground: '#2E2923',
  heroTextSecondary: '#D7CFC5',

  // Aliases for seamless backward compatibility
  card: '#FFFFFF',
  border: '#E4DFD5',
  primary: '#D97706',
  success: '#059669',
  text: '#24211D',
};

export const theme = {
  dark: darkTheme,
  light: warmLightTheme,
};

export const AppFonts = {
  regular: 'Barlow-Regular',
  medium: 'Barlow-Medium',
  semiBold: 'Barlow-SemiBold',
  bold: 'Barlow-Bold',
  extraBold: 'Barlow-ExtraBold',
  black: 'Barlow-Black',
};

/**
 * Harmonized Typography Scale (Apple Human Interface & Bionic Design)
 * Balanced: not too large, not too small. Never below 10px.
 */
export const AppFontSize = {
  // Screen Titles (Header Bar on Tab Screens)
  screenTitle: 24,

  // Section & Modal Titles
  modalTitle: 18,
  sectionTitle: 16,
  cardTitle: 15,

  // Body & Inputs
  bodyLarge: 14,
  body: 13,

  // Secondary Text & Captions
  subtext: 12,
  caption: 11,
  micro: 10, // Strictly for dense matrices/heatmaps only

  // Numeric Stats / Tabular Metrics
  metricHero: 24,
  metricLarge: 20,
  metricMedium: 16,
  metricUnit: 12,
};

export const AppRadius = {
  sheet: 16,        // rounded-2xl (cards & bottom sheets)
  card: 16,         // rounded-2xl
  interactive: 12,  // rounded-xl (rows, inputs, tactile controls)
  input: 10,        // rounded-lg
  pill: 6,          // rounded-md (status tags & micro badges)
  full: 9999,       // rounded-full (chips & round indicators)
};

export type ThemeMode = 'dark' | 'light';
