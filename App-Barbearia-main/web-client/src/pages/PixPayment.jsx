import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import Card from '../components/Card';

export default function PixPayment() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const appointmentId = searchParams.get('appointment_id');
  const amount = searchParams.get('amount');
  const serviceName = searchParams.get('service');

  const [paymentData, setPaymentData] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const intervalRef = useRef(null);

  const createPixPayment = async () => {
    if (!appointmentId || !amount) {
      setError('Dados do agendamento incompletos');
      return;
    }
    setStatus('creating');
    try {
      const res = await api.post('/payments/create-pix', {
        appointment_id: parseInt(appointmentId),
        amount: parseFloat(amount),
        payer_email: user?.email || 'cliente@email.com',
        payer_name: user?.name || 'Cliente',
        description: serviceName ? `Agendamento: ${serviceName}` : 'Agendamento Barbearia',
      });
      setPaymentData(res.data);
      setStatus('pending');
      startPolling(res.data.payment_id);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Erro ao criar pagamento Pix');
      setStatus('error');
    }
  };

  const startPolling = (paymentId) => {
    intervalRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/payments/status/${paymentId}`);
        if (res.data.status === 'approved') {
          setStatus('approved');
          clearInterval(intervalRef.current);
        }
      } catch {}
    }, 5000);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Codigo Pix copiado!');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Navbar />
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px' }}>
        <Card style={{ padding: 24 }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>
              <svg width="48" height="48" viewBox="0 0 512 512" fill="none">
                <path d="M112.57 391.19c20.056 0 38.928-7.808 53.12-22l76.693-76.692c5.385-5.404 14.765-5.384 20.15 0l76.989 76.989c14.191 14.191 33.063 22 53.12 22h8.077l-97.138 97.138c-30.326 30.327-79.505 30.327-109.831 0L97.166 391.19h15.404z" fill="#32BCAD"/>
                <path d="M112.57 120.81c20.056 0 38.928 7.808 53.12 22l76.693 76.692c5.551 5.57 14.6 5.57 20.15 0l76.989-76.989c14.191-14.191 33.063-22 53.12-22h8.077l-97.138-97.138c-30.326-30.326-79.505-30.326-109.831 0L97.166 120.81h15.404z" fill="#32BCAD"/>
                <path d="M416.588 301.37l-41.898-41.898c-2.366-2.366-2.366-6.283 0-8.65l41.898-41.898c14.191-14.191 22-33.063 22-53.12v-8.076l-71.608 71.608c-5.385 5.385-14.765 5.385-20.15 0l-76.989-76.989c-14.191-14.191-33.063-22-53.12-22s-38.928 7.808-53.12 22l-76.693 76.693c-5.551 5.551-14.6 5.551-20.15 0l-71.312-71.312v8.076c0 20.056 7.808 38.928 22 53.12l41.898 41.898c2.366 2.366 2.366 6.283 0 8.65l-41.898 41.898c-14.192 14.192-22 33.063-22 53.12v8.077l71.312-71.312c5.385-5.385 14.765-5.385 20.15 0l76.693 76.693c14.191 14.191 33.063 22 53.12 22s38.928-7.808 53.12-22l76.989-76.989c5.551-5.551 14.6-5.551 20.15 0l71.608 71.608v-8.077c0-20.056-7.808-38.928-22-53.12z" fill="#32BCAD"/>
              </svg>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Pagamento via Pix</h2>
            {serviceName && <p style={{ color: '#666', margin: '4px 0 0' }}>{serviceName}</p>}
          </div>

          {/* Amount */}
          {amount && (
            <div style={{ textAlign: 'center', padding: '16px 0', borderTop: '1px solid #eee', borderBottom: '1px solid #eee', marginBottom: 24 }}>
              <p style={{ color: '#666', fontSize: 14, margin: 0 }}>Valor</p>
              <p style={{ fontSize: 32, fontWeight: 700, color: '#32BCAD', margin: '4px 0 0' }}>
                R$ {parseFloat(amount).toFixed(2)}
              </p>
            </div>
          )}

          {/* States */}
          {status === 'idle' && (
            <button
              onClick={createPixPayment}
              data-testid="create-pix-btn"
              style={{
                width: '100%', padding: '14px', backgroundColor: '#32BCAD', color: 'white',
                border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Gerar QR Code Pix
            </button>
          )}

          {status === 'creating' && (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <div className="spinner" style={{ margin: '0 auto 12px', width: 36, height: 36, border: '3px solid #eee', borderTopColor: '#32BCAD', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ color: '#666' }}>Gerando pagamento...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {status === 'pending' && paymentData && (
            <div style={{ textAlign: 'center' }}>
              {paymentData.qr_code_base64 && (
                <div style={{ marginBottom: 16 }}>
                  <img
                    src={`data:image/png;base64,${paymentData.qr_code_base64}`}
                    alt="QR Code Pix"
                    style={{ width: 220, height: 220, borderRadius: 8 }}
                    data-testid="pix-qr-code"
                  />
                </div>
              )}

              {paymentData.copy_paste && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ color: '#666', fontSize: 14, marginBottom: 8 }}>Ou copie o codigo Pix:</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      readOnly
                      value={paymentData.copy_paste}
                      data-testid="pix-copy-paste"
                      style={{
                        flex: 1, padding: '10px 12px', border: '1px solid #ddd',
                        borderRadius: 8, fontSize: 12, backgroundColor: '#f9f9f9',
                      }}
                    />
                    <button
                      onClick={() => copyToClipboard(paymentData.copy_paste)}
                      data-testid="pix-copy-btn"
                      style={{
                        padding: '10px 16px', backgroundColor: '#32BCAD', color: 'white',
                        border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
                      }}
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              )}

              <div style={{ padding: '12px 16px', backgroundColor: '#fffde7', borderRadius: 8, marginTop: 16 }}>
                <p style={{ color: '#f57f17', fontSize: 13, margin: 0 }}>
                  Aguardando pagamento... O status sera atualizado automaticamente.
                </p>
              </div>
            </div>
          )}

          {status === 'approved' && (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>&#9989;</div>
              <h3 style={{ color: '#2e7d32', margin: 0 }}>Pagamento Confirmado!</h3>
              <p style={{ color: '#666', marginTop: 8 }}>Seu agendamento foi confirmado com sucesso.</p>
              <Link
                to="/dashboard"
                style={{
                  display: 'inline-block', marginTop: 16, padding: '12px 24px',
                  backgroundColor: '#32BCAD', color: 'white', borderRadius: 8,
                  textDecoration: 'none', fontWeight: 600,
                }}
              >
                Ir para o Dashboard
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>&#10060;</div>
              <h3 style={{ color: '#c62828', margin: 0 }}>Erro no Pagamento</h3>
              <p style={{ color: '#666', marginTop: 8 }}>{error}</p>
              <button
                onClick={() => { setStatus('idle'); setError(''); }}
                style={{
                  marginTop: 16, padding: '12px 24px', backgroundColor: '#32BCAD',
                  color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
                }}
              >
                Tentar Novamente
              </button>
            </div>
          )}

          {/* Back link */}
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Link to="/agendar" style={{ color: '#32BCAD', textDecoration: 'none', fontSize: 14 }}>
              Voltar ao agendamento
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
