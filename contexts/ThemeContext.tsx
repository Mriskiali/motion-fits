import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showSuccessToast } from '@/utils/notifications';

interface ThemeContextType {
  colorScheme: 'light' | 'dark';
  toggleColorScheme: () => void;
  setColorScheme: (scheme: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [colorScheme, setColorSchemeState] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Load saved theme preference or use system preference
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme');
        if (savedTheme) {
          setColorSchemeState(savedTheme as 'light' | 'dark');
        } else {
          setColorSchemeState(Appearance.getColorScheme() || 'light');
        }
      } catch (error) {
        setColorSchemeState(Appearance.getColorScheme() || 'light');
      }
    };

    loadTheme();

    // Listen for system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      // Only update if user hasn't set a custom theme
      AsyncStorage.getItem('theme').then((savedTheme) => {
        if (!savedTheme) {
          setColorSchemeState(colorScheme || 'light');
        }
      });
    });

    return () => subscription.remove();
  }, []);

  const toggleColorScheme = async () => {
    const newScheme = colorScheme === 'light' ? 'dark' : 'light';
    setColorSchemeState(newScheme);
    try {
      await AsyncStorage.setItem('theme', newScheme);
      showSuccessToast('Theme Changed', `Switched to ${newScheme} mode`);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const setColorScheme = async (scheme: 'light' | 'dark') => {
    setColorSchemeState(scheme);
    try {
      await AsyncStorage.setItem('theme', scheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ colorScheme, toggleColorScheme, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};