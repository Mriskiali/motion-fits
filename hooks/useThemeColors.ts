import { useUserStore } from '@/store/useUserStore';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';

export function useThemeColors() {
  const themePreference = useUserStore((state) => state.theme);
  const systemTheme = useNativeColorScheme();

  const activeTheme = themePreference === 'light' ? 'light' : (themePreference === 'dark' ? 'dark' : (systemTheme === 'light' ? 'light' : 'dark'));
  
  return Colors[activeTheme] || Colors.dark;
}
