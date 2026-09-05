import { Tabs, usePathname } from 'expo-router';
import { Platform, StyleSheet, View, TouchableOpacity } from 'react-native';
import { Home, Dumbbell, History, Settings } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { useUserStore } from '@/store/useUserStore';
import FloatingWorkoutBar from '@/components/FloatingWorkoutBar';

interface CustomTabBarProps {
  state: {
    index: number;
    routes: Array<{
      key: string;
      name: string;
      params?: any;
    }>;
  };
  descriptors: Record<string, any>;
  navigation: any;
}

function CustomFloatingTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  const { hapticsEnabled } = useUserStore();
  const colors = useThemeColors();
  const pathname = usePathname();

  // Hide tab bar completely during active workout session for uninterrupted focus
  if (pathname === '/workout/active' || pathname.includes('active')) {
    return null;
  }

  const isDark = colors.background === '#0B0C0E';

  // Dynamic Theme Colors for Floating Pill
  const pillBg = isDark ? '#141A16' : 'rgba(255, 255, 255, 0.96)';
  const pillBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : '#E6E1D7';
  const shadowColor = isDark ? '#000000' : '#1A2E20';
  const shadowOpacity = isDark ? 0.4 : 0.09;

  const activeTabColor = isDark ? '#B7F34D' : '#1B4D3E';
  const inactiveTabColor = isDark ? '#6B7280' : '#9CA3AF';

  return (
    <View style={styles.tabBarContainer} pointerEvents="box-none">
      <View
        style={[
          styles.tabBarPill,
          {
            backgroundColor: pillBg,
            borderColor: pillBorder,
            ...Platform.select({
              ios: {
                shadowColor: shadowColor,
                shadowOpacity: shadowOpacity,
              },
              android: {
                elevation: isDark ? 10 : 6,
              },
            }),
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            if (hapticsEnabled) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const iconColor = isFocused ? activeTabColor : inactiveTabColor;

          const renderIcon = () => {
            if (route.name === 'index') {
              return <Home color={iconColor} size={24} strokeWidth={isFocused ? 2.5 : 2} />;
            }
            if (route.name === 'workout/index' || route.name.includes('workout')) {
              return <Dumbbell color={iconColor} size={24} strokeWidth={isFocused ? 2.5 : 2} />;
            }
            if (route.name === 'history') {
              return <History color={iconColor} size={24} strokeWidth={isFocused ? 2.5 : 2} />;
            }
            if (route.name === 'settings') {
              return <Settings color={iconColor} size={24} strokeWidth={isFocused ? 2.5 : 2} />;
            }
            return <Home color={iconColor} size={24} strokeWidth={2} />;
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel || options.title}
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.7}
              style={styles.tabItem}
            >
              <View style={styles.iconWrapper}>
                {renderIcon()}
                {isFocused && (
                  <View
                    style={[
                      styles.activeDot,
                      { backgroundColor: activeTabColor },
                      isDark && styles.activeDotGlowDark,
                    ]}
                  />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const colors = useThemeColors();
  const { t } = useTranslation();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tabs
        tabBar={(props) => <CustomFloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
        }}
        safeAreaInsets={{ bottom: 0 }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('dashboard'),
          }}
        />
        <Tabs.Screen
          name="workout"
          options={{
            title: t('workout'),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: t('history'),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('settings'),
          }}
        />
      </Tabs>
      <FloatingWorkoutBar />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 1000,
    elevation: 10,
  },
  tabBarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    height: 68,
    borderRadius: 36,
    borderWidth: 1,
    paddingHorizontal: 12,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 18,
      },
    }),
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  activeDotGlowDark: {
    ...Platform.select({
      ios: {
        shadowColor: '#B7F34D',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});

