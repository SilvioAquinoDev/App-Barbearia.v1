/*import React, { useState, useEffect } from 'react';
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

    // Compare phone with user's registered phone
    const cleanPhone = (p) => p.replace(/[\s\-\(\)\+]/g, '');
    if (user?.phone && cleanPhone(clientPhone) !== cleanPhone(user.phone)) {
      setPhoneWarning('O telefone informado e diferente do cadastrado no seu perfil. Deseja continuar?');
      return;
    }

    await submitBooking();
  };

  const submitBooking = async () => {
    setPhoneWarning('');
    setLoading(true);
    try {
      const response = await api.post('/public/book', {
        client_name: clientName.trim(),
        client_phone: clientPhone.trim(),
        client_email: clientEmail.trim() || null,
        service_id: selectedService.id,
        scheduled_time: selectedSlot.datetime_iso,
        notes: notes.trim() || null,
      });
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
                <label>Observacoes (opcional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Alguma preferencia?" rows={3} data-testid="booking-notes" />
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

            <p className="confirmation-note">O barbeiro irá confirmar seu agendamento em breve.</p>
            <button className="btn-new-booking" onClick={resetBooking}>Fazer novo agendamento</button>
          </div>
        )}
      </div>
    </div>
  );
}*/



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

  // Novos estados para promoção
  const [promoCode, setPromoCode] = useState('');
  const [promoValidation, setPromoValidation] = useState(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState('');

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

  // Função para validar código promocional
  const validatePromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoError('Digite um código promocional');
      return;
    }

    setValidatingPromo(true);
    setPromoError('');
    
    try {
      const response = await api.post('/public/validate-promo', {
        code: promoCode.trim(),
        service_id: selectedService?.id,
        scheduled_time: selectedSlot?.datetime_iso
      });

      if (response.data.valid) {
        setPromoValidation({
          discount_type: response.data.discount_type,
          discount_value: response.data.discount_value,
          description: response.data.description
        });
        setPromoError('');
      } else {
        setPromoValidation(null);
        setPromoError(response.data.message || 'Código promocional inválido');
      }
    } catch (error) {
      console.error('Error validating promo code:', error);
      setPromoValidation(null);
      setPromoError(error?.response?.data?.detail || 'Erro ao validar código');
    } finally {
      setValidatingPromo(false);
    }
  };

  // Função para remover código promocional
  const removePromoCode = () => {
    setPromoCode('');
    setPromoValidation(null);
    setPromoError('');
  };

  const handleDateSelect = (dateObj) => {
    setSelectedDate(dateObj.date);
    setSelectedDateStr(dateObj.dateStr);
    loadAvailableSlots(dateObj.dateStr);
  };

  // Função para calcular o valor com desconto
  const getDiscountedPrice = () => {
    if (!selectedService || !promoValidation) return selectedService?.price;

    const originalPrice = Number(selectedService.price);
    
    if (promoValidation.discount_type === 'percentage') {
      return originalPrice * (1 - promoValidation.discount_value / 100);
    } else if (promoValidation.discount_type === 'fixed') {
      return Math.max(0, originalPrice - promoValidation.discount_value);
    }
    
    return originalPrice;
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

    // Compare phone with user's registered phone
    const cleanPhone = (p) => p.replace(/[\s\-\(\)\+]/g, '');
    if (user?.phone && cleanPhone(clientPhone) !== cleanPhone(user.phone)) {
      setPhoneWarning('O telefone informado e diferente do cadastrado no seu perfil. Deseja continuar?');
      return;
    }

    await submitBooking();
  };

  const submitBooking = async () => {
    setPhoneWarning('');
    setLoading(true);
    try {
      const response = await api.post('/public/book', {
        client_name: clientName.trim(),
        client_phone: clientPhone.trim(),
        client_email: clientEmail.trim() || null,
        service_id: selectedService.id,
        scheduled_time: selectedSlot.datetime_iso,
        notes: notes.trim() || null,
        promo_code: promoValidation ? promoCode.trim() : null, // Envia o código promocional se validado
      });
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
    setClientEmail('');
    setNotes('');
    setBookingResult(null);
    setSlots([]);
    setPromoCode('');
    setPromoValidation(null);
    setPromoError('');
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
            <Card>
              <div className="booking-summary">
                <h3>Resumo do Agendamento</h3>
                <p><strong>Serviço:</strong> {selectedService?.name}</p>
                <p><strong>Data:</strong> {selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                <p><strong>Horário:</strong> {selectedSlot?.time}</p>
                <p><strong>Valor:</strong> R$ {Number(selectedService?.price).toFixed(2).replace('.', ',')}</p>
                {promoValidation && (
                  <>
                    <p><strong>Desconto:</strong> {
                      promoValidation.discount_type === 'percentage' 
                        ? `${promoValidation.discount_value}%` 
                        : `R$ ${promoValidation.discount_value.toFixed(2).replace('.', ',')}`
                    }</p>
                    <p><strong>Valor Final:</strong> R$ {getDiscountedPrice().toFixed(2).replace('.', ',')}</p>
                  </>
                )}
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
                  data-testid="booking-name" 
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  value={clientEmail} 
                  onChange={(e) => setClientEmail(e.target.value)} 
                  placeholder="seuemail@exemplo.com" 
                  data-testid="booking-email" 
                  readOnly={!!user?.email} 
                />
              </div>
              <div className="form-group">
                <label>Telefone / WhatsApp *</label>
                <input 
                  type="tel" 
                  value={clientPhone} 
                  onChange={(e) => setClientPhone(e.target.value)} 
                  placeholder="(00) 00000-0000" 
                  data-testid="booking-phone" 
                />
              </div>
              
              {/* Campo de Código Promocional */}
              <div className="form-group promo-code-group">
                <label>Código Promocional</label>
                <div className="promo-input-wrapper">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => {
                      setPromoCode(e.target.value.toUpperCase());
                      if (promoValidation) {
                        setPromoValidation(null);
                        setPromoError('');
                      }
                    }}
                    placeholder="Digite seu código"
                    disabled={promoValidation}
                    className={promoError ? 'error' : promoValidation ? 'success' : ''}
                    data-testid="promo-code-input"
                  />
                  {!promoValidation ? (
                    <button
                      className="btn-apply-promo"
                      onClick={validatePromoCode}
                      disabled={!promoCode.trim() || validatingPromo}
                    >
                      {validatingPromo ? 'Validando...' : 'Aplicar'}
                    </button>
                  ) : (
                    <button
                      className="btn-remove-promo"
                      onClick={removePromoCode}
                      title="Remover código"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {promoError && (
                  <div className="promo-error-message" data-testid="promo-error">
                    ⚠️ {promoError}
                  </div>
                )}
                {promoValidation && (
                  <div className="promo-success-message" data-testid="promo-success">
                    ✅ {promoValidation.description || 'Código aplicado com sucesso!'}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Observações (opcional)</label>
                <textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="Alguma preferência?" 
                  rows={3} 
                  data-testid="booking-notes" 
                />
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
                {bookingResult.promo_code && (
                  <div className="detail-row"><span>Código Promocional</span><strong>{bookingResult.promo_code}</strong></div>
                )}
                <div className="detail-row"><span>Status</span><strong className="status-pending">Pendente</strong></div>
              </div>
            </Card>

            <p className="confirmation-note">O barbeiro irá confirmar seu agendamento em breve.</p>
            <button className="btn-new-booking" onClick={resetBooking}>Fazer novo agendamento</button>
          </div>
        )}
      </div>
    </div>
  );
}
