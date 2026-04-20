import React, { createContext, useContext, useState, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

WebBrowser.maybeCompleteAuthSession();

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  role: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_URL = 'https://auth.emergentagent.com';

/**
 * Generates the correct redirect URL based on the environment:
 * - Web preview: uses window.location.origin (e.g., https://gestao-app-1.preview.emergentagent.com)
 * - Expo Go (local): uses Linking.createURL which generates exp://IP:PORT/--/path
 * - Production build: uses the app scheme (e.g., frontend://auth-callback)
 */
function getRedirectUrl(): string {
  if (Platform.OS === 'web') {
    // On web, use the current origin
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/auth-callback`;
    }
    // Fallback for SSR
    const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://gestao-app-1.preview.emergentagent.com';
    return `${backendUrl}/auth-callback`;
  }

  // On mobile (Expo Go or production), use Linking to generate the correct deep link URL
  const url = Linking.createURL('auth-callback');
  console.log('📱 Mobile redirect URL:', url);
  return url;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      if (token) {
        (global as any).authToken = token;
        const response = await api.get('/auth/me');
        setUser(response.data);
      }
    } catch (error) {
      console.error('Check auth error:', error);
      await AsyncStorage.removeItem('session_token');
      (global as any).authToken = null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async () => {
    try {
      const redirectUrl = getRedirectUrl();
      const authUrl = `${AUTH_URL}/?redirect=${encodeURIComponent(redirectUrl)}`;

      console.log('🔐 Iniciando login...');
      console.log('📍 Redirect URL:', redirectUrl);
      console.log('🌐 Auth URL:', authUrl);

      if (Platform.OS === 'web') {
        // On web: use full page redirect (popups get blocked)
        window.location.href = authUrl;
        return; // Page will navigate away, auth-callback.tsx handles the rest
      }

      // On mobile: use WebBrowser popup
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

      console.log('🔄 Resultado do OAuth:', JSON.stringify(result));

      if (result.type === 'success' && result.url) {
        console.log('✅ URL de retorno:', result.url);

        // Extract session_id from the URL
        let sessionId = '';

        // Method 1: From hash (#session_id=xxx)
        if (result.url.includes('#session_id=')) {
          sessionId = result.url.split('#session_id=')[1].split('&')[0];
        }

        // Method 2: From query string (?session_id=xxx)
        if (!sessionId && result.url.includes('session_id=')) {
          sessionId = result.url.split('session_id=')[1].split('&')[0].split('#')[0];
        }

        // Method 3: Using URL/URLSearchParams
        if (!sessionId) {
          try {
            const url = new URL(result.url);
            sessionId = url.searchParams.get('session_id') || '';
            if (!sessionId && url.hash) {
              const hashParams = new URLSearchParams(url.hash.substring(1));
              sessionId = hashParams.get('session_id') || '';
            }
          } catch (e) {
            console.error('URL parse error:', e);
          }
        }

        if (sessionId) {
          console.log('✅ Session ID:', sessionId);
          console.log('📡 Chamando backend para criar sessão...');

          /*const response = await api.post('/auth/session', null, {
            params: { session_id: sessionId }
          });*/

          // ✅ CORRIGIDO: Enviar no corpo da requisição
          const response = await api.post('/auth/session', {
            session_id: sessionId
          });

          console.log('✅ Backend respondeu:', response.data);

          const { user: userData, session_token } = response.data;
          await AsyncStorage.setItem('session_token', session_token);
          (global as any).authToken = session_token;
          setUser(userData);

          console.log('✅ Login concluído! Usuário:', userData.name);
        } else {
          console.error('❌ Session ID não encontrado na URL');
          throw new Error('Session ID não encontrado');
        }
      } else if (result.type === 'cancel') {
        console.log('⚠️ Login cancelado');
        throw new Error('Login cancelado');
      } else {
        console.error('❌ Resultado inesperado:', result.type);
        throw new Error('Falha no login');
      }
    } catch (error) {
      console.error('❌ Erro no login:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await AsyncStorage.removeItem('session_token');
      (global as any).authToken = null;
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
