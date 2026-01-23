import React, { useState, useEffect } from "react";
import { View, StyleSheet, Text } from "react-native";
import { useTheme } from "@react-navigation/native";
import Svg, { Circle } from "react-native-svg";

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

// Static progress text component (no animation to prevent continuous looping)
const StaticProgressText = ({ value, size = 20 }: { value: number; size?: number }) => {
  return (
    <Text
      style={[
        styles.progressPercentage,
        { fontSize: size }
      ]}
    >
      {Math.round(value)}%
    </Text>
  );
};

export const ProgressRing: React.FC<ProgressRingProps> = ({
  percentage,
  size = 60,
  strokeWidth = 6,
  color
}) => {
  const theme = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Default to primary color if none provided
  const ringColor = color || theme.colors.primary;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={theme.colors.background}
          strokeWidth={strokeWidth}
        />

        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Static percentage text (no animation) */}
      <View style={styles.progressRingText}>
        <StaticProgressText value={percentage} size={size / 3} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercentage: {
    fontWeight: '700',
  },
});