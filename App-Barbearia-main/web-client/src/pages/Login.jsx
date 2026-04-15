import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import './Login.css';

const AUTH_URL = 'https://auth.emergentagent.com';

export default function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect to dashboard
  if (user) {
    navigate('/dashboard');
    return null;
  }

  const handleGoogleLogin = () => {
    const redirectUrl = `${window.location.origin}/auth-callback`;
    const authUrl = `${AUTH_URL}/?redirect=${encodeURIComponent(redirectUrl)}`;
    window.location.href = authUrl;
  };

  return (
    <div className="login-page">
      <Navbar />
      <div className="login-container">
        <Card className="login-card">
          <div className="login-header">
            <h1>Área do Cliente</h1>
            <p>Faça login para acessar seus benefícios exclusivos</p>
          </div>

          <div className="login-benefits">
            <div className="benefit-item">
              <span className="benefit-icon">🎁</span>
              <span>Programa de Fidelidade</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">📊</span>
              <span>Histórico de Serviços</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">🏷️</span>
              <span>Promoções Exclusivas</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">❌</span>
              <span>Cancelamento sem Burocracia</span>
            </div>
          </div>

          <button className="google-login-btn" onClick={handleGoogleLogin}>
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Entrar com Google
          </button>

          {/*<div className="login-divider">
            <span>ou</span>
          </div>

          <Link to="/agendar" className="public-booking-link">
            Agendar sem fazer login
          </Link>*/}
        </Card>
      </div>
    </div>
  );
}
