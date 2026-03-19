import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
//import api, { getLoyaltyPoints } from '../services/api';
import './Loyalty.css';

export default function Loyalty() {
  const { user } = useAuth();
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

  // Função para normalizar os dados de pontos
  {/*const normalizePointsData = (data, searchEmail) => {
    return {
      client_email: data.client_email || data.client_phone || searchEmail,
      points: data.points || 0,
      total_earned: data.total_earned || 0,
      total_redeemed: data.total_redeemed || 0,
      redemption_threshold: data.redemption_threshold || 100,
      reward_description: data.reward_description || "1 Corte Grátis"
    };
  };*/}

  
  const searchByEmail = async (emailAddress) => {
  const e = emailAddress.trim();
  if (!e) return;

  setLoading(true);
  try {
    console.log('Buscando email:', e);

    // Usar o endpoint correto para buscar por email
    const pointsResponse = await api.get(`/loyalty/client/${encodeURIComponent(e)}`);
    const pointsData = pointsResponse.data;
    
    // Buscar histórico
    let historyData = [];
    try {
      const historyResponse = await api.get(`/loyalty/client/${encodeURIComponent(e)}/history`);
      historyData = historyResponse.data;
    } catch (historyError) {
      console.log('Histórico não encontrado (pode ser cliente novo):', historyError);
    }

    console.log('Resposta pontos:', pointsData);
    
    // Os dados já vêm no formato correto do backend
    setPoints(pointsData);
    setHistory(historyData);
    setSearched(true);
    
  } catch (error) {
    console.error('Erro ao buscar pontos:', error);

    if (error.response?.status === 404) {
      // Cliente não encontrado - criar objeto padrão
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
  
  
  {/*const searchByEmail = async (emailAddress) => {
    const e = emailAddress.trim();
    if (!e) return;

    setLoading(true);
    try {
      console.log('Buscando email:', e);

      // Usando a função getLoyaltyPoints da api.js
      // Nota: A função atual espera telefone, então precisamos adaptar
      
      // Primeiro, vamos tentar buscar por email (você precisará adicionar esta função na api.js)
      // Por enquanto, vamos usar o telefone como fallback
      
      // Tentar buscar por email (se existir endpoint específico)
      let pointsData;
      try {
        // Tenta endpoint de email se existir
        const pointsResponse = await api.get(`/loyalty/client/${encodeURIComponent(e)}`);
        pointsData = pointsResponse.data;
      } catch (emailError) {
        console.log('Endpoint por email não encontrado, tentando por telefone...');
        // Se não existir, usa o telefone (com o email como identificador)
        // Nota: Isso é temporário até criarmos o endpoint correto
        pointsData = await getLoyaltyPoints(e); // A função getLoyaltyPoints espera telefone
      }

      // Buscar histórico
      let historyData = [];
      try {
        const historyResponse = await api.get(`/loyalty/client/${encodeURIComponent(e)}/history`);
        historyData = historyResponse.data;
      } catch (historyError) {
        console.log('Histórico não encontrado:', historyError);
      }

      console.log('Resposta pontos (original):', pointsData);
      
      // Normaliza os dados recebidos
      const normalizedPoints = normalizePointsData(pointsData, e);
      console.log('Pontos normalizados:', normalizedPoints);

      setPoints(normalizedPoints);
      setHistory(historyData);
      setSearched(true);
    } catch (error) {
      console.error('Erro ao buscar pontos:', error);

      if (error.response) {
        console.error('Status do erro:', error.response.status);
        console.error('Dados do erro:', error.response.data);

        if (error.response.status === 404) {
          // Cria um objeto normalizado mesmo para cliente não encontrado
          const defaultPoints = normalizePointsData({
            points: 0,
            total_earned: 0,
            total_redeemed: 0
          }, email);
          
          setPoints(defaultPoints);
          setHistory([]);
          setSearched(true);
        }
      } else if (error.request) {
        console.error('Sem resposta do servidor');
        alert('Erro de conexão com o servidor. Verifique se o backend está rodando.');
      } else {
        console.error('Erro na requisição:', error.message);
      }
    } finally {
      setLoading(false);
    }
  };*/}

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

        {/* Card de busca - descomente se quiser permitir busca manual 
        <Card className="search-card">
          <form onSubmit={searchPoints} className="search-form">
            <h3>{user?.email ? 'Seus pontos' : 'Consultar seus pontos'}</h3>
            <div className="search-row">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite seu e-mail"
                className="search-input"
                data-testid="loyalty-email-input"
                readOnly={!!user?.email}
              />
              {!user?.email && (
                <button
                  type="submit"
                  className="search-btn"
                  data-testid="loyalty-search-btn"
                  disabled={!isValidEmail(email)}
                >
                  Consultar
                </button>
              )}
            </div>
            {user?.email && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                Buscando pontos para: {user.email}
              </p>
            )}
            {email && !isValidEmail(email) && !user?.email && (
              <p style={{ fontSize: '0.85rem', color: 'var(--error-color)', marginTop: '8px' }}>
                Digite um e-mail válido
              </p>
            )}
          </form>
        </Card>*/}

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

              {/* Mostra o email do cliente se disponível */}
              {points.client_email && (
                <div className="client-email" style={{
                  textAlign: 'center',
                  marginBottom: '15px',
                  fontSize: '0.9rem',
                  color: 'var(--text-muted)'
                }}>
                  E-mail: {points.client_email}
                </div>
              )}

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
                      onClick={() => window.alert('Procure o barbeiro para resgatar seu prêmio!')}
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





{/*import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './Loyalty.css';

export default function Loyalty() {
  const { user } = useAuth();
  const [points, setPoints] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(''); // Mudado de phone para email
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    // Busca automática quando o usuário está conectado e possui um email.
    if (user?.email) {
      setEmail(user.email);
      searchByEmail(user.email);
    }
  }, [user]);

  // Função para buscar por email
  const searchByEmail = async (emailAddress) => {
    const e = emailAddress.trim();
    if (!e) return;
    
    setLoading(true);
    try {
      const [pointsRes, historyRes] = await Promise.all([
        api.get(`/loyalty/client/${encodeURIComponent(e)}`), // URL encode para email
        api.get(`/loyalty/client/${encodeURIComponent(e)}/history`),
      ]);
      setPoints(pointsRes.data);
      setHistory(historyRes.data);
      setSearched(true);
    } catch (error) {
      console.error('Erro ao buscar pontos:', error);
      // Se erro 404, significa que não encontrou, mas não precisa mostrar erro
      if (error.response?.status !== 404) {
        // Mostrar erro apenas se não for 404 (não encontrado)
        console.error('Detalhes do erro:', error.response?.data);
      }
    } finally {
      setLoading(false);
    }
  };/


  // Loyalty.jsx - Atualizar função searchByEmail
  const searchByEmail = async (emailAddress) => {
    const e = emailAddress.trim();
    if (!e) return;

    setLoading(true);
    try {
      console.log('Buscando email:', e); // Log para debug

      const [pointsRes, historyRes] = await Promise.all([
        api.get(`/loyalty/client/${encodeURIComponent(e)}`),
        api.get(`/loyalty/client/${encodeURIComponent(e)}/history`),
      ]);

      console.log('Resposta pontos:', pointsRes.data); // Log para debug
      setPoints(pointsRes.data);
      setHistory(historyRes.data);
      setSearched(true);
    } catch (error) {
      console.error('Erro ao buscar pontos:', error);

      if (error.response) {
        // O servidor respondeu com status de erro
        console.error('Status do erro:', error.response.status);
        console.error('Dados do erro:', error.response.data);

        // Se for erro 404, mostra mensagem amigável
        if (error.response.status === 404) {
          setPoints({
            client_email: email,
            points: 0,
            total_earned: 0,
            total_redeemed: 0,
            redemption_threshold: 100,
            reward_description: "1 Corte Grátis"
          });
          setSearched(true);
        }
      } else if (error.request) {
        // A requisição foi feita mas não houve resposta
        console.error('Sem resposta do servidor');
        alert('Erro de conexão com o servidor. Verifique se o backend está rodando.');
      } else {
        // Algo aconteceu na configuração da requisição
        console.error('Erro na requisição:', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Função de busca que usa email
  const searchPoints = async (e) => {
    e?.preventDefault();
    await searchByEmail(email);
  };

  // Função para validar formato de email (opcional)
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

        {/*<Card className="search-card">
          <form onSubmit={searchPoints} className="search-form">
            <h3>{user?.email ? 'Seus pontos' : 'Consultar seus pontos'}</h3>
            <div className="search-row">
              <input
                type="email" // Mudado para email
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite seu e-mail" // Mudado placeholder
                className="search-input"
                data-testid="loyalty-email-input" // Mudado data-testid
                readOnly={!!user?.email}
              />
              {!user?.email && (
                <button
                  type="submit"
                  className="search-btn"
                  data-testid="loyalty-search-btn"
                  disabled={!isValidEmail(email)} // Desabilita se email inválido
                >
                  Consultar
                </button>
              )}
            </div>
            {user?.email && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                Buscando pontos para: {user.email}
              </p>
            )}
            {/* Mostra aviso se email inválido /}
            {email && !isValidEmail(email) && !user?.email && (
              <p style={{ fontSize: '0.85rem', color: 'var(--error-color)', marginTop: '8px' }}>
                Digite um e-mail válido
              </p>
            )}
          </form>
        </Card>/}

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

              {/* Mostra o email do cliente se disponível /}
              {points.client_email && (
                <div className="client-email" style={{
                  textAlign: 'center',
                  marginBottom: '15px',
                  fontSize: '0.9rem',
                  color: 'var(--text-muted)'
                }}>
                  E-mail: {points.client_email}
                </div>
              )}

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
                      onClick={() => window.alert('Procure o barbeiro para resgatar seu prêmio!')}
                      style={{
                        marginTop: '15px',
                        padding: '10px',
                        background: 'var(--success-color)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
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

        {searched && !loading && points && points.points === 0 && (
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

      <style jsx>{`
        .loading-spinner {
          border: 3px solid var(--border-color);
          border-top: 3px solid var(--primary-color);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 10px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .redeem-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        
        .search-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}*/}



/*import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './Loyalty.css';

export default function Loyalty() {
  const { user } = useAuth();
  const [points, setPoints] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    // Auto-search when user is logged in and has a phone
    if (user?.phone) {
      setPhone(user.phone);
      searchByPhone(user.phone);
    }
  }, [user]);

  const searchByPhone = async (phoneNumber) => {
    const p = phoneNumber.trim();
    if (!p) return;
    setLoading(true);
    try {
      const [pointsRes, historyRes] = await Promise.all([
        api.get(`/loyalty/client/${p}`),
        api.get(`/loyalty/client/${p}/history`),
      ]);
      setPoints(pointsRes.data);
      setHistory(historyRes.data);
      setSearched(true);
    } catch (error) {
      console.error('Erro ao buscar pontos:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchPoints = async (e) => {
    e?.preventDefault();
    await searchByPhone(phone);
  };

  return (
    <div className="loyalty-page">
      <Navbar />
      
      <div className="loyalty-container">
        <div className="loyalty-header">
          <h1 data-testid="loyalty-title">Programa de Fidelidade</h1>
          <p>Acumule pontos e troque por beneficios exclusivos</p>
        </div>

        <Card className="search-card">
          <form onSubmit={searchPoints} className="search-form">
            <h3>{user?.phone ? 'Seus pontos' : 'Consultar seus pontos'}</h3>
            <div className="search-row">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Digite seu telefone"
                className="search-input"
                data-testid="loyalty-phone-input"
                readOnly={!!user?.phone}
              />
              {!user?.phone && (
                <button type="submit" className="search-btn" data-testid="loyalty-search-btn">
                  Consultar
                </button>
              )}
            </div>
            {user?.email && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                Buscando pontos para: {user.email}
              </p>
            )}
          </form>
        </Card>

        {loading && <Card><div style={{ textAlign: 'center', padding: '20px' }}>Carregando...</div></Card>}

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
                    <span>{Math.max(points.redemption_threshold - points.points, 0)} pontos faltando</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.min((points.points / points.redemption_threshold) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="reward-desc">
                    Meta: {points.redemption_threshold} pontos = {points.reward_description}
                  </p>
                </div>
              )}
            </Card>

            {history.length > 0 && (
              <>
                <div className="section-title">
                  <h2>Historico de Pontos</h2>
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

        {searched && !loading && !points?.points && (
          <Card>
            <div className="empty-state">
              <span className="empty-icon">&#11088;</span>
              <h3>Nenhum ponto encontrado</h3>
              <p>Faca servicos na barbearia para acumular pontos!</p>
            </div>
          </Card>
        )}

        <Card className="info-card">
          <h3>Como Funciona?</h3>
          <ul>
            <li>Cada R$1 gasto em servicos = 1 ponto</li>
            <li>Acumule pontos automaticamente ao concluir servicos</li>
            <li>Atinja a meta de pontos e resgate seu premio</li>
            <li>Consulte seu saldo usando o telefone cadastrado</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}*/
