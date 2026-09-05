import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Home, Dumbbell, History, Settings } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import FloatingWorkoutBar from '@/components/FloatingWorkoutBar';

export default function TabLayout() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const isDark = colors.background === '#0B0C0E';

  const activeTabColor = isDark ? '#B7F34D' : '#1B4D3E';
  const inactiveTabColor = isDark ? '#6B7280' : '#9CA3AF';
  const pillBg = isDark ? 'rgba(20, 26, 22, 0.88)' : 'rgba(255, 255, 255, 0.92)';
  const pillBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : '#E6E1D7';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: activeTabColor,
          tabBarInactiveTintColor: inactiveTabColor,
          tabBarStyle: [
            styles.tabBar,
            {
              borderColor: pillBorder,
              ...Platform.select({
                ios: {
                  shadowColor: isDark ? '#000' : '#1A2E20',
                  shadowOpacity: isDark ? 0.4 : 0.08,
                },
                android: {
                  elevation: isDark ? 8 : 4,
                },
              }),
            },
          ],
          tabBarBackground: () => (
            <View style={[styles.blurContainer, { backgroundColor: pillBg }]}>
              <BlurView
                tint={isDark ? 'dark' : 'light'}
                intensity={50}
                style={StyleSheet.absoluteFill}
              />
            </View>
          ),
        }}
        safeAreaInsets={{ bottom: 0 }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('dashboard'),
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.iconWrapper}>
                <Home color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
                {focused && <View style={[styles.activeDot, { backgroundColor: activeTabColor }]} />}
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="workout"
          options={{
            title: t('workout'),
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.iconWrapper}>
                <Dumbbell color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
                {focused && <View style={[styles.activeDot, { backgroundColor: activeTabColor }]} />}
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: t('history'),
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.iconWrapper}>
                <History color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
                {focused && <View style={[styles.activeDot, { backgroundColor: activeTabColor }]} />}
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('settings'),
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.iconWrapper}>
                <Settings color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
                {focused && <View style={[styles.activeDot, { backgroundColor: activeTabColor }]} />}
              </View>
            ),
          }}
        />
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
