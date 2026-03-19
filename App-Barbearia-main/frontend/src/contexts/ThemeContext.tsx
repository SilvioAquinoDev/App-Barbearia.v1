import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@barbershop_theme';

export const lightTheme = {
  dark: false,
  background: '#F5F5F5',
  card: '#FFFFFF',
  text: '#333333',
  textSecondary: '#666666',
  textMuted: '#999999',
  border: '#E8E8E8',
  divider: '#E0E0E0',
  primary: '#007AFF',
  headerBg: '#007AFF',
  headerText: '#FFFFFF',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E8E8E8',
  tabBarActive: '#007AFF',
  tabBarInactive: '#999999',
  inputBg: '#FAFAFA',
  inputBorder: '#DDD',
  statusBarStyle: 'light' as const,
};

export const darkTheme = {
  dark: true,
  background: '#121212',
  card: '#1E1E1E',
  text: '#E8E8E8',
  textSecondary: '#AAAAAA',
  textMuted: '#777777',
  border: '#333333',
  divider: '#2A2A2A',
  primary: '#4DA6FF',
  headerBg: '#1A1A2E',
  headerText: '#E8E8E8',
  tabBarBg: '#1A1A1A',
  tabBarBorder: '#2A2A2A',
  tabBarActive: '#4DA6FF',
  tabBarInactive: '#666666',
  inputBg: '#2A2A2A',
  inputBorder: '#444444',
  statusBarStyle: 'light' as const,
};

export type Theme = typeof lightTheme;

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === 'dark') setIsDark(true);
    });
  }, []);

  const toggleTheme = async () => {
    const newVal = !isDark;
    setIsDark(newVal);
    await AsyncStorage.setItem(STORAGE_KEY, newVal ? 'dark' : 'light');
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
