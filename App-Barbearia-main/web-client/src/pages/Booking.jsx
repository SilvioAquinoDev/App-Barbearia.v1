/*import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import api from '../services/api';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './Booking.css';

export default function Booking() {
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

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const response = await api.get('/services');
      setServices(response.data);
    } catch (error) {
      alert('Erro ao carregar serviços');
    }
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

      await api.post('/appointments', {
        service_id: selectedService.id,
        scheduled_time: scheduledTime.toISOString(),
        notes: `Cliente: ${clientName} | Telefone: ${clientPhone} | Email: ${clientEmail} | Obs: ${notes}`,
      });

      alert('Agendamento realizado com sucesso! Você receberá uma confirmação em breve.');
      navigate('/');
    } catch (error) {
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
          <div className="booking-steps">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Serviço</div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Data</div>
            <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Horário</div>
            <div className={`step ${step >= 4 ? 'active' : ''}`}>4. Dados</div>
          </div>
        </div>

        {/* Step 1: Select Service /}
        {step === 1 && (
          <div className="booking-step">
            <h2>Escolha o Serviço</h2>
            <div className="services-grid">
              {services.map((service) => (
                <Card
                  key={service.id}
                  className={`service-card ${selectedService?.id === service.id ? 'selected' : ''}`}
                  onClick={() => setSelectedService(service)}
                >
                  <h3>{service.name}</h3>
                  {service.description && <p>{service.description}</p>}
                  <div className="service-info">
                    <span className="price">R$ {service.price.toFixed(2)}</span>
                    <span className="duration">{service.duration_minutes} min</span>
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

        {/* Step 2: Select Date /}
        {step === 2 && (
          <div className="booking-step">
            <h2>Escolha a Data</h2>
            <div className="dates-grid">
              {availableDates.map((date, index) => (
                <div
                  key={index}
                  className={`date-card ${selectedDate?.getTime() === date.getTime() ? 'selected' : ''}`}
                  onClick={() => setSelectedDate(date)}
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

        {/* Step 3: Select Time /}
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

        {/* Step 4: Client Info /}
        {step === 4 && (
          <div className="booking-step">
            <h2>Seus Dados</h2>
            <Card>
              <div className="booking-summary">
                <h3>Resumo do Agendamento</h3>
                <p><strong>Serviço:</strong> {selectedService?.name}</p>
                <p><strong>Data:</strong> {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                <p><strong>Horário:</strong> {selectedTime}</p>
                <p><strong>Valor:</strong> R$ {selectedService?.price.toFixed(2)}</p>
              </div>
            </Card>

            <Card>
              <div className="form-group">
                <label>Nome Completo *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Seu nome completo"
                />
              </div>

              <div className="form-group">
                <label>Telefone *</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="form-group">
                <label>Email (opcional)</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>

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

            <div className="booking-note">
              <p>✨ <strong>Dica:</strong> Crie uma conta para acessar histórico, promoções e programa de fidelidade!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}*/



