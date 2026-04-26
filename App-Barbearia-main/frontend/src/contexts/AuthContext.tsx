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
  birth_date?: string;
  barbershop_id?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (u: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_URL = 'https://auth.emergentagent.com';

function getRedirectUrl(): string {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/auth-callback`;
    }
    const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://gestao-app-1.preview.emergentagent.com';
    return `${backendUrl}/auth-callback`;
  }
  const url = Linking.createURL('auth-callback');
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

  useEffect(() => { checkAuth(); }, []);

  const login = async () => {
    try {
      const redirectUrl = getRedirectUrl();
      const authUrl = `${AUTH_URL}/?redirect=${encodeURIComponent(redirectUrl)}`;

      if (Platform.OS === 'web') {
        window.location.href = authUrl;
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

      if (result.type === 'success' && result.url) {
        let sessionId = '';
        if (result.url.includes('#session_id=')) {
          sessionId = result.url.split('#session_id=')[1].split('&')[0];
        }
        if (!sessionId && result.url.includes('session_id=')) {
          sessionId = result.url.split('session_id=')[1].split('&')[0].split('#')[0];
        }
        if (!sessionId) {
          try {
            const url = new URL(result.url);
            sessionId = url.searchParams.get('session_id') || '';
            if (!sessionId && url.hash) {
              const hashParams = new URLSearchParams(url.hash.substring(1));
              sessionId = hashParams.get('session_id') || '';
            }
          } catch {}
        }

        if (sessionId) {
          const response = await api.post('/auth/session', null, {
            params: { session_id: sessionId }
          });
          const { user: userData, session_token } = response.data;
          await AsyncStorage.setItem('session_token', session_token);
          (global as any).authToken = session_token;
          setUser(userData);
        } else {
          throw new Error('Session ID nao encontrado');
        }
      } else if (result.type === 'cancel') {
        throw new Error('Login cancelado');
      } else {
        throw new Error('Falha no login');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    await AsyncStorage.removeItem('session_token');
    (global as any).authToken = null;
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}