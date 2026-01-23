import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  theme: {
    colors: {
      primary: string;
      secondary: string;
      background: string;
      card: string;
      text: string;
      border: string;
      notification: string;
    };
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const colorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(colorScheme === 'dark');

  useEffect(() => {
    setIsDark(colorScheme === 'dark');
  }, [colorScheme]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  const theme = {
    colors: {
      primary: isDark ? '#0a84ff' : '#007aff', // System Blue
      secondary: isDark ? '#4cd964' : '#34c759', // System Green
      background: isDark ? '#000000' : '#f2f2f7', // True black for OLED / Light gray
      card: isDark ? '#1c1c1e' : '#ffffff', // Dark gray card / White card
      text: isDark ? '#ffffff' : '#000000', // White text / Black text
      border: isDark ? '#444446' : '#d8d8dc', // Dark gray border / Light gray border
      notification: isDark ? '#ff453a' : '#ff3b30', // System Red (Dark/Light)
    }
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};