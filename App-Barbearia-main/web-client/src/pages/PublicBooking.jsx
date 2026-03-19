import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import api from '../services/api';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './Booking.css'; // Reusa o mesmo CSS

export default function PublicBooking() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form data
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');

  // Estado para controle de seleção de data por índice
  const [selectedDateIndex, setSelectedDateIndex] = useState(null);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const response = await api.get('/services');
      setServices(response.data);
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
      alert('Erro ao carregar serviços');
    }
  };

  const handleServiceSelect = (service) => {
    console.log('Serviço selecionado:', service);
    setSelectedService(service);
  };

  const availableDates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1));

  const availableTimes = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
  ];

  const handleSubmit = async () => {
    if (!clientName || !clientPhone) {
      alert('Preencha nome e telefone');
      return;
    }

    setLoading(true);
    try {
      const [hours, minutes] = selectedTime.split(':');
      const scheduledTime = setMinutes(setHours(selectedDate, parseInt(hours)), parseInt(minutes));

      const appointmentData = {
        service_id: selectedService.id,
        scheduled_time: scheduledTime.toISOString(),
        client_name: clientName,
        client_phone: clientPhone,
        client_email: clientEmail || null, // Se não tiver email, envia null
        notes: notes,
        is_guest: true // Indica que é um agendamento de visitante
      };

      // Envia diretamente para o backend sem verificar login
      await api.post('/public-appointments', appointmentData); // Endpoint público
      
      alert('Agendamento realizado com sucesso! Em breve você receberá uma confirmação.');
      
      // Opcional: Limpar dados ou redirecionar
      navigate('/agendamento-concluido', { 
        state: { 
          serviceName: selectedService.name,
          date: selectedDate,
          time: selectedTime 
        }
      });

    } catch (error) {
      console.error('Erro ao agendar:', error);
      alert('Erro ao realizar agendamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="booking-page">
      <Navbar />

      <div className="booking-container">
        <div className="booking-header">
          <h1>Agendar Horário</h1>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Faça seu agendamento de forma rápida e fácil
          </p>
          <div className="booking-steps">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Serviço</div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Data</div>
            <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Horário</div>
            <div className={`step ${step >= 4 ? 'active' : ''}`}>4. Dados</div>
          </div>
        </div>

        {/* Step 1: Select Service */}
        {step === 1 && (
          <div className="booking-step">
            <h2>Escolha o Serviço</h2>
            <div className="services-grid">
              {services.map((service) => (
                <Card
                  key={service.id}
                  className={`service-card ${selectedService?.id === service.id ? 'selected' : ''}`}
                  onClick={() => handleServiceSelect(service)}
                >
                  <h3>{service.name}</h3>
                  {service.description && <p>{service.description}</p>}
                  <div className="service-info">
                    <span className="price">R$ {service.price?.toFixed(2)}</span>
                    <span className="duration">{service.duration_minutes || service.duration} min</span>
                  </div>
                </Card>
              ))}
            </div>
            <button
              className="btn-next"
              onClick={() => setStep(2)}
              disabled={!selectedService}
            >
              Próximo
            </button>
          </div>
        )}

        {/* Step 2: Select Date */}
        {step === 2 && (
          <div className="booking-step">
            <h2>Escolha a Data</h2>
            <div className="dates-grid">
              {availableDates.map((date, index) => (
                <div
                  key={index}
                  className={`date-card ${selectedDateIndex === index ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedDateIndex(index);
                    setSelectedDate(date);
                  }}
                >
                  <div className="date-day">{format(date, 'EEE', { locale: ptBR })}</div>
                  <div className="date-number">{format(date, 'd')}</div>
                  <div className="date-month">{format(date, 'MMM', { locale: ptBR })}</div>
                </div>
              ))}
            </div>

            <div className="booking-navigation">
              <button className="btn-back" onClick={() => setStep(1)}>Voltar</button>
              <button
                className="btn-next"
                onClick={() => setStep(3)}
                disabled={!selectedDate}
              >
                Próximo
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Select Time */}
        {step === 3 && (
          <div className="booking-step">
            <h2>Escolha o Horário</h2>
            <div className="times-grid">
              {availableTimes.map((time) => (
                <div
                  key={time}
                  className={`time-card ${selectedTime === time ? 'selected' : ''}`}
                  onClick={() => setSelectedTime(time)}
                >
                  {time}
                </div>
              ))}
            </div>
            <div className="booking-navigation">
              <button className="btn-back" onClick={() => setStep(2)}>Voltar</button>
              <button
                className="btn-next"
                onClick={() => setStep(4)}
                disabled={!selectedTime}
              >
                Próximo
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Client Info */}
        {step === 4 && (
          <div className="booking-step">
            <h2>Seus Dados</h2>

            {/* Banner informativo para agendamento público */}
            <div className="public-info" style={{
              backgroundColor: '#e3f2fd',
              padding: '15px',
              borderRadius: '12px',
              marginBottom: '20px',
              textAlign: 'center',
              color: '#0d47a1',
              border: '1px solid #bbdefb'
            }}>
              <p style={{ margin: 0, fontSize: '1rem' }}>
                📝 Agendamento rápido sem necessidade de cadastro!
              </p>
            </div>

            <Card className="summary-card">
              <h3>Resumo do Agendamento</h3>
              <p><strong>Serviço:</strong> {selectedService?.name}</p>
              <p><strong>Data:</strong> {selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
              <p><strong>Horário:</strong> {selectedTime}</p>
              <p><strong>Valor:</strong> R$ {selectedService?.price?.toFixed(2)}</p>
            </Card>

            <Card className="form-card">
              <div className="form-group">
                <label>Nome Completo *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                />
              </div>

              <div className="form-group">
                <label>Telefone *</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  required
                />
                <small style={{ color: '#666', fontSize: '0.8rem' }}>
                  Informe um telefone para contato
                </small>
              </div>

              {/*<div className="form-group">
                <label>Email (opcional)</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
                <small style={{ color: '#666', fontSize: '0.8rem' }}>
                  Para enviarmos a confirmação do agendamento
                </small>
              </div>*/}

              <div className="form-group">
                <label>Observações (opcional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Alguma observação sobre o serviço?"
                  rows={3}
                />
              </div>
            </Card>

            <div className="booking-navigation">
              <button className="btn-back" onClick={() => setStep(3)}>Voltar</button>
              <button
                className="btn-confirm"
                onClick={handleSubmit}
                disabled={loading || !clientName || !clientPhone}
              >
                {loading ? 'Agendando...' : 'Confirmar Agendamento'}
              </button>
            </div>

            <div className="booking-note" style={{ backgroundColor: '#f5f5f5' }}>
              <p>✨ <strong>Dica:</strong> Crie uma conta para acompanhar seu histórico e ganhar descontos!</p>
              <button 
                onClick={() => navigate('/registro')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#007AFF',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  marginTop: '5px'
                }}
              >
                Criar conta agora
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}