// This file is the cross-platform fallback for IconSymbol
// Platform-specific implementations will take precedence:
// - On iOS: IconSymbol.ios.tsx will be used automatically
// - On Android/web: This implementation will be used

// Import the Android/web implementation from ui directory
export { IconSymbol } from './ui/IconSymbol';
export * from './ui/IconSymbol';