import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './Booking.css';

export default function Booking() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [phoneWarning, setPhoneWarning] = useState('');
  const [isRedeemingReward, setIsRedeemingReward] = useState(false);

  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadServices();
    if (user) {
      setClientName(user.name || '');
      setClientPhone(user.phone || '');
      setClientEmail(user.email || '');
    }
  }, [user]);

  // Verifica se é um resgate de prêmio
  useEffect(() => {
    const isRedeeming = localStorage.getItem('redeemingReward') === 'true';
    const rewardDesc = localStorage.getItem('rewardDescription');
    const clientEmailFromLoyalty = localStorage.getItem('clientEmail');
    
    if (isRedeeming && rewardDesc) {
      setIsRedeemingReward(true);
      
      // Adiciona observação automática
      const redeemNote = `🎁 RESGATE DE PRÊMIO: ${rewardDesc} - Cliente resgatou seu prêmio do programa de fidelidade. Aguardando confirmação do barbeiro para concluir o resgate.`;
      
      setNotes(prevNotes => {
        if (prevNotes && !prevNotes.includes(redeemNote)) {
          return `${prevNotes}\n\n${redeemNote}`;
        }
        return redeemNote;
      });
      
      if (clientEmailFromLoyalty) {
        setClientEmail(clientEmailFromLoyalty);
      }
      
      setTimeout(() => {
        alert(`🎉 Parabéns! Você está resgatando seu prêmio: ${rewardDesc}\n\nSeu agendamento será registrado e o barbeiro irá confirmar o resgate quando finalizar o serviço.`);
      }, 500);
    }
  }, []);

  const loadServices = async () => {
    try {
      const response = await api.get('/public/services');
      setServices(response.data);
    } catch (error) {
      console.error('Error loading services:', error);
      alert('Erro ao carregar serviços');
    }
  };

  const availableDates = Array.from({ length: 30 }, (_, i) => {
    const d = addDays(new Date(), i);
    return {
      date: d,
      dateStr: format(d, 'yyyy-MM-dd'),
      dayName: format(d, 'EEE', { locale: ptBR }),
      dayNum: format(d, 'd'),
      month: format(d, 'MMM', { locale: ptBR }),
      isToday: i === 0,
    };
  });

  const loadAvailableSlots = async (dateStr) => {
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const params = { date_str: dateStr };
      if (selectedService) params.service_id = selectedService.id;
      const response = await api.get('/public/available-slots', { params });
      setSlots(response.data.slots || []);
    } catch (error) {
      console.error('Error loading slots:', error);
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateSelect = (dateObj) => {
    setSelectedDate(dateObj.date);
    setSelectedDateStr(dateObj.dateStr);
    loadAvailableSlots(dateObj.dateStr);
  };

  const handleSubmit = async () => {
    if (!clientName.trim() || clientName.trim().length < 2) {
      alert('Informe seu nome completo');
      return;
    }
    if (!clientPhone.trim() || clientPhone.trim().length < 8) {
      alert('Informe um telefone válido');
      return;
    }

    const cleanPhone = (p) => p.replace(/[\s\-\(\)\+]/g, '');
    if (user?.phone && cleanPhone(clientPhone) !== cleanPhone(user.phone)) {
      setPhoneWarning('O telefone informado é diferente do cadastrado no seu perfil. Deseja continuar?');
      return;
    }

    await submitBooking();
  };

  const submitBooking = async () => {
    setPhoneWarning('');
    setLoading(true);
    try {
      const isRedeeming = localStorage.getItem('redeemingReward') === 'true';
      const rewardDesc = localStorage.getItem('rewardDescription');
      
      const bookingData = {
        client_name: clientName.trim(),
        client_phone: clientPhone.trim(),
        client_email: clientEmail.trim() || null,
        service_id: selectedService.id,
        scheduled_time: selectedSlot.datetime_iso,
        notes: notes.trim() || null,
        is_redeeming_reward: isRedeeming,
        reward_description: rewardDesc || null
      };
      
      const response = await api.post('/public/book', bookingData);
      setBookingResult(response.data);
      setStep(5);
    } catch (error) {
      const msg = error?.response?.data?.detail || 'Erro ao agendar. Tente novamente.';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const resetBooking = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedDate(null);
    setSelectedDateStr('');
    setSelectedSlot(null);
    setClientName('');
    setClientPhone('');
    setNotes('');
    setBookingResult(null);
    setSlots([]);
    setIsRedeemingReward(false);
  };

  return (
    <div className="booking-page">
      <Navbar />
      <div className="booking-container">
        <div className="booking-header">
          <h1>Agendar Horário</h1>
          <p className="booking-subtitle">Agende sem precisar fazer login</p>
          {step < 5 && (
            <div className="booking-steps">
              <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>1. Serviço</div>
              <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}`}>2. Data</div>
              <div className={`step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'done' : ''}`}>3. Horário</div>
              <div className={`step ${step >= 4 ? 'active' : ''}`}>4. Dados</div>
            </div>
          )}
        </div>

        {step === 1 && (
          <div className="booking-step">
            <h2>Escolha o Serviço</h2>
            <div className="services-grid">
              {services.map((service) => (
                <Card
                  key={service.id}
                  className={`service-card ${selectedService?.id === service.id ? 'selected' : ''}`}
                  onClick={() => { setSelectedService(service); setStep(2); }}
                >
                  <h3>{service.name}</h3>
                  {service.description && <p>{service.description}</p>}
                  <div className="service-info">
                    <span className="price">R$ {Number(service.price).toFixed(2).replace('.', ',')}</span>
                    <span className="duration">{service.duration_minutes} min</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="booking-step">
            <h2>Escolha a Data</h2>
            <div className="dates-grid">
              {availableDates.map((d) => (
                <div
                  key={d.dateStr}
                  className={`date-card ${selectedDateStr === d.dateStr ? 'selected' : ''}`}
                  onClick={() => { handleDateSelect(d); setStep(3); }}
                >
                  <div className="date-day">{d.isToday ? 'Hoje' : d.dayName}</div>
                  <div className="date-number">{d.dayNum}</div>
                  <div className="date-month">{d.month}</div>
                </div>
              ))}
            </div>
            <div className="booking-navigation">
              <button className="btn-back" onClick={() => setStep(1)}>Voltar</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="booking-step">
            <h2>Escolha o Horário</h2>
            {loadingSlots ? (
              <div className="loading-slots">Carregando horários disponíveis...</div>
            ) : slots.length === 0 ? (
              <div className="no-slots">
                <p>Sem horários disponíveis para esta data.</p>
                <button className="btn-back" onClick={() => setStep(2)}>Escolher outra data</button>
              </div>
            ) : (
              <div className="times-grid">
                {slots.map((slot) => (
                  <div
                    key={slot.time}
                    className={`time-card ${selectedSlot?.time === slot.time ? 'selected' : ''}`}
                    onClick={() => { setSelectedSlot(slot); setStep(4); }}
                  >
                    {slot.time}
                  </div>
                ))}
              </div>
            )}
            <div className="booking-navigation">
              <button className="btn-back" onClick={() => setStep(2)}>Voltar</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="booking-step">
            <h2>Seus Dados</h2>
            
            {isRedeemingReward && (
              <div style={{
                backgroundColor: '#ff9800',
                color: 'white',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                🎁 <strong>Resgate de Prêmio!</strong> Você está utilizando seu prêmio do programa de fidelidade.
                <div style={{ fontSize: '0.9em', marginTop: '5px' }}>
                  Prêmio: {localStorage.getItem('rewardDescription')}
                </div>
                <div style={{ fontSize: '0.85em', marginTop: '8px' }}>
                  ⚠️ O resgate será confirmado após o barbeiro finalizar seu atendimento.
                </div>
              </div>
            )}
            
            <Card>
              <div className="booking-summary">
                <h3>Resumo do Agendamento</h3>
                <p><strong>Serviço:</strong> {selectedService?.name}</p>
                <p><strong>Data:</strong> {selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                <p><strong>Horário:</strong> {selectedSlot?.time}</p>
                <p><strong>Valor:</strong> R$ {Number(selectedService?.price).toFixed(2).replace('.', ',')}</p>
              </div>
            </Card>

            <Card>
              <div className="form-group">
                <label>Nome Completo *</label>
                <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Seu nome completo" data-testid="booking-name" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="seuemail@exemplo.com" data-testid="booking-email" readOnly={!!user?.email} />
              </div>
              <div className="form-group">
                <label>Telefone / WhatsApp *</label>
                <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="(00) 00000-0000" data-testid="booking-phone" />
              </div>
              <div className="form-group">
                <label>Observações (opcional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Alguma preferência?" rows={3} data-testid="booking-notes" />
              </div>
            </Card>

            <div className="booking-navigation">
              <button className="btn-back" onClick={() => setStep(3)}>Voltar</button>
              <button className="btn-confirm" onClick={handleSubmit} disabled={loading || !clientName || !clientPhone}>
                {loading ? 'Agendando...' : 'Confirmar Agendamento'}
              </button>
            </div>

            {phoneWarning && (
              <div className="phone-warning-overlay" data-testid="phone-warning">
                <div className="phone-warning-box">
                  <p>{phoneWarning}</p>
                  <div className="phone-warning-actions">
                    <button className="btn-confirm" onClick={submitBooking}>Sim, continuar</button>
                    <button className="btn-back" onClick={() => setPhoneWarning('')}>Corrigir</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 5 && bookingResult && (
          <div className="booking-step success-step">
            <div className="success-icon">✅</div>
            <h2>Agendamento Confirmado!</h2>
            <p className="success-subtitle">Seu agendamento foi realizado com sucesso</p>

            <Card>
              <div className="confirmation-details">
                <div className="detail-row"><span>Serviço</span><strong>{bookingResult.service_name}</strong></div>
                <div className="detail-row"><span>Data/Hora</span><strong>{bookingResult.scheduled_time}</strong></div>
                <div className="detail-row"><span>Nome</span><strong>{bookingResult.client_name}</strong></div>
                <div className="detail-row"><span>Telefone</span><strong>{bookingResult.client_phone}</strong></div>
                <div className="detail-row"><span>Status</span><strong className="status-pending">Pendente</strong></div>
              </div>
            </Card>

            {isRedeemingReward && (
              <div style={{
                backgroundColor: '#ff9800',
                padding: '15px',
                borderRadius: '8px',
                marginTop: '20px',
                textAlign: 'center'
              }}>
                <strong>🎁 Importante:</strong> Seu prêmio será resgatado após o barbeiro confirmar e concluir seu atendimento.
                <div style={{ fontSize: '0.9em', marginTop: '8px' }}>
                  Prêmio: {localStorage.getItem('rewardDescription')}
                </div>
              </div>
            )}

            <p className="confirmation-note">O barbeiro irá confirmar seu agendamento em breve.</p>
            <button className="btn-new-booking" onClick={resetBooking}>Fazer novo agendamento</button>
          </div>
        )}
      </div>
    </div>
  );
}