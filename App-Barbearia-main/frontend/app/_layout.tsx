import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../src/contexts/AuthContext';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { initApiUrl } from '../src/services/api';

function InnerLayout() {
  const { theme } = useTheme();

  useEffect(() => {
    initApiUrl();
  }, []);

  return (
    <>
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
        <Stack.Screen name="barbershop-setup" />
        <Stack.Screen name="evolution-settings" />
      </Stack>
    </>
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
