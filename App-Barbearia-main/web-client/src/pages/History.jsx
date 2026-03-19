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
}
