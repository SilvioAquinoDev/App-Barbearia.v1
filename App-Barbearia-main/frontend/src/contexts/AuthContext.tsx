import React, { createContext, useContext, useState, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
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

const REDIRECT_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://cutflow-8.preview.emergentagent.com';
const AUTH_URL = 'https://auth.emergentagent.com';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      if (token) {
        global.authToken = token;
        const response = await api.get('/auth/me');
        setUser(response.data);
      }
    } catch (error) {
      console.error('Check auth error:', error);
      await AsyncStorage.removeItem('session_token');
      global.authToken = null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async () => {
    try {
      // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
      const redirectUrl = `${REDIRECT_URL}/auth-callback`;
      const authUrl = `${AUTH_URL}/?redirect=${encodeURIComponent(redirectUrl)}`;
      
      console.log('🔐 Iniciando login...');
      console.log('Redirect URL:', redirectUrl);
      console.log('Auth URL:', authUrl);
      
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      
      console.log('🔄 Resultado do OAuth:', result);
      
      if (result.type === 'success' && result.url) {
        console.log('✅ URL de retorno:', result.url);
        
        // Tentar pegar session_id de diferentes formas
        let sessionId = '';
        
        // Método 1: Do hash (#session_id=xxx)
        if (result.url.includes('#session_id=')) {
          sessionId = result.url.split('#session_id=')[1].split('&')[0];
          console.log('📝 Session ID do hash:', sessionId);
        }
        
        // Método 2: Do query string (?session_id=xxx)
        if (!sessionId && result.url.includes('?session_id=')) {
          sessionId = result.url.split('?session_id=')[1].split('&')[0];
          console.log('📝 Session ID do query:', sessionId);
        }
        
        // Método 3: Usando URLSearchParams
        if (!sessionId) {
          try {
            const url = new URL(result.url);
            sessionId = url.searchParams.get('session_id') || '';
            if (!sessionId && url.hash) {
              const hashParams = new URLSearchParams(url.hash.substring(1));
              sessionId = hashParams.get('session_id') || '';
            }
            console.log('📝 Session ID do URLSearchParams:', sessionId);
          } catch (e) {
            console.error('Erro ao parsear URL:', e);
          }
        }
        
        if (sessionId) {
          console.log('✅ Session ID encontrado:', sessionId);
          console.log('📡 Chamando backend...');
          
          const response = await api.post('/auth/session', null, {
            params: { session_id: sessionId }
          });
          
          console.log('✅ Resposta do backend:', response.data);
          
          const { user: userData, session_token } = response.data;
          await AsyncStorage.setItem('session_token', session_token);
          global.authToken = session_token;
          setUser(userData);
          
          console.log('✅ Login completado com sucesso!');
        } else {
          console.error('❌ Session ID não encontrado na URL');
          throw new Error('Session ID não encontrado na resposta do OAuth');
        }
      } else if (result.type === 'cancel') {
        console.log('⚠️ Login cancelado pelo usuário');
        throw new Error('Login cancelado');
      } else {
        console.error('❌ Tipo de resultado inesperado:', result.type);
        throw new Error('Falha no login OAuth');
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
      global.authToken = null;
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
