import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Home, Dumbbell, History, Settings } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function TabLayout() {
  const colors = useThemeColors();
  const styles = getStyles(colors);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarHideOnKeyboard: true,
        tabBarBackground: () => (
          <View style={styles.blurContainer}>
            <BlurView tint={colors.background === '#0f172a' ? 'dark' : 'light'} intensity={80} style={StyleSheet.absoluteFill} />
          </View>
        ),
      }}
      safeAreaInsets={{ bottom: 0 }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="workout/index"
        options={{
          title: 'Workout',
          tabBarIcon: ({ color, size }) => <Dumbbell color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <History color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    elevation: 0,
    backgroundColor: 'transparent',
    borderRadius: 40,
    height: 72,
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    paddingTop: 16, // manually center the icons since default container pushes them up
    paddingBottom: 0,
  },
  blurContainer: {
    ...StyleSheet.absoluteFill,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: colors.background === '#0f172a' ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.6)',
  },
});
