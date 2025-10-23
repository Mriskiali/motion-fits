import React from "react";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, useColorScheme, View, Text } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, {
  configureReanimatedLogger,
  FadeIn,
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import Reanimated from "react-native-reanimated";
import { appleRed, borderColor } from "@/constants/Colors";
import { IconCircle } from "./IconCircle";
import { IconSymbol } from "./IconSymbol";

configureReanimatedLogger({ strict: false });

export default function ListItem({ listId }: { listId: string }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const RightAction = (
    prog: SharedValue<number>,
    drag: SharedValue<number>
  ) => {
    const styleAnimation = useAnimatedStyle(() => ({
      transform: [{ translateX: drag.value + 200 }],
    }));

    return (
      <Pressable
        onPress={() => {
          if (process.env.EXPO_OS === "ios") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
          console.log("delete");
        }}
      >
        <Reanimated.View style={[styleAnimation, styles.rightAction]}>
          <IconSymbol name="trash.fill" size={24} color="white" />
        </Reanimated.View>
      </Pressable>
    );
  };

  return (
    <Animated.View entering={FadeIn}>
      <ReanimatedSwipeable
        key={listId}
        friction={2}
        enableTrackpadTwoFingerGesture
        rightThreshold={40}
        renderRightActions={RightAction}
        overshootRight={false}
        enableContextMenu
      >
        <View style={styles.listItemContainer}>
          <Text style={[styles.listItemText, { color: isDark ? "#FFFFFF" : "#000000" }]}>{listId}</Text>
        </View>

      </ReanimatedSwipeable>
    </Animated.View>
  );
}

export const NicknameCircle = ({
  nickname,
  color,
  index = 0,
  isEllipsis = false,
}: {
  nickname: string;
  color: string;
  index?: number;
  isEllipsis?: boolean;
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Text
      style={[
        styles.nicknameCircle,
        isEllipsis && styles.ellipsisCircle,
        {
          backgroundColor: color,
          borderColor: isDark ? "#000000" : "#ffffff",
          marginLeft: index > 0 ? -6 : 0,
        },
      ]}
    >
      {isEllipsis ? "..." : nickname[0].toUpperCase()}
    </Text>
  );
};

const styles = StyleSheet.create({
  listItemContainer: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: borderColor,
    backgroundColor: "transparent",
  },
  listItemText: {
    fontSize: 16,
  },
  rightAction: {
    width: 200,
    height: 65,
    backgroundColor: appleRed,
    alignItems: "center",
    justifyContent: "center",
  },
  swipeable: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: borderColor,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexShrink: 1,
  },
  textContent: {
    flexShrink: 1,
  },
  productCount: {
    fontSize: 12,
    color: "gray",
  },
  rightContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  nicknameContainer: {
    flexDirection: "row",
    marginRight: 4,
  },
  nicknameCircle: {
    fontSize: 12,
    color: "white",
    borderWidth: 1,
    borderColor: "white",
    borderRadius: 16,
    padding: 1,
    width: 24,
    height: 24,
    textAlign: "center",
    lineHeight: 20,
  },
  ellipsisCircle: {
    lineHeight: 0,
    marginLeft: -6,
  },
});
