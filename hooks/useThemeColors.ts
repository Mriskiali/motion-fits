import { useMemo } from 'react';
import { useColorScheme as useNativeColorScheme, StyleSheet } from 'react-native';
import { useUserStore } from '@/store/useUserStore';
import { theme, ThemeColors, ThemeMode } from '@/constants/theme';

export type { ThemeColors, ThemeMode };

/**
 * Hook to retrieve active ThemeColors tokens.
 */
export function useThemeColors(): ThemeColors {
  const themePreference = useUserStore((state) => state.theme);
  const systemTheme = useNativeColorScheme();

  const activeTheme: ThemeMode =
    themePreference === 'light'
      ? 'light'
      : themePreference === 'dark'
      ? 'dark'
      : systemTheme === 'light'
      ? 'light'
      : 'dark';

  return theme[activeTheme] || theme.dark;
}

/**
 * Hook to create dynamic StyleSheet.NamedStyles based on current theme tokens.
 * Automatically recalculates and caches styles when the active theme mode changes.
 *
 * @example
 * const styles = useThemeStyles((theme) => ({
 *   card: {
 *     backgroundColor: theme.cardSurface,
 *     borderColor: theme.borderSubtle,
 *     borderWidth: 1,
 *     borderRadius: 16,
 *     padding: 16,
 *   },
 * }));
 */
export function useThemeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  styleFactory: (theme: ThemeColors) => T
): T {
  const currentTheme = useThemeColors();
  return useMemo(() => StyleSheet.create(styleFactory(currentTheme)), [currentTheme, styleFactory]);
}