/*import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import api from '../services/api';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './Booking.css';

export default function Booking() {
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

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      console.log('📡 Carregando serviços...');
      const response = await api.get('/services');
      console.log('📦 Serviços recebidos:', response.data);
      setServices(response.data);
    } catch (error) {
      console.error('❌ Erro ao carregar serviços:', error);
      alert('Erro ao carregar serviços. Tente novamente.');
    }
  };

  const handleServiceSelect = (service) => {
    console.log('🖱️ Serviço clicado:', service);
    setSelectedService(service);
    // Pequeno feedback visual
    setTimeout(() => {
      if (step === 1) {
        setStep(2);
      }
    }, 300);
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

      // Verifica se usuário está logado
      const token = localStorage.getItem('session_token');
      
      if (token) {
        // Usuário logado
        await api.post('/appointments', {
          service_id: selectedService.id,
          scheduled_time: scheduledTime.toISOString(),
          notes: notes
        });
      } else {
        // Visitante - salva na localStorage e redireciona
        const pendingAppointment = {
          service_id: selectedService.id,
          service_name: selectedService.name,
          service_price: selectedService.price,
          scheduled_time: scheduledTime.toISOString(),
          client_name: clientName,
          client_phone: clientPhone,
          client_email: clientEmail,
          notes: notes
        };
        
        localStorage.setItem('pending_appointment', JSON.stringify(pendingAppointment));
        navigate('/login?redirect=agendamento&message=Faça login para confirmar seu agendamento');
        return;
      }

      alert('Agendamento realizado com sucesso! Você receberá uma confirmação em breve.');
      navigate('/');
    } catch (error) {
      console.error('❌ Erro ao agendar:', error);
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
          <div className="booking-steps">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Serviço</div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Data</div>
            <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Horário</div>
            <div className={`step ${step >= 4 ? 'active' : ''}`}>4. Dados</div>
          </div>
        </div>

        {/* Step 1: Select Service /}
        {step === 1 && (
          <div className="booking-step">
            <h2>Escolha o Serviço</h2>
            {services.length === 0 ? (
              <p className="loading-message">Carregando serviços...</p>
            ) : (
              <div className="services-grid">
                {services.map((service) => {
                  const isSelected = selectedService?.id === service.id;
                  console.log(`🔍 Serviço ${service.id}: ${isSelected ? 'selecionado' : 'não selecionado'}`);
                  
                  return (
                    <Card
                      key={service.id}
                      className={`service-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleServiceSelect(service)}
                    >
                      <h3>{service.name}</h3>
                      {service.description && <p className="service-description">{service.description}</p>}
                      <div className="service-info">
                        <span className="price">
                          R$ {typeof service.price === 'number' ? service.price.toFixed(2) : '0.00'}
                        </span>
                        <span className="duration">
                          {service.duration_minutes || service.duration || 30} min
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
            <button
              className="btn-next"
              onClick={() => setStep(2)}
              disabled={!selectedService}
            >
              Próximo
            </button>
          </div>
        )}

        {/* Step 2: Select Date /}
        {step === 2 && (
          <div className="booking-step">
            <h2>Escolha a Data</h2>
            <div className="dates-grid">
              {availableDates.map((date, index) => (
                <div
                  key={index}
                  className={`date-card ${selectedDate?.getTime() === date.getTime() ? 'selected' : ''}`}
                  onClick={() => setSelectedDate(date)}
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

        {/* Step 3: Select Time /}
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

        {/* Step 4: Client Info /}
        {step === 4 && (
          <div className="booking-step">
            <h2>Seus Dados</h2>
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
                />
              </div>

              <div className="form-group">
                <label>Telefone *</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="form-group">
                <label>Email (opcional)</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>

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

            <div className="booking-note">
              <p>✨ <strong>Dica:</strong> Crie uma conta para acessar histórico, promoções e programa de fidelidade!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}*/





{/*import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import api from '../services/api';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './Booking.css';
import { useAuth } from '../contexts/AuthContext';

export default function Booking() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  

  // Form data
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');

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
        client_email: clientEmail,
        notes: notes
      };

      // Verificar se tem token (usuário logado)
      const token = localStorage.getItem('session_token');

      if (token) {
        // Usuário logado
        await api.post('/appointments', appointmentData);
      } else {
        // Visitante - salva na localStorage
        localStorage.setItem('pending_appointment', JSON.stringify(appointmentData));
        navigate('/login?redirect=agendamento');
        return;
      }

      alert('Agendamento realizado com sucesso!');
      navigate('/');
    } catch (error) {
      console.error('Erro ao agendar:', error);
      alert('Erro ao realizar agendamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Em vez de usar selectedDate, vamos testar com um índice
  const [selectedDateIndex, setSelectedDateIndex] = useState(null);

  return (
    <div className="booking-page">
      <Navbar />

      <div className="booking-container">
        <div className="booking-header">
          <h1>Agendar Horário</h1>
          <div className="booking-steps">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Serviço</div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Data</div>
            <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Horário</div>
            <div className={`step ${step >= 4 ? 'active' : ''}`}>4. Dados</div>
          </div>
        </div>

        {/* Step 1: Select Service /}
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

        {/* Step 2: Select Date /}
        {step === 2 && (
          <div className="booking-step">
            <h2>Escolha a Data</h2>
            {/*<div className="dates-grid">
              {availableDates.map((date, index) => (
                <div
                  key={index}
                  className={`date-card ${selectedDate?.getTime() === date.getTime() ? 'selected' : ''}`}
                  onClick={() => setSelectedDate(date)}
                >
                  <div className="date-day">{format(date, 'EEE', { locale: ptBR })}</div>
                  <div className="date-number">{format(date, 'd')}</div>
                  <div className="date-month">{format(date, 'MMM', { locale: ptBR })}</div>
                </div>
              ))}
            </div>/}

            <div className="dates-grid">
              {availableDates.map((date, index) => (
                <div
                  key={index}
                  className={`date-card ${selectedDateIndex === index ? 'selected' : ''}`}
                  onClick={() => {
                    console.log('Índice clicado:', index);
                    console.log('Data correspondente:', date);
                    setSelectedDateIndex(index);
                    setSelectedDate(date); // Mantém para o resto do fluxo
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

        {/* Step 3: Select Time /}
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

        {/* Step 4: Client Info /}
        {step === 4 && (
          <div className="booking-step">
            <h2>Seus Dados</h2>

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
                  value={user?.name}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Seu nome completo"
                  
                />
              </div>

              <div className="form-group">
                <label>Telefone *</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="form-group">
                <label>Email (opcional)</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="seu@email.com"
                  readOnly={user?.email} // Torna readonly se logado
                  style={user?.email ? { backgroundColor: '#f5f5f5' } : {}}
                />
              </div>

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

            <div className="booking-note">
              <p>✨ <strong>Dica:</strong> Crie uma conta para acessar histórico, promoções e programa de fidelidade!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}*/}




