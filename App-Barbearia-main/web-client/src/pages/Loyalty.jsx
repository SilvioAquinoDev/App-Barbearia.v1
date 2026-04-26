import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './Loyalty.css';

export default function Loyalty() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [points, setPoints] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
      searchByEmail(user.email);
    }
  }, [user]);

  const searchByEmail = async (emailAddress) => {
    const e = emailAddress.trim();
    if (!e) return;

    setLoading(true);
    try {
      console.log('Buscando email:', e);

      const pointsResponse = await api.get(`/loyalty/client/${encodeURIComponent(e)}`);
      const pointsData = pointsResponse.data;
      
      let historyData = [];
      try {
        const historyResponse = await api.get(`/loyalty/client/${encodeURIComponent(e)}/history`);
        historyData = historyResponse.data;
      } catch (historyError) {
        console.log('Histórico não encontrado (pode ser cliente novo):', historyError);
      }

      console.log('Resposta pontos:', pointsData);
      
      setPoints(pointsData);
      setHistory(historyData);
      setSearched(true);
      
    } catch (error) {
      console.error('Erro ao buscar pontos:', error);

      if (error.response?.status === 404) {
        const configResponse = await api.get('/loyalty/config').catch(() => null);
        const config = configResponse?.data || {
          redemption_threshold: 100,
          reward_description: "1 Corte Grátis"
        };
        
        setPoints({
          client_email: email,
          client_phone: null,
          client_name: null,
          points: 0,
          total_earned: 0,
          total_redeemed: 0,
          redemption_threshold: config.redemption_threshold,
          reward_description: config.reward_description
        });
        setHistory([]);
        setSearched(true);
      } else if (error.request) {
        console.error('Sem resposta do servidor');
        alert('Erro de conexão com o servidor. Verifique se o backend está rodando.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = () => {
    // Salva no localStorage que o cliente está resgatando um prêmio
    localStorage.setItem('redeemingReward', 'true');
    localStorage.setItem('rewardDescription', points.reward_description);
    localStorage.setItem('clientEmail', points.client_email || email);
    localStorage.setItem('pointsToRedeem', points.redemption_threshold);
    // Navega para o agendamento
    navigate('/agendar');
  };

  const searchPoints = async (e) => {
    e?.preventDefault();
    await searchByEmail(email);
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  return (
    <div className="loyalty-page">
      <Navbar />

      <div className="loyalty-container">
        <div className="loyalty-header">
          <h1 data-testid="loyalty-title">Programa de Fidelidade</h1>
          <p>Acumule pontos e troque por benefícios exclusivos</p>
        </div>

        {loading && (
          <Card>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div className="loading-spinner"></div>
              <p>Carregando...</p>
            </div>
          </Card>
        )}

        {searched && points && !loading && (
          <>
            <Card className="points-card">
              <div className="points-display">
                <div className="points-main">
                  <div className="points-number" data-testid="loyalty-points">{points.points}</div>
                  <div className="points-label">Pontos</div>
                </div>
                <div className="points-info">
                  <div className="info-row">
                    <span>Total ganhos:</span>
                    <strong>{points.total_earned}</strong>
                  </div>
                  <div className="info-row">
                    <span>Total resgatados:</span>
                    <strong>{points.total_redeemed}</strong>
                  </div>
                </div>
              </div>

              {points.redemption_threshold && (
                <div className="progress-section">
                  <div className="progress-header">
                    <span>Progresso para resgate</span>
                    <span>
                      {points.points >= points.redemption_threshold
                        ? 'Meta atingida!'
                        : `${points.redemption_threshold - points.points} pontos faltando`}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min((points.points / points.redemption_threshold) * 100, 100)}%`
                      }}
                    />
                  </div>
                  <p className="reward-desc">
                    Meta: {points.redemption_threshold} pontos = {points.reward_description}
                  </p>
                  {points.points >= points.redemption_threshold && (
                    <button
                      className="redeem-btn"
                      onClick={handleRedeem}
                    >
                      Resgatar Prêmio
                    </button>
                  )}
                </div>
              )}
            </Card>

            {history.length > 0 && (
              <>
                <div className="section-title">
                  <h2>Histórico de Pontos</h2>
                </div>
                <Card>
                  <div className="history-list">
                    {history.map((item) => (
                      <div key={item.id} className="history-item">
                        <div className="history-date">
                          {new Date(item.created_at).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="history-description">{item.description}</div>
                        <div className={`history-points ${item.type === 'earn' ? 'earn' : 'redeem'}`}>
                          {item.type === 'earn' ? '+' : '-'}{item.points} pts
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}
          </>
        )}

        {searched && !loading && points && points.points === 0 && history.length === 0 && (
          <Card>
            <div className="empty-state">
              <span className="empty-icon">⭐</span>
              <h3>Você ainda não tem pontos</h3>
              <p>Faça serviços na barbearia para começar a acumular!</p>
            </div>
          </Card>
        )}

        {searched && !loading && !points && (
          <Card>
            <div className="empty-state">
              <span className="empty-icon">🔍</span>
              <h3>Nenhum registro encontrado</h3>
              <p>Não encontramos pontos para o e-mail: {email}</p>
              <p style={{ marginTop: '10px', fontSize: '0.9rem' }}>
                Comece a acumular pontos fazendo serviços na barbearia!
              </p>
            </div>
          </Card>
        )}

        <Card className="info-card">
          <h3>Como Funciona?</h3>
          <ul>
            <li>Cada R$1 gasto em serviços = 1 ponto</li>
            <li>Acumule pontos automaticamente ao concluir serviços</li>
            <li>Atinja a meta de pontos e resgate seu prêmio</li>
            <li>Consulte seu saldo usando o e-mail cadastrado</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}