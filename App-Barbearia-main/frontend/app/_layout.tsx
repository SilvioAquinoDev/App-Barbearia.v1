import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../src/contexts/AuthContext';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { initApiUrl } from '../src/services/api';
import { SafeAreaProvider } from 'react-native-safe-area-context';

function InnerLayout() {
  const { theme } = useTheme();

  useEffect(() => {
    initApiUrl();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style={theme.statusBarStyle} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="auth-callback" />
        <Stack.Screen name="booking" />
        <Stack.Screen name="whatsapp-settings" />
        <Stack.Screen name="server-config" />
        <Stack.Screen name="promotions-manage" />
        <Stack.Screen name="service-photos" />
      </Stack>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <InnerLayout />
      </AuthProvider>
    </ThemeProvider>
  );
}
