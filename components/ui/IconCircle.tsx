import React from "react";
import { View, ViewStyle, Text } from "react-native";

interface IconCircleProps {
  emoji: string;
  backgroundColor?: string;
  size?: number;
  style?: ViewStyle;
}

export function IconCircle({
  emoji,
  backgroundColor = "lightblue",
  size = 48,
  style,
}: IconCircleProps) {
  return (
    <View
      style={[
        {
          backgroundColor,
          width: size,
          height: size,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
    </View>
  );
}
