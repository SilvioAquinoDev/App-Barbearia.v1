import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './History.css';

export default function History() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [cancellingId, setCancellingId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await api.get('/appointments');
      setAppointments(res.data.sort((a, b) => 
        new Date(b.scheduled_time) - new Date(a.scheduled_time)
      ));
    } catch (error) {
      console.error('Erro ao carregar historico:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'Pendente', class: 'pending' },
      confirmed: { text: 'Confirmado', class: 'confirmed' },
      completed: { text: 'Concluido', class: 'completed' },
      cancelled: { text: 'Cancelado', class: 'cancelled' },
    };
    return badges[status] || { text: status, class: '' };
  };

  const handleCancelClick = (appointment) => {
    // Só permite cancelar agendamentos pendentes ou confirmados
    if (appointment.status === 'cancelled' || appointment.status === 'completed') {
      setErrorMessage('Este agendamento não pode ser cancelado');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }
    
    setSelectedAppointment(appointment);
    setShowConfirmModal(true);
  };

  const confirmCancel = async () => {
    if (!selectedAppointment) return;
    
    setCancellingId(selectedAppointment.id);
    setShowConfirmModal(false);
    
    try {
      await api.cancelAppointment(selectedAppointment.id);
      // Recarregar os dados após cancelamento
      await loadData();
    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error);
      setErrorMessage('Erro ao cancelar agendamento. Tente novamente.');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setCancellingId(null);
      setSelectedAppointment(null);
    }
  };

  const cancelCancel = () => {
    setShowConfirmModal(false);
    setSelectedAppointment(null);
    setErrorMessage('');
  };

  const filteredAppointments = activeTab === 'all' 
    ? appointments 
    : appointments.filter(a => a.status === activeTab);

  if (loading) {
    return (
      <div className="history-page">
        <Navbar />
        <div className="history-container"><p>Carregando...</p></div>
      </div>
    );
  }

  return (
    <div className="history-page">
      <Navbar />
      
      <div className="history-container">
        <div className="history-header">
          <h1 data-testid="history-title">Meu Historico</h1>
          <p>Acompanhe todos os seus agendamentos e servicos</p>
          {user?.email && (
            <p style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '4px' }}>
              Agendamentos de: {user.email}
            </p>
          )}
        </div>

        {errorMessage && (
          <div className="error-message" style={{
            backgroundColor: '#ffebee',
            color: '#c62828',
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            {errorMessage}
          </div>
        )}

        <div className="tabs">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'pending', label: 'Pendentes' },
            { key: 'confirmed', label: 'Confirmados' },
            { key: 'completed', label: 'Concluidos' },
          ].map(tab => (
            <button
              key={tab.key}
              className={`tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
              data-testid={`tab-${tab.key}`}
            >
              {tab.label} ({tab.key === 'all' ? appointments.length : appointments.filter(a => a.status === tab.key).length})
            </button>
          ))}
        </div>

        <div className="history-list">
          {filteredAppointments.length === 0 ? (
            <Card>
              <div className="empty-state">
                <span className="empty-icon">&#128197;</span>
                <h3>Nenhum agendamento encontrado</h3>
                <p>Faca seu primeiro agendamento para comecar</p>
              </div>
            </Card>
          ) : (
            filteredAppointments.map((appointment) => {
              const badge = getStatusBadge(appointment.status);
              const isCancellable = appointment.status === 'pending' || appointment.status === 'confirmed';
              const isCancelling = cancellingId === appointment.id;
              
              return (
                <Card key={appointment.id}>
                  <div className="history-item" data-testid={`appointment-${appointment.id}`}>
                    <div className="history-date">
                      <div className="date-box">
                        <div className="date-day">
                          {format(new Date(appointment.scheduled_time), 'd')}
                        </div>
                        <div className="date-month">
                          {format(new Date(appointment.scheduled_time), 'MMM', { locale: ptBR })}
                        </div>
                      </div>
                    </div>
                    <div className="history-details">
                      <h3>
                        {format(new Date(appointment.scheduled_time), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </h3>
                      <p className="history-time">
                        Horario: {format(new Date(appointment.scheduled_time), 'HH:mm')}
                      </p>
                      {appointment.service_name && (
                        <p className="history-service">
                          {appointment.service_name}
                          {appointment.service_price != null && (
                            <span className="service-price">
                              {' '}— R$ {Number(appointment.service_price).toFixed(2).replace('.', ',')}
                            </span>
                          )}
                        </p>
                      )}
                      {appointment.notes && (
                        <p className="history-notes">{appointment.notes}</p>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '8px' }}>
                        <div className={`status-badge ${badge.class}`}>
                          {badge.text}
                        </div>
                        {isCancellable && (
                          <button
                            onClick={() => handleCancelClick(appointment)}
                            disabled={isCancelling}
                            className="cancel-button"
                            style={{
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              padding: '4px 12px',
                              borderRadius: '4px',
                              cursor: isCancelling ? 'not-allowed' : 'pointer',
                              fontSize: '0.8rem',
                              transition: 'all 0.3s'
                            }}
                            onMouseEnter={(e) => {
                              if (!isCancelling) e.target.style.backgroundColor = '#c82333';
                            }}
                            onMouseLeave={(e) => {
                              if (!isCancelling) e.target.style.backgroundColor = '#dc3545';
                            }}
                          >
                            {isCancelling ? 'Cancelando...' : 'Cancelar'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Modal de confirmação */}
      {showConfirmModal && selectedAppointment && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginBottom: '16px', color: '#333' }}>Confirmar Cancelamento</h3>
            <p style={{ marginBottom: '16px', color: '#666' }}>
              Tem certeza que deseja cancelar o agendamento do dia{' '}
              {format(new Date(selectedAppointment.scheduled_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}?
            </p>
            <p style={{ marginBottom: '24px', color: '#999', fontSize: '0.9rem' }}>
              Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={cancelCancel}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmCancel}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}








/*import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './History.css';

export default function History() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await api.get('/appointments');
      setAppointments(res.data.sort((a, b) => 
        new Date(b.scheduled_time) - new Date(a.scheduled_time)
      ));
    } catch (error) {
      console.error('Erro ao carregar historico:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'Pendente', class: 'pending' },
      confirmed: { text: 'Confirmado', class: 'confirmed' },
      completed: { text: 'Concluido', class: 'completed' },
      cancelled: { text: 'Cancelado', class: 'cancelled' },
    };
    return badges[status] || { text: status, class: '' };
  };

  const filteredAppointments = activeTab === 'all' 
    ? appointments 
    : appointments.filter(a => a.status === activeTab);

  if (loading) {
    return (
      <div className="history-page">
        <Navbar />
        <div className="history-container"><p>Carregando...</p></div>
      </div>
    );
  }

  return (
    <div className="history-page">
      <Navbar />
      
      <div className="history-container">
        <div className="history-header">
          <h1 data-testid="history-title">Meu Historico</h1>
          <p>Acompanhe todos os seus agendamentos e servicos</p>
          {user?.email && (
            <p style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '4px' }}>
              Mostrando agendamentos de: {user.email}
            </p>
          )}
        </div>

        <div className="tabs">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'pending', label: 'Pendentes' },
            { key: 'confirmed', label: 'Confirmados' },
            { key: 'completed', label: 'Concluidos' },
          ].map(tab => (
            <button
              key={tab.key}
              className={`tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
              data-testid={`tab-${tab.key}`}
            >
              {tab.label} ({tab.key === 'all' ? appointments.length : appointments.filter(a => a.status === tab.key).length})
            </button>
          ))}
        </div>

        <div className="history-list">
          {filteredAppointments.length === 0 ? (
            <Card>
              <div className="empty-state">
                <span className="empty-icon">&#128197;</span>
                <h3>Nenhum agendamento encontrado</h3>
                <p>Faca seu primeiro agendamento para comecar</p>
              </div>
            </Card>
          ) : (
            filteredAppointments.map((appointment) => {
              const badge = getStatusBadge(appointment.status);
              return (
                <Card key={appointment.id}>
                  <div className="history-item" data-testid={`appointment-${appointment.id}`}>
                    <div className="history-date">
                      <div className="date-box">
                        <div className="date-day">
                          {format(new Date(appointment.scheduled_time), 'd')}
                        </div>
                        <div className="date-month">
                          {format(new Date(appointment.scheduled_time), 'MMM', { locale: ptBR })}
                        </div>
                      </div>
                    </div>
                    <div className="history-details">
                      <h3>
                        {format(new Date(appointment.scheduled_time), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </h3>
                      <p className="history-time">
                        Horario: {format(new Date(appointment.scheduled_time), 'HH:mm')}
                      </p>
                      {appointment.service_name && (
                        <p className="history-service">
                          {appointment.service_name}
                          {appointment.service_price != null && (
                            <span className="service-price">
                              {' '}— R$ {Number(appointment.service_price).toFixed(2).replace('.', ',')}
                            </span>
                          )}
                        </p>
                      )}
                      {appointment.notes && (
                        <p className="history-notes">{appointment.notes}</p>
                      )}
                      <div className={`status-badge ${badge.class}`}>
                        {badge.text}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}*/
