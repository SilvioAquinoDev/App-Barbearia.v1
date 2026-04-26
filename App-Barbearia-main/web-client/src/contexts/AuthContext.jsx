import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

const AUTH_URL = 'https://auth.emergentagent.com';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('client_token');
    if (token) {
      try {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await api.get('/auth/me');
        setUser(response.data);
      } catch {
        localStorage.removeItem('client_token');
        delete api.defaults.headers.common['Authorization'];
      }
    }
    setLoading(false);
  };

  const handleOAuthCallback = async (sessionId) => {
    try {
      const response = await api.post('/auth/session', null, {
        params: { session_id: sessionId }
      });
      const { user: userData, session_token } = response.data;
      localStorage.setItem('client_token', session_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${session_token}`;
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw error;
    }
  };

  const startLogin = () => {
    const redirectUrl = `${window.location.origin}/auth-callback`;
    window.location.href = `${AUTH_URL}/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('client_token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout, checkAuth, handleOAuthCallback, startLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}