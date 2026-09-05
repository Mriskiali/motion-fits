import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AppTheme } from '@/constants/AppTheme';
export interface FloatingTabBarProps {
  state?: {
    index: number;
    routes: Array<{ key: string; name: string; params?: any }>;
  };
  navigation?: {
    navigate: (name: string, params?: any) => void;
    emit: (event: any) => any;
  };
  onCenterPress?: () => void;
}

export default function FloatingTabBar({ state, navigation, onCenterPress }: FloatingTabBarProps) {
  const tabs = [
    { name: 'index', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
    { name: 'workout/index', label: 'Activity', icon: 'pulse-outline', activeIcon: 'pulse' },
    { name: 'center_action', label: 'Start', isCenter: true },
    { name: 'history', label: 'Calendar', icon: 'calendar-outline', activeIcon: 'calendar' },
    { name: 'settings', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
  ];

  const currentRouteName = state?.routes[state?.index]?.name;

  const handleTabPress = (tabName: string, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!navigation || !state) return;

    const route = state.routes.find((r) => r.name === tabName);
    if (!route) return;

    const isFocused = state.index === index;
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  const handleCenterAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (navigation) {
      navigation.navigate('workout/index');
    }
  };

  return (
    <View style={styles.outerContainer} pointerEvents="box-none">
      <View style={styles.barContainer}>
        {tabs.map((tab, idx) => {
          if (tab.isCenter) {
            return (
              <View key="center-btn" style={styles.centerButtonWrapper}>
                <Pressable
                  onPress={handleCenterAction}
                  style={({ pressed }) => [
                    styles.centerButton,
                    pressed && { transform: [{ scale: 0.94 }] },
                  ]}
                >
                  <Ionicons name="add" size={26} color="#FFFFFF" />
                </Pressable>
              </View>
            );
          }

          const routeIndex = state?.routes.findIndex((r) => r.name === tab.name) ?? -1;
          const isFocused = currentRouteName === tab.name;

          return (
            <Pressable
              key={tab.name}
              onPress={() => handleTabPress(tab.name, routeIndex)}
              style={({ pressed }) => [
                styles.tabItem,
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={[styles.iconContainer, isFocused && styles.activeIconContainer]}>
                <Ionicons
                  name={(isFocused ? tab.activeIcon : tab.icon) as any}
                  size={22}
                  color={isFocused ? AppTheme.colors.accentSecondary : AppTheme.colors.textMuted}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  isFocused ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 999,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 68,
    backgroundColor: AppTheme.colors.surfaceCard,
    borderRadius: AppTheme.radius.floatingNav,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: AppTheme.colors.borderCard,
    ...Platform.select({
      ios: {
        shadowColor: AppTheme.shadows.floatingBar.shadowColor,
        shadowOffset: AppTheme.shadows.floatingBar.shadowOffset,
        shadowOpacity: AppTheme.shadows.floatingBar.shadowOpacity,
        shadowRadius: AppTheme.shadows.floatingBar.shadowRadius,
      },
      android: {
        elevation: AppTheme.shadows.floatingBar.elevation,
      },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconContainer: {
    width: 32,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  activeIconContainer: {
    backgroundColor: 'rgba(27, 77, 62, 0.08)',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: AppTheme.colors.accentSecondary,
    fontWeight: '700',
  },
  tabLabelInactive: {
    color: AppTheme.colors.textMuted,
  },
  centerButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AppTheme.colors.accentSecondary, // Solid Forest Emerald
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AppTheme.colors.accentSecondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
