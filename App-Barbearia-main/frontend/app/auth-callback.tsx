/*import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import api from '../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// For popup-based auth flow (mobile)
WebBrowser.maybeCompleteAuthSession();

export default function AuthCallback() {
  const router = useRouter();
  const { checkAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // On web, handle the redirect with session_id in the URL
    if (Platform.OS === 'web') {
      handleWebCallback();
    }
    // On mobile, maybeCompleteAuthSession handles it via the AuthContext
  }, []);

  const handleWebCallback = async () => {
    try {
      let sessionId = '';

      // Get session_id from URL hash or query params
      if (typeof window !== 'undefined') {
        const url = window.location.href;
        console.log('Auth callback URL:', url);

        // Try hash fragment: #session_id=xxx
        if (url.includes('#session_id=')) {
          sessionId = url.split('#session_id=')[1].split('&')[0];
        }

        // Try query param: ?session_id=xxx
        if (!sessionId && url.includes('?session_id=')) {
          sessionId = url.split('?session_id=')[1].split('&')[0].split('#')[0];
        }

        // Try URLSearchParams
        if (!sessionId) {
          try {
            const urlObj = new URL(url);
            sessionId = urlObj.searchParams.get('session_id') || '';
            if (!sessionId && urlObj.hash) {
              const hashParams = new URLSearchParams(urlObj.hash.substring(1));
              sessionId = hashParams.get('session_id') || '';
            }
          } catch (e) {
            console.error('URL parse error:', e);
          }
        }
      }

      if (!sessionId) {
        console.error('No session_id found in URL');
        setError('Sessão não encontrada. Tente fazer login novamente.');
        setTimeout(() => router.replace('/login'), 3000);
        return;
      }

      console.log('Session ID found:', sessionId);

      // Exchange session_id for session_token via backend
      const response = await api.post('/auth/session', null, {
        params: { session_id: sessionId }
      });

      // ✅ CORRIGIDO: Enviar no corpo da requisição
      const response = await api.post('/auth/session', {
        session_id: sessionId
      });

      console.log('Backend response:', response.data);

      const { session_token } = response.data;

      // Save token
      await AsyncStorage.setItem('session_token', session_token);
      (global as any).authToken = session_token;

      // Refresh auth context
      await checkAuth();

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Auth callback error:', err);
      const message = err?.response?.data?.detail || 'Erro na autenticação. Tente novamente.';
      setError(message);
      setTimeout(() => router.replace('/login'), 3000);
    }
  };

  return (
    <View style={styles.container}>
      {error ? (
        <>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.subtext}>Redirecionando para o login...</Text>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.text}>Autenticando...</Text>
          <Text style={styles.subtext}>Aguarde enquanto finalizamos o login</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 24,
  },
  text: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  subtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 8,
  },
});*/



import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import api from '../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// For popup-based auth flow (mobile)
WebBrowser.maybeCompleteAuthSession();

export default function AuthCallback() {
  const router = useRouter();
  const { checkAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // On web, handle the redirect with session_id in the URL
    if (Platform.OS === 'web') {
      handleWebCallback();
    }
    // On mobile, maybeCompleteAuthSession handles it via the AuthContext
  }, []);

  const handleWebCallback = async () => {
    try {
      let sessionId = '';

      // Get session_id from URL hash or query params
      if (typeof window !== 'undefined') {
        const url = window.location.href;
        console.log('Auth callback URL:', url);

        // Try hash fragment: #session_id=xxx
        if (url.includes('#session_id=')) {
          sessionId = url.split('#session_id=')[1].split('&')[0];
        }

        // Try query param: ?session_id=xxx
        if (!sessionId && url.includes('?session_id=')) {
          sessionId = url.split('?session_id=')[1].split('&')[0].split('#')[0];
        }

        // Try URLSearchParams
        if (!sessionId) {
          try {
            const urlObj = new URL(url);
            sessionId = urlObj.searchParams.get('session_id') || '';
            if (!sessionId && urlObj.hash) {
              const hashParams = new URLSearchParams(urlObj.hash.substring(1));
              sessionId = hashParams.get('session_id') || '';
            }
          } catch (e) {
            console.error('URL parse error:', e);
          }
        }
      }

      if (!sessionId) {
        console.error('No session_id found in URL');
        setError('Sessão não encontrada. Tente fazer login novamente.');
        setTimeout(() => router.replace('/login'), 3000);
        return;
      }

      console.log('Session ID found:', sessionId);
      console.log('📤 Enviando session_id para o backend:', sessionId);

      // Exchange session_id for session_token via backend
      const response = await api.post('/auth/session', {
        session_id: sessionId
      });

      console.log('Backend response:', response.data);

      const { session_token } = response.data;

      // Save token
      await AsyncStorage.setItem('session_token', session_token);
      (global as any).authToken = session_token;

      // Refresh auth context
      await checkAuth();

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Auth callback error:', err);
      
      // Format error message properly
      let errorMessage = 'Erro na autenticação. Tente novamente.';
      
      if (err?.response?.data) {
        const errorData = err.response.data;
        
        // Handle FastAPI validation errors (422)
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            // Format validation errors array
            const messages = errorData.detail.map((e: any) => {
              return e.msg || e.message || 'Campo inválido';
            });
            errorMessage = messages.join(', ');
          } else if (typeof errorData.detail === 'string') {
            // String detail
            errorMessage = errorData.detail;
          } else if (typeof errorData.detail === 'object') {
            // Object detail
            errorMessage = JSON.stringify(errorData.detail);
          }
        } 
        // Handle message field
        else if (errorData.message) {
          errorMessage = errorData.message;
        }
        // Handle error field
        else if (errorData.error) {
          errorMessage = errorData.error;
        }
      }
      
      // Handle specific status codes
      if (err?.response?.status === 422) {
        errorMessage = 'Dados inválidos. Verifique se o session_id está correto.';
      } else if (err?.response?.status === 401) {
        errorMessage = 'Não autorizado. Faça login novamente.';
      } else if (err?.response?.status === 404) {
        errorMessage = 'Serviço não encontrado. Verifique a conexão com o servidor.';
      } else if (err?.code === 'ECONNABORTED') {
        errorMessage = 'Tempo limite excedido. Verifique sua conexão.';
      } else if (err?.message?.includes('Network Error')) {
        errorMessage = 'Erro de rede. Verifique se o servidor está rodando.';
      }
      
      setError(errorMessage);
      setTimeout(() => router.replace('/login'), 3000);
    }
  };

  return (
    <View style={styles.container}>
      {error ? (
        <>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.subtext}>Redirecionando para o login...</Text>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.text}>Autenticando...</Text>
          <Text style={styles.subtext}>Aguarde enquanto finalizamos o login</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 24,
  },
  text: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  subtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 8,
  },
});
