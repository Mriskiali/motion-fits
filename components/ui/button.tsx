import React from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextStyle,
  useColorScheme,
  ViewStyle,
} from "react-native";

type ButtonVariant = "filled" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  variant = "filled",
  size = "md",
  disabled = false,
  loading = false,
  children,
  style,
  textStyle,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Define size classes
  const sizeClasses = {
    sm: "h-9 px-3 text-sm",
    md: "h-11 px-4 text-base",
    lg: "h-14 px-5 text-lg",
  };

  // Define variant classes
  const variantClasses = () => {
    switch (variant) {
      case "filled":
        return isDark
          ? "bg-zinc-50 text-zinc-900 border-0"
          : "bg-zinc-900 text-zinc-50 border-0";
      case "outline":
        return isDark
          ? "bg-transparent text-blue-500 border border-zinc-700"
          : "bg-transparent text-blue-500 border border-zinc-300";
      case "ghost":
        return "bg-transparent text-blue-500 border-0";
      default:
        return "";
    }
  };

  const disabledClass = disabled ? "opacity-50" : "";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`rounded-lg flex-row items-center justify-center ${sizeClasses[size]} ${variantClasses()} ${disabledClass}`}
      style={style}
    >
      {loading ? (
        <ActivityIndicator color={isDark ? "#171717" : "#f4f4f5"} />
      ) : (
        <Text
          className={`text-center font-bold ${isDark && variant === 'filled' ? 'text-zinc-900' : isDark ? 'text-blue-500' : variant === 'filled' ? 'text-zinc-50' : 'text-blue-500'}`}
          style={textStyle}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
};

export default Button;
