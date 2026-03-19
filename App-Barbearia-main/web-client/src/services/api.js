/*import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://cutflow-8.preview.emergentagent.com/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  withCredentials: true,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('client_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('client_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;*/

/*/ services/api.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://cutflow-8.preview.emergentagent.com/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  withCredentials: true, // ← Mantém isso para enviar cookies
  headers: {
    'Content-Type': 'application/json',
  }
});

// REMOVER o request interceptor que adiciona token do localStorage
// O cookie é enviado automaticamente com withCredentials: true

// Response interceptor - apenas para tratar erros 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log('🚫 Não autenticado, redirecionando para login...');
      // Não remove client_token porque não usamos mais localStorage
      // Apenas redireciona se não estiver já na página de login
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;*/




// services/api.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://cutflow-8.preview.emergentagent.com/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Response interceptor - APENAS log, sem redirecionamento automático
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log('🚫 Erro 401 - Não autenticado');
      // NÃO redirecionar aqui! Deixe o componente decidir
    }
    return Promise.reject(error);
  }
);

export default api;
