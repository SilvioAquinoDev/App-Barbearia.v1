import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './Booking.css';

export default function BookingConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { serviceName, date, time } = location.state || {};

  return (
    <div className="booking-page">
      <Navbar />
      <div className="booking-container">
        <Card className="confirmation-card" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '80px', marginBottom: '20px' }}>✅</div>
          <h1>Agendamento Confirmado!</h1>
          
          {serviceName && date && time && (
            <div style={{ margin: '30px 0', textAlign: 'left', background: '#f5f5f5', padding: '20px', borderRadius: '12px' }}>
              <h3>Detalhes do agendamento:</h3>
              <p><strong>Serviço:</strong> {serviceName}</p>
              <p><strong>Data:</strong> {format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
              <p><strong>Horário:</strong> {time}</p>
            </div>
          )}

          <p style={{ marginBottom: '30px', color: '#666' }}>
            Em breve você receberá uma confirmação por WhatsApp ou email.
          </p>

          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <button
              className="btn-back"
              onClick={() => navigate('/')}
            >
              Voltar para Home
            </button>
            <button
              className="btn-next"
              onClick={() => navigate('/public-booking')}
            >
              Novo Agendamento
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}