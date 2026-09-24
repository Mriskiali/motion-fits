import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View, ColorValue } from 'react-native';
import React, { useMemo } from 'react';
import { BlurView } from 'expo-blur';
import { Home, Dumbbell, History, Settings } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import FloatingWorkoutBar from '@/components/FloatingWorkoutBar';

// Stable tab icon components: defined at module scope so react-navigation does not
// see a brand-new `tabBarIcon` function on every render (which forces the whole tab
// navigator to re-render / re-register on every theme & language change).
const makeTabIcon = (Icon: typeof Home) =>
  React.memo(function TabIcon({
    color,
    focused,
  }: {
    color: ColorValue;
    focused: boolean;
  }) {
    return (
      <View style={styles.iconWrapper}>
        <Icon color={color as string} size={24} strokeWidth={focused ? 2.5 : 2} />
        {focused && <View style={[styles.activeDot, { backgroundColor: color as string }]} />}
      </View>
    );
  });

const HomeIcon = makeTabIcon(Home);
const WorkoutIcon = makeTabIcon(Dumbbell);
const HistoryIcon = makeTabIcon(History);
const SettingsIcon = makeTabIcon(Settings);

export default function TabLayout() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const isDark = colors.isDark;

  const activeTabColor = colors.primaryAction;
  const inactiveTabColor = isDark ? '#64748B' : '#8C857B';
  const pillBg = isDark ? 'rgba(18, 19, 26, 0.96)' : 'rgba(255, 255, 255, 0.96)';
  const pillBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(228, 223, 213, 0.9)';

  const tabBarStyle = useMemo(
    () => [
      styles.tabBar,
      {
        borderColor: pillBorder,
        backgroundColor: pillBg,
        ...Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOpacity: isDark ? 0.5 : 0.08,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 4 },
          },
          android: {
            elevation: isDark ? 10 : 4,
          },
        }),
      },
    ],
    [pillBorder, pillBg, isDark]
  );

  const renderTabBarBackground = useMemo(
    () => () => (
      <View style={[styles.blurContainer, { backgroundColor: pillBg }]}>
        {Platform.OS === 'ios' && (
          <BlurView tint={isDark ? 'dark' : 'light'} intensity={50} style={StyleSheet.absoluteFill} />
        )}
      </View>
    ),
    [pillBg, isDark]
  );

  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarShowLabel: false,
      tabBarHideOnKeyboard: true,
      // Freeze inactive tab screens so they don't re-render while off-screen.
      // Big win for responsiveness when switching tabs / changing theme.
      freezeOnBlur: true,
      lazy: true,
      tabBarActiveTintColor: activeTabColor,
      tabBarInactiveTintColor: inactiveTabColor,
      tabBarStyle,
      tabBarBackground: renderTabBarBackground,
    }),
    [activeTabColor, inactiveTabColor, tabBarStyle, renderTabBarBackground]
  );

const indexOptions = useMemo(
  () => ({ title: t('dashboard'), tabBarIcon: (props: any) => <HomeIcon {...props} /> }),
  [t]
);
const workoutOptions = useMemo(
  () => ({ title: t('workout'), tabBarIcon: (props: any) => <WorkoutIcon {...props} /> }),
  [t]
);
const historyOptions = useMemo(
  () => ({ title: t('history'), tabBarIcon: (props: any) => <HistoryIcon {...props} /> }),
  [t]
);
const settingsOptions = useMemo(
  () => ({ title: t('settings'), tabBarIcon: (props: any) => <SettingsIcon {...props} /> }),
  [t]
);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tabs screenOptions={screenOptions} safeAreaInsets={{ bottom: 0 }}>
        <Tabs.Screen name="index" options={indexOptions} />
        <Tabs.Screen name="workout" options={workoutOptions} />
        <Tabs.Screen name="history" options={historyOptions} />
        <Tabs.Screen name="settings" options={settingsOptions} />
      </Tabs>
      <FloatingWorkoutBar />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    borderRadius: 36,
    height: 68,
    borderWidth: 1,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    paddingTop: 14,
    paddingBottom: 0,
  },
  blurContainer: {
    ...StyleSheet.absoluteFill,
    borderRadius: 36,
    overflow: 'hidden',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    width: 40,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
});
