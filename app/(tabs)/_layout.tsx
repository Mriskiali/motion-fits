import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { Home, Dumbbell, History, Settings } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { ThemeColors } from '@/constants/theme';
import FloatingWorkoutBar from '@/components/FloatingWorkoutBar';

export default function TabLayout() {
  const colors = useThemeColors();
  const styles = getStyles(colors);
  const { t } = useTranslation();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: colors.primaryAction,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarHideOnKeyboard: true,
        }}
        safeAreaInsets={{ bottom: 0 }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('dashboard'),
            tabBarIcon: ({ color, size }) => <Home color={color} size={size} strokeWidth={2.2} />,
          }}
        />
        <Tabs.Screen
          name="workout/index"
          options={{
            title: t('workout'),
            tabBarIcon: ({ color, size }) => <Dumbbell color={color} size={size} strokeWidth={2.2} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: t('history'),
            tabBarIcon: ({ color, size }) => <History color={color} size={size} strokeWidth={2.2} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('settings'),
            tabBarIcon: ({ color, size }) => <Settings color={color} size={size} strokeWidth={2.2} />,
          }}
        />
      </Tabs>
      <FloatingWorkoutBar />
    </View>
  );
}

const getStyles = (c: ThemeColors) =>
  StyleSheet.create({
    tabBar: {
      backgroundColor: c.cardSurface,
      borderTopWidth: 1,
      borderTopColor: c.borderSubtle,
      height: Platform.OS === 'ios' ? 70 : 64,
      paddingBottom: Platform.OS === 'ios' ? 16 : 10,
      paddingTop: 10,
      ...Platform.select({
        ios: {
          shadowColor: c.shadowColor,
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: c.shadowOpacity,
          shadowRadius: c.shadowRadius,
        },
        android: {
          elevation: c.elevation,
        },
      }),
    },
  });

