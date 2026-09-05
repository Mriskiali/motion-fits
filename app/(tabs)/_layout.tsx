import { Tabs } from 'expo-router';
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

  return (
    <View style={styles.tabBarContainer} pointerEvents="box-none">
      <View style={styles.tabBarPill}>
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

          const isWorkoutTab = route.name === 'workout/index' || route.name.includes('workout');

          if (isWorkoutTab) {
            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel || options.title}
                testID={options.tabBarButtonTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                activeOpacity={0.8}
                style={styles.centerActionWrapper}
              >
                <View style={[styles.centerActionButton, isFocused && styles.centerActionButtonFocused]}>
                  <Dumbbell color="#0B0E0C" size={22} strokeWidth={2.4} />
                </View>
              </TouchableOpacity>
            );
          }

          // Regular Tab Icons: Active = #B7F34D, Inactive = #6B7280
          const iconColor = isFocused ? '#B7F34D' : '#6B7280';

          const renderIcon = () => {
            if (route.name === 'index') {
              return <Home color={iconColor} size={22} strokeWidth={isFocused ? 2.4 : 2} />;
            }
            if (route.name === 'history') {
              return <History color={iconColor} size={22} strokeWidth={isFocused ? 2.4 : 2} />;
            }
            if (route.name === 'settings') {
              return <Settings color={iconColor} size={22} strokeWidth={isFocused ? 2.4 : 2} />;
            }
            return <Home color={iconColor} size={22} strokeWidth={2} />;
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
                {isFocused && <View style={styles.activeDot} />}
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
          name="workout/index"
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
    backgroundColor: '#141A16',
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 18,
      },
      android: {
        elevation: 10,
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
    backgroundColor: '#B7F34D',
    marginTop: 4,
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
  centerActionWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  centerActionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#B7F34D',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#B7F34D',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  centerActionButtonFocused: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.05 }],
  },
});

