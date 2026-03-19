import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import './AuthCallback.css';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { handleOAuthCallback } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    processCallback();
  }, []);

  const processCallback = async () => {
    try {
      const url = window.location.href;
      console.log('Auth callback URL:', url);

      let sessionId = '';

      // Extract session_id from hash: #session_id=xxx
      if (url.includes('#session_id=')) {
        sessionId = url.split('#session_id=')[1].split('&')[0];
      }

      // Extract from query: ?session_id=xxx
      if (!sessionId && url.includes('?session_id=')) {
        sessionId = url.split('?session_id=')[1].split('&')[0].split('#')[0];
      }

      // Using URLSearchParams
      if (!sessionId) {
        const urlObj = new URL(url);
        sessionId = urlObj.searchParams.get('session_id') || '';
        if (!sessionId && urlObj.hash) {
          const hashParams = new URLSearchParams(urlObj.hash.substring(1));
          sessionId = hashParams.get('session_id') || '';
        }
      }

      if (!sessionId) {
        setError('Sessão não encontrada. Tente fazer login novamente.');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      console.log('Session ID found:', sessionId);
      await handleOAuthCallback(sessionId);
      navigate('/dashboard');
    } catch (err) {
      console.error('Auth callback error:', err);
      setError('Erro na autenticação. Tente novamente.');
      setTimeout(() => navigate('/login'), 3000);
    }
  };

  return (
    <div className="auth-callback-page">
      <Navbar />
      <div className="auth-callback-container">
        {error ? (
          <>
            <div className="callback-icon error">⚠️</div>
            <h2>{error}</h2>
            <p>Redirecionando para o login...</p>
          </>
        ) : (
          <>
            <div className="callback-spinner"></div>
            <h2>Autenticando...</h2>
            <p>Aguarde enquanto finalizamos seu login</p>
          </>
        )}
      </div>
    </div>
  );
}
