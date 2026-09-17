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
  const isDark = colors.isDark;

  const activeTabColor = colors.primaryAction;
  const inactiveTabColor = isDark ? '#64748B' : '#8C857B';
  const pillBg = isDark ? 'rgba(18, 19, 26, 0.96)' : 'rgba(255, 255, 255, 0.96)';
  const pillBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(228, 223, 213, 0.9)';

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
          tabBarBackground: () => (
            <View style={[styles.blurContainer, { backgroundColor: pillBg }]}>
              {Platform.OS === 'ios' && (
                <BlurView
                  tint={isDark ? 'dark' : 'light'}
                  intensity={50}
                  style={StyleSheet.absoluteFill}
                />
              )}
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