import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import api from '../services/api';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './Booking.css';
import { useAuth } from '../contexts/AuthContext';

export default function Booking() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

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

  // Efeito para preencher dados do usuário quando logado
  useEffect(() => {
    if (user) {
      console.log('Usuário logado, preenchendo dados:', user);
      setClientName(user.name || '');
      setClientEmail(user.email || '');
      // Telefone permanece vazio para o usuário preencher
      // setClientPhone(user.phone || ''); // Não preenche telefone
    }
  }, [user]);

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
        client_email: clientEmail,
        notes: notes
      };

      if (user) {
        // Usuário logado - pode incluir user_id se necessário
        await api.post('/appointments', {
          ...appointmentData,
          user_id: user.user_id // Se sua API precisar do user_id
        });
        alert('Agendamento realizado com sucesso!');
        navigate('/dashboard'); // Redireciona para dashboard ou página de confirmação
      } else {
        // Visitante - salva na localStorage e redireciona para login
        localStorage.setItem('pending_appointment', JSON.stringify(appointmentData));
        navigate('/login?redirect=agendamento');
        return;
      }

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
                    console.log('Índice clicado:', index);
                    console.log('Data correspondente:', date);
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

            {/* Banner informativo para usuário logado */}
            {user && (
              <div className="user-logged-info" style={{
                backgroundColor: '#e8f5e9',
                padding: '15px',
                borderRadius: '12px',
                marginBottom: '20px',
                textAlign: 'center',
                color: '#2e7d32',
                border: '1px solid #c8e6c9'
              }}>
                <p style={{ margin: 0, fontSize: '1rem' }}>
                  ✓ Você está logado como <strong>{user.name}</strong>! 
                  Seus dados foram preenchidos automaticamente.
                </p>
              </div>
            )}

            {/* Banner para visitante */}
            {!user && (
              <div className="visitor-info" style={{
                backgroundColor: '#fff3e0',
                padding: '15px',
                borderRadius: '12px',
                marginBottom: '20px',
                textAlign: 'center',
                color: '#e65100',
                border: '1px solid #ffe0b2'
              }}>
                <p style={{ margin: 0, fontSize: '1rem' }}>
                  ℹ️ Você está agendando como visitante. 
                  Após preencher os dados, você será redirecionado para fazer login.
                </p>
              </div>
            )}

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
                  readOnly={!!user} // Readonly apenas se estiver logado
                  style={user ? { backgroundColor: '#f5f5f5' } : {}}
                />
                {/*{user && (
                  <small style={{ color: '#666', fontSize: '0.8rem', display: 'block', marginTop: '5px' }}>
                    Nome preenchido automaticamente da sua conta
                  </small>
                )}*/}
              </div>

              <div className="form-group">
                <label>Telefone *</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
                {user && (
                  <small style={{ color: '#666', fontSize: '0.8rem', display: 'block', marginTop: '5px' }}>
                    Informe seu telefone para contato
                  </small>
                )}
              </div>

              <div className="form-group">
                <label>Email {!user && '(opcional)'} {user && '*'}</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="seu@email.com"
                  readOnly={!!user}
                  style={user ? { backgroundColor: '#f5f5f5' } : {}}
                  required={!!user} // Email é obrigatório apenas para usuários logados? Ajuste conforme necessidade
                />
                {/*{user && (
                  <small style={{ color: '#666', fontSize: '0.8rem', display: 'block', marginTop: '5px' }}>
                    Email preenchido automaticamente da sua conta
                  </small>
                )}*/}
              </div>

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
                {loading ? 'Agendando...' : user ? 'Confirmar Agendamento' : 'Continuar para Login'}
              </button>
            </div>

            {!user && (
              <div className="booking-note" style={{ backgroundColor: '#e3f2fd', color: '#0d47a1' }}>
                <p>✨ <strong>Dica:</strong> Faça login agora para agendar mais rápido e acessar seu histórico!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}








{/*import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import api from '../services/api';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './Booking.css';
import { useAuth } from '../contexts/AuthContext';

export default function Booking() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

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
    loadUserData(); // Carrega dados do usuário logado
  }, []);

  // Função para carregar dados do usuário do Google
  const loadUserData = () => {
    try {
      // Verifica se tem token (usuário logado)
      const token = localStorage.getItem('session_token');
      
      if (token) {
        console.log('Usuário logado, carregando dados...');
        
        // Tenta diferentes formas de armazenamento dos dados do usuário
        const userStr = localStorage.getItem('user') || 
                       localStorage.getItem('google_user') || 
                       localStorage.getItem('profile');
        
        if (userStr) {
          const user = JSON.parse(userStr);
          console.log('Dados do usuário carregados:', user);
          
          // Preenche automaticamente nome e email (telefone fica em branco)
          if (user.name) setClientName(user.name);
          else if (user.displayName) setClientName(user.displayName);
          else if (user.given_name && user.family_name) {
            setClientName(`${user.given_name} ${user.family_name}`);
          } else if (user.given_name) {
            setClientName(user.given_name);
          }
          
          if (user.email) setClientEmail(user.email);
          
          // Telefone NÃO é preenchido automaticamente - fica em branco para o cliente adicionar
          // setClientPhone(''); // Já está vazio por padrão
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    }
  };

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
        client_email: clientEmail,
        notes: notes
      };

      // Verificar se tem token (usuário logado)
      const token = localStorage.getItem('session_token');

      if (token) {
        // Usuário logado
        await api.post('/appointments', appointmentData);
      } else {
        // Visitante - salva na localStorage
        localStorage.setItem('pending_appointment', JSON.stringify(appointmentData));
        navigate('/login?redirect=agendamento');
        return;
      }

      alert('Agendamento realizado com sucesso!');
      navigate('/');
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
          <div className="booking-steps">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Serviço</div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Data</div>
            <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Horário</div>
            <div className={`step ${step >= 4 ? 'active' : ''}`}>4. Dados</div>
          </div>
        </div>

        {/* Step 1: Select Service /}
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

        {/* Step 2: Select Date /}
        {step === 2 && (
          <div className="booking-step">
            <h2>Escolha a Data</h2>
            <div className="dates-grid">
              {availableDates.map((date, index) => (
                <div
                  key={index}
                  className={`date-card ${selectedDateIndex === index ? 'selected' : ''}`}
                  onClick={() => {
                    console.log('Índice clicado:', index);
                    console.log('Data correspondente:', date);
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

        {/* Step 3: Select Time /}
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

        {/* Step 4: Client Info /}
        {step === 4 && (
          <div className="booking-step">
            <h2>Seus Dados</h2>

            {/* Indicador visual de usuário logado (opcional) /}
            {localStorage.getItem('session_token') && (
              <div className="user-logged-info" style={{
                backgroundColor: '#e8f5e9',
                padding: '10px',
                borderRadius: '8px',
                marginBottom: '20px',
                textAlign: 'center',
                color: '#2e7d32'
              }}>
                <p>✓ Você está logado! Seus dados foram preenchidos automaticamente.</p>
              </div>
            )}

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
                  readOnly={user?.name} // Torna readonly se logado
                  style={user?.name ? { backgroundColor: '#f5f5f5' } : {}}
                />
                
              </div>

              <div className="form-group">
                <label>Telefone *</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              
              </div>

              <div className="form-group">
                <label>Email (opcional)</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="seu@email.com"
                  readOnly={user?.email} // Torna readonly se logado
                  style={user?.email ? { backgroundColor: '#f5f5f5' } : {}}
                />
                
              </div>

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

            <div className="booking-note">
              <p>✨ <strong>Dica:</strong> Crie uma conta para acessar histórico, promoções e programa de fidelidade!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}*/}
















/*import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import api from '../services/api';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './Booking.css';

export default function Booking() {
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

  useEffect(() => {
    console.log('📢 Componente Booking montado');
    loadServices();
  }, []);

  // Log sempre que selectedService mudar
  useEffect(() => {
    console.log('🔄 selectedService atualizado:', selectedService);
  }, [selectedService]);

  const loadServices = async () => {
    try {
      console.log('📡 Carregando serviços...');
      const response = await api.get('/services');
      console.log('📦 Serviços recebidos do backend:', response.data);
      
      // Verificar se é um array
      if (Array.isArray(response.data)) {
        console.log('✅ É um array com', response.data.length, 'itens');
        setServices(response.data);
      } else {
        console.log('❌ Não é um array:', response.data);
        setServices([]);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar serviços:', error);
      alert('Erro ao carregar serviços. Tente novamente.');
    }
  };

  const handleServiceSelect = (service) => {
    console.log('🖱️ FUNÇÃO handleServiceSelect CHAMADA');
    console.log('📦 Serviço clicado:', service);
    console.log('🆔 ID do serviço:', service.id);
    console.log('📛 Nome do serviço:', service.name);
    
    // Verificar se o serviço tem os campos esperados
    if (!service || !service.id) {
      console.error('❌ Serviço inválido:', service);
      return;
    }
    
    // Atualizar o estado
    setSelectedService(service);
    console.log('✅ Estado selectedService atualizado para:', service);
    
    // Verificar se o estado foi atualizado (o useEffect vai logar)
  };

  // Renderizar cada serviço com mais informações
  const renderService = (service) => {
    const isSelected = selectedService?.id === service.id;
    
    console.log(`🔍 Renderizando serviço ${service.id} - selecionado: ${isSelected}`, {
      selectedServiceId: selectedService?.id,
      currentServiceId: service.id,
      isEqual: selectedService?.id === service.id
    });
    
    return (
      <Card
        key={service.id}
        className={`service-card ${isSelected ? 'selected' : ''}`}
        onClick={() => {
          console.log(`👆 Clique no serviço ${service.id}`);
          handleServiceSelect(service);
        }}
        style={{
          border: isSelected ? '3px solid red' : '1px solid #ccc',
          backgroundColor: isSelected ? '#f0f0ff' : 'white'
        }}
      >
        <h3>{service.name}</h3>
        {service.description && <p className="service-description">{service.description}</p>}
        <div className="service-info">
          <span className="price">
            R$ {typeof service.price === 'number' ? service.price.toFixed(2) : '0.00'}
          </span>
          <span className="duration">
            {service.duration_minutes || service.duration || 30} min
          </span>
        </div>
      </Card>
    );
  };

  return (
    <div className="booking-page">
      <Navbar />
      
      <div className="booking-container">
        <div className="booking-header">
          <h1>Agendar Horário</h1>
          <div className="booking-steps">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Serviço</div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Data</div>
            <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Horário</div>
            <div className={`step ${step >= 4 ? 'active' : ''}`}>4. Dados</div>
          </div>
        </div>

        {/* Step 1: Select Service /}
        {step === 1 && (
          <div className="booking-step">
            <h2>Escolha o Serviço</h2>
            
            {/* Debug info /}
            <div style={{ background: '#f0f0f0', padding: '10px', margin: '10px 0' }}>
              <p><strong>Debug:</strong></p>
              <p>Serviços carregados: {services.length}</p>
              <p>Serviço selecionado: {selectedService ? selectedService.name : 'Nenhum'}</p>
            </div>
            
            {services.length === 0 ? (
              <p className="loading-message">Carregando serviços...</p>
            ) : (
              <div className="services-grid">
                {services.map(service => renderService(service))}
              </div>
            )}
            
            <button
              className="btn-next"
              onClick={() => {
                console.log('➡️ Botão próximo clicado');
                console.log('selectedService atual:', selectedService);
                setStep(2);
              }}
              disabled={!selectedService}
              style={{
                backgroundColor: !selectedService ? '#ccc' : '#667eea',
                cursor: !selectedService ? 'not-allowed' : 'pointer'
              }}
            >
              Próximo
            </button>
          </div>
        )}

        {/* Resto do código continua igual /}
        {step === 2 && (
          <div className="booking-step">
            <h2>Escolha a Data</h2>
            <div className="dates-grid">
              {Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1)).map((date, index) => (
                <div
                  key={index}
                  className={`date-card ${selectedDate?.getTime() === date.getTime() ? 'selected' : ''}`}
                  onClick={() => setSelectedDate(date)}
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

        {step === 3 && (
          <div className="booking-step">
            <h2>Escolha o Horário</h2>
            <div className="times-grid">
              {[
                '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
                '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
              ].map((time) => (
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

        {step === 4 && (
          <div className="booking-step">
            <h2>Seus Dados</h2>
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
                />
              </div>

              <div className="form-group">
                <label>Telefone *</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="form-group">
                <label>Email (opcional)</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>

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

            <div className="booking-note">
              <p>✨ <strong>Dica:</strong> Crie uma conta para acessar histórico, promoções e programa de fidelidade!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}*/
