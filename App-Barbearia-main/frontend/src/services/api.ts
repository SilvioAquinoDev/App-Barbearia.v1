import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@barbershop_api_url';

/**
 * Gets the stored custom API URL (set by user in server config screen)
 */
export async function getStoredApiUrl(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Saves a custom API URL to AsyncStorage
 */
export async function setStoredApiUrl(url: string | null): Promise<void> {
  try {
    if (url) {
      await AsyncStorage.setItem(STORAGE_KEY, url);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

/**
 * Determines the API base URL based on environment:
 * - Web: Uses relative path /api (proxy handles routing)
 * - Mobile: Uses stored custom URL > EXPO_PUBLIC_LOCAL_API_URL > EXPO_PUBLIC_BACKEND_URL
 
function getApiBaseUrl(): string {
  if (Platform.OS === 'web') {
    console.log('📡 Using relative API URL: /api');
    return '/api';
  }

  const localApiUrl = process.env.EXPO_PUBLIC_LOCAL_API_URL;
  if (localApiUrl) {
    console.log('📡 Using LOCAL API URL:', localApiUrl);
    return `${localApiUrl}/api`;
  }
  
  const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                     process.env.EXPO_PUBLIC_BACKEND_URL ||
                     'https://barber-mgmt-5.preview.emergentagent.com';
  
  console.log('📡 Using API URL:', backendUrl);
  return `${backendUrl}/api`;
}*/

function getApiBaseUrl(): string {
  if (Platform.OS === 'web') {
    // Para web, usa a URL do backend do .env
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
    console.log('🌐 Web using backend URL:', backendUrl);
    const cleanUrl = backendUrl.replace(/\/$/, '');
    return `${cleanUrl}/api`;
  }

  // PARA MOBILE - PRIORIDADE:
  // 1. URL customizada salva pelo usuário (já tratada no initApiUrl)
  // 2. LOCAL_API_URL do .env (para desenvolvimento)
  // 3. BACKEND_URL do .env (produção)
  
  // Primeiro, verifica se tem URL local configurada no .env
  const localApiUrl = process.env.EXPO_PUBLIC_LOCAL_API_URL; //|| 'http://192.168.1.7:8001';
  if (localApiUrl) {
    console.log('📱 Mobile using LOCAL API URL:', localApiUrl);
    // Garante que não tenha barra no final
    const cleanUrl = localApiUrl.replace(/\/$/, '');
    return `${cleanUrl}/api`;
  }
  
  // Fallback para produção
  const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                     process.env.EXPO_PUBLIC_BACKEND_URL ||
                     'https://barber-manager-26.preview.emergentagent.com';
  
  console.log('📱 Mobile using BACKEND URL (fallback):', backendUrl);
  const cleanUrl = backendUrl.replace(/\/$/, '');
  return `${cleanUrl}/api`;
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Initializes the API client with the stored custom URL (for mobile)
 * Call this on app startup
 */
export async function initApiUrl(): Promise<void> {
  if (Platform.OS === 'web') return;
  
  const storedUrl = await getStoredApiUrl();
  if (storedUrl) {
    const newBase = `${storedUrl}/api`;
    api.defaults.baseURL = newBase;
    console.log('📡 Loaded stored API URL:', newBase);
  }
}

/**
 * Updates the API base URL dynamically (for mobile server config)
 */
export function updateApiBaseUrl(serverUrl: string): void {
  const newBase = `${serverUrl}/api`;
  api.defaults.baseURL = newBase;
  console.log('📡 Updated API URL to:', newBase);
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = (global as any).authToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      (global as any).authToken = null;
    }
    return Promise.reject(error);
  }
);

export default api;






/*import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@barbershop_api_url';

/**
 * Gets the stored custom API URL (set by user in server config screen)
 /
export async function getStoredApiUrl(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Saves a custom API URL to AsyncStorage
 /
export async function setStoredApiUrl(url: string | null): Promise<void> {
  try {
    if (url) {
      await AsyncStorage.setItem(STORAGE_KEY, url);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

/**
 * Determines the API base URL based on environment:
 * - Web: Uses relative path /api (proxy handles routing)
 * - Mobile: Uses stored custom URL > EXPO_PUBLIC_LOCAL_API_URL > EXPO_PUBLIC_BACKEND_URL
 /
function getApiBaseUrl(): string {
  if (Platform.OS === 'web') {
    console.log('📡 Using relative API URL: /api');
    return '/api';
  }

  const localApiUrl = process.env.EXPO_PUBLIC_LOCAL_API_URL;
  if (localApiUrl) {
    console.log('📡 Using LOCAL API URL:', localApiUrl);
    return `${localApiUrl}/api`;
  }
  
  const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                     process.env.EXPO_PUBLIC_BACKEND_URL ||
                     'https://gestao-app-1.preview.emergentagent.com';
  
  console.log('📡 Using API URL:', backendUrl);
  return `${backendUrl}/api`;
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Initializes the API client with the stored custom URL (for mobile)
 * Call this on app startup
 /
export async function initApiUrl(): Promise<void> {
  if (Platform.OS === 'web') return;
  
  const storedUrl = await getStoredApiUrl();
  if (storedUrl) {
    const newBase = `${storedUrl}/api`;
    api.defaults.baseURL = newBase;
    console.log('📡 Loaded stored API URL:', newBase);
  }
}

/**
 * Updates the API base URL dynamically (for mobile server config)
 /
export function updateApiBaseUrl(serverUrl: string): void {
  const newBase = `${serverUrl}/api`;
  api.defaults.baseURL = newBase;
  console.log('📡 Updated API URL to:', newBase);
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = (global as any).authToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't clear authToken on 401 - let AuthContext handle auth state
    // The previous behavior of clearing authToken on any 401 caused race conditions
    return Promise.reject(error);
  }
);

export default api;*/
