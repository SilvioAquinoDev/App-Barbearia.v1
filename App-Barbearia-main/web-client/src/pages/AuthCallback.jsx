/*import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      // Captura o session_id da URL
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.replace('#', '?'));
      const sessionId = params.get('session_id');

      if (!sessionId) {
        alert('Sessão inválida. Tente novamente.');
        navigate('/login');
        return;
      }

      try {
        // Envia o session_id para o backend e recebe o token
        const response = await api.post('/auth/callback', { session_id: sessionId });
        localStorage.setItem('client_token', response.data.session_token);
        await checkAuth();
        setTimeout(() => {
          navigate('/dashboard');
        }, 300);
      } catch (error) {
        alert('Erro ao autenticar. Tente novamente.');
        navigate('/login');
      }
    };
    handleCallback();
    // eslint-disable-next-line
  }, []);

  return (
    <div style={{ textAlign: 'center', marginTop: '40px' }}>
      <h2>Autenticando...</h2>
      <p>Aguarde enquanto finalizamos seu login.</p>
    </div>
  );
}*/

/*import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      // Captura o session_id da URL
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.replace('#', '?'));
      const sessionId = params.get('session_id');

      console.log('📱 Session ID recebido:', sessionId);

      if (!sessionId) {
        alert('Sessão inválida. Tente novamente.');
        navigate('/login');
        return;
      }

      try {
        // CORREÇÃO 1: Rota /auth/session (não /auth/callback)
        // CORREÇÃO 2: withCredentials: true para enviar/receber cookies
        console.log('📡 Enviando session_id para o backend...');
        
        const response = await api.post('/auth/session', 
          { session_id: sessionId },
          { withCredentials: true } // ESSENCIAL!
        );
        
        console.log('✅ Login bem sucedido:', response.data);
        
        // NÃO precisa salvar no localStorage - o cookie é automático!
        // O cookie será setado pelo backend via Set-Cookie header
        
        // Verifica se a autenticação funcionou
        await checkAuth();
        
        // Pequeno delay para garantir que o cookie foi processado
        setTimeout(() => {
          navigate('/dashboard');
        }, 300);
        
      } catch (error) {
        console.error('❌ Erro no callback:', error);
        
        // Mostra mensagem de erro mais detalhada
        if (error.response) {
          console.error('Resposta do servidor:', error.response.data);
          alert(`Erro: ${error.response.data.detail || 'Erro ao autenticar'}`);
        } else if (error.request) {
          alert('Erro de conexão com o servidor');
        } else {
          alert('Erro ao autenticar. Tente novamente.');
        }
        
        navigate('/login');
      }
    };
    
    handleCallback();
  }, [navigate, checkAuth]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2>Autenticando...</h2>
        <p>Aguarde enquanto finalizamos seu login.</p>
        <div style={{ marginTop: '20px' }}>
          <div className="spinner" style={{
            width: '40px',
            height: '40px',
            margin: '0 auto',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}*/




// pages/AuthCallback.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      // Captura o session_id da URL (vem do OAuth)
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.replace('#', '?'));
      const sessionId = params.get('session_id');

      console.log('📱 Session ID recebido:', sessionId);

      if (!sessionId) {
        alert('Sessão inválida. Tente novamente.');
        navigate('/login');
        return;
      }

      try {
        // Envia session_id no body (JSON) - AGORA FUNCIONA!
        const response = await api.post('/auth/session', 
          { session_id: sessionId },  // ← Body JSON
          { withCredentials: true }
        );
        
        console.log('✅ Login bem sucedido:', response.data);
        
        // Verifica se a autenticação funcionou
        await checkAuth();
        
        // Verifica se tem agendamento pendente
        const pendingAppointment = localStorage.getItem('pending_appointment');
        if (pendingAppointment) {
          // Remove da localStorage e redireciona para confirmar
          localStorage.removeItem('pending_appointment');
          navigate('/agendamento/confirmar');
        } else {
          navigate('/dashboard');
        }
        
      } catch (error) {
        console.error('❌ Erro no callback:', error);
        
        if (error.response) {
          console.error('Resposta do servidor:', error.response.data);
          
          // Mostra mensagem de erro detalhada
          const errorMsg = error.response.data.detail || 'Erro ao autenticar';
          if (Array.isArray(errorMsg)) {
            alert(errorMsg.map(e => e.msg).join('\n'));
          } else {
            alert(`Erro: ${errorMsg}`);
          }
        } else if (error.request) {
          alert('Erro de conexão com o servidor. Verifique se o backend está rodando.');
        } else {
          alert('Erro ao autenticar. Tente novamente.');
        }
        
        navigate('/login');
      }
    };
    
    handleCallback();
  }, [navigate, checkAuth]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2>Autenticando...</h2>
        <p>Aguarde enquanto finalizamos seu login.</p>
        <div style={{ marginTop: '20px' }}>
          <div className="spinner" style={{
            width: '40px',
            height: '40px',
            margin: '0 auto',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}