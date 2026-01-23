
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

export const colors = {
  background: '#f5f5f7', // Slightly darker background for better contrast
  text: '#1d1d1f',
  textSecondary: '#6e6e73',
  primary: '#007AFF',
  secondary: '#34C759',
  accent: '#FF9500',
  card: '#ffffff',
  highlight: '#007AFF',
};

// Tailwind-compatible color classes
export const twColors = {
  background: 'bg-gray-100',
  text: 'text-gray-900',
  textSecondary: 'text-gray-500',
  primary: 'text-blue-500',
  secondary: 'text-green-500',
  accent: 'text-orange-500',
  card: 'bg-white',
  highlight: 'text-blue-500',
};

export const buttonStyles = StyleSheet.create({
  instructionsButton: {
    backgroundColor: colors.primary,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    backgroundColor: colors.card,
    alignSelf: 'center',
    width: '100%',
  },
});

export const commonStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 800,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.text,
    marginBottom: 10
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 24,
    textAlign: 'center',
  },
  section: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16, // Increased border radius for more modern look
    padding: 16,
    marginVertical: 8,
    width: '100%',
    // Enhanced shadow for better depth perception
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.08), 0px 2px 4px rgba(0, 0, 0, 0.06)',
    elevation: 4,
  },
  icon: {
    width: 60,
    height: 60,
    tintColor: colors.primary,
  },
});
