import { useUserStore } from '@/store/useUserStore';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';

export function useThemeColors() {
  const themePreference = useUserStore((state) => state.theme);
  const systemTheme = useNativeColorScheme();

  const activeTheme = themePreference === 'system' ? (systemTheme || 'dark') : themePreference;
  
  return Colors[activeTheme as 'light' | 'dark'];
}
