import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import api, { getActivePromotions } from '../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import './Dashboard.css';

export default function Dashboard() {
  const { user, setUser } = useAuth();
  const [stats, setStats] = useState({
    upcomingAppointments: [],
    totalPoints: 0,
    activePromotions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [birthDateInput, setBirthDateInput] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (user && (!user.phone || !user.birth_date)) {
      setShowProfileModal(true);
      if (user.phone) setPhoneInput(user.phone);
    }
  }, [user]);

  {/*const loadData = async () => {
    try {
      const appointmentsRes = await api.get('/appointments');
      const upcoming = appointmentsRes.data
        .filter((a) => new Date(a.scheduled_time) > new Date())
        .sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time))
        .slice(0, 3);

      setStats({
        upcomingAppointments: upcoming,
        totalPoints: 150,
        activePromotions: 3,
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };*/}

  const loadData = async () => {
    try {
      console.log('=== CARREGANDO DASHBOARD ===');
      
      // Buscar agendamentos
      const appointmentsRes = await api.get('/appointments');
      const upcoming = appointmentsRes.data
        .filter((a) => new Date(a.scheduled_time) > new Date())
        .sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time))
        .slice(0, 3);

      // Buscar pontos do usuário logado
      /*let totalPoints = 0;
      try {
        const phoneNumber = user?.phone || user?.telefone;
        if (phoneNumber) {
          const pointsRes = await api.get(`/loyalty/client/${phoneNumber}`);
          totalPoints = pointsRes.data.points || 0;
        }
      } catch (error) {
        console.log('Usuário ainda não tem pontos');
      }*/

      // Buscar pontos do usuário logado
let totalPoints = 0;
try {
  // Prioridade 1: Buscar por email (identificador principal)
  if (user?.email) {
    console.log('🔍 Buscando pontos por email:', user.email);
    const pointsRes = await api.get(`/loyalty/client/${encodeURIComponent(user.email)}`);
    totalPoints = pointsRes.data.points || 0;
    console.log('✅ Pontos encontrados por email:', totalPoints);
  }
  // Prioridade 2: Se não tiver email, tenta por telefone (fallback)
  else if (user?.phone || user?.telefone) {
    const phoneNumber = user?.phone || user?.telefone;
    console.log('🔍 Buscando pontos por telefone:', phoneNumber);
    const pointsRes = await api.get(`/loyalty/client/${phoneNumber}`);
    totalPoints = pointsRes.data.points || 0;
    console.log('✅ Pontos encontrados por telefone:', totalPoints);
  }
} catch (error) {
  if (error.response?.status === 404) {
    console.log('ℹ️ Usuário ainda não tem pontos no programa de fidelidade');
  } else {
    console.error('❌ Erro ao buscar pontos:', error);
  }
}

      // Buscar promoções ativas - AGORA CORRIGIDO
      console.log('Buscando promoções ativas...');
      const activePromotions = await getActivePromotions();
      console.log('Promoções ativas encontradas:', activePromotions);

      setStats({
        upcomingAppointments: upcoming,
        totalPoints: totalPoints,
        activePromotions: activePromotions.length,
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    const phone = phoneInput.trim();
    const birthDate = birthDateInput.trim();

    if (!phone || phone.length < 8) {
      alert('Informe um telefone valido com pelo menos 8 digitos');
      return;
    }

    setSavingProfile(true);
    try {
      const payload = { phone };
      if (birthDate) payload.birth_date = birthDate;
      const res = await api.put('/auth/update-phone', payload);
      setUser(res.data);
      setShowProfileModal(false);
    } catch (err) {
      alert(err?.response?.data?.detail || 'Erro ao salvar dados');
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <Navbar />
        <div className="dashboard-container">
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <Navbar />

      {/* Profile Data Collection Modal */}
      {showProfileModal && (
        <div className="phone-modal-overlay" data-testid="profile-modal">
          <div className="phone-modal">
            <div className="phone-modal-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h2>Complete seu Perfil</h2>
            <p>Para uma melhor experiencia, complete suas informacoes.</p>

            {!user?.phone && (
              <>
                <label className="input-label" htmlFor="phone-input">Telefone / WhatsApp</label>
                <input
                  id="phone-input"
                  type="tel"
                  className="phone-input"
                  placeholder="(00) 00000-0000"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  data-testid="phone-input"
                  autoFocus
                />
              </>
            )}

            {!user?.birth_date && (
              <>
                <label className="input-label" htmlFor="birthdate-input">Data de Nascimento</label>
                <input
                  id="birthdate-input"
                  type="date"
                  className="phone-input"
                  value={birthDateInput}
                  onChange={(e) => setBirthDateInput(e.target.value)}
                  data-testid="birthdate-input"
                />
              </>
            )}

            <div className="phone-modal-actions">
              <button
                className="btn-save-phone"
                onClick={handleSaveProfile}
                disabled={savingProfile}
                data-testid="save-profile-btn"
              >
                {savingProfile ? 'Salvando...' : 'Salvar'}
              </button>
              {/*<button
                className="btn-skip-phone"
                onClick={() => setShowProfileModal(false)}
                data-testid="skip-profile-btn"
              >
                Depois
              </button>*/}
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Ola, {user?.name}!</h1>
          <p>Bem-vindo a sua area pessoal</p>
        </div>

        <h2>Ações Rápidas</h2>
        <div className="stats-grid">
          <Link to="/historico" className="stat-card">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 20V10M12 20V4M6 20v-6" />
              </svg>
            </div>
            <div className="stat-info">
              <h3>Histórico</h3>
              <p>Ver todos os serviços</p>
            </div>
          </Link>

          <Link to="/fidelidade" className="stat-card">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div className="stat-info">
              <h3>{stats.totalPoints} {stats.totalPoints === 1 ? 'Ponto' : 'Pontos'}</h3>
              <p>Programa de fidelidade</p>
            </div>
          </Link>

          <Link to="/promocoes" className="stat-card">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            </div>
            <div className="stat-info">
              <h3>{stats.activePromotions} {stats.activePromotions === 1 ? 'Promoção' : 'Promoções'}</h3>
              <p>{stats.activePromotions > 0 ? 'Ofertas disponíveis' : 'Nenhuma oferta no momento'}</p>
            </div>
          </Link>

          <Link to="/agendar" className="stat-card primary">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className="stat-info">
              <h3>Novo Agendamento</h3>
              <p>Agendar horário</p>
            </div>
          </Link>
        </div>

        {/*<div className="stats-grid">
          <Link to="/historico" className="stat-card">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
            </div>
            <div className="stat-info">
              <h3>Historico</h3>
              <p>Ver todos os servicos</p>
            </div>
          </Link>

          <Link to="/fidelidade" className="stat-card">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div className="stat-info">
              <h3>{stats.totalPoints} Pontos</h3>
              <p>Programa de fidelidade</p>
            </div>
          </Link>

          <Link to="/promocoes" className="stat-card">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            </div>
            <div className="stat-info">
              <h3>{stats.activePromotions} Promocoes</h3>
              <p>Ofertas disponiveis</p>
            </div>
          </Link>

          <Link to="/agendar" className="stat-card primary">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div className="stat-info">
              <h3>Novo Agendamento</h3>
              <p>Agendar horario</p>
            </div>
          </Link>
        </div>*/}

        <Card>
          <div className="section-header">
            <h2>Proximos Agendamentos</h2>
            <Link to="/historico">Ver todos</Link>
          </div>

          {stats.upcomingAppointments.length === 0 ? (
            <div className="empty-state">
              <p>Nenhum agendamento proximo</p>
              <Link to="/agendar" className="btn-primary">
                Agendar Agora
              </Link>
            </div>
          ) : (
            <div className="appointments-list">
              {stats.upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="appointment-item">
                  <div className="appointment-date">
                    <div className="date-day">
                      {format(new Date(appointment.scheduled_time), 'd')}
                    </div>
                    <div className="date-month">
                      {format(new Date(appointment.scheduled_time), 'MMM', { locale: ptBR })}
                    </div>
                  </div>
                  <div className="appointment-info">
                    <h3>{format(new Date(appointment.scheduled_time), 'HH:mm')}</h3>
                    <p>Status: {appointment.status}</p>
                  </div>
                  <div className={`appointment-status ${appointment.status}`}>
                    {appointment.status === 'pending' && 'Pendente'}
                    {appointment.status === 'confirmed' && 'Confirmado'}
                    {appointment.status === 'completed' && 'Concluido'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/*<div className="quick-actions">
          <h2>Acoes Rapidas</h2>
          <div className="actions-grid">
            <Link to="/agendar" className="action-card">
              <span className="action-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </span>
              <h3>Agendar Horario</h3>
            </Link>
            <Link to="/promocoes" className="action-card">
              <span className="action-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
              </span>
              <h3>Ver Promocoes</h3>
            </Link>
            <Link to="/fidelidade" className="action-card">
              <span className="action-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </span>
              <h3>Meus Pontos</h3>
            </Link>
            <Link to="/historico" className="action-card">
              <span className="action-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
              </span>
              <h3>Historico</h3>
            </Link>
          </div>
        </div>*/}
      </div>
    </div>
  );
}
