import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../src/services/api';

const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function PublicBooking() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Step management
  const [step, setStep] = useState(1); // 1=service, 2=date, 3=time, 4=info, 5=confirm

  // Data
  const [services, setServices] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Selections
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Date picker
  const [dateOptions, setDateOptions] = useState<any[]>([]);

  // Success
  const [bookingResult, setBookingResult] = useState<any>(null);

  useEffect(() => {
    loadServices();
    generateDateOptions();
  }, []);

  const loadServices = async () => {
    try {
      const res = await api.get('/public/services');
      setServices(res.data);
    } catch (err) {
      console.error('Error loading services:', err);
    } finally {
      setLoadingServices(false);
    }
  };

  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push({
        date: d,
        dateStr: d.toISOString().split('T')[0],
        dayName: DAYS_PT[d.getDay()],
        dayNum: d.getDate(),
        month: MONTHS_PT[d.getMonth()],
        isToday: i === 0,
      });
    }
    setDateOptions(dates);
  };

  const loadSlots = async (dateStr: string) => {
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const params: any = { date_str: dateStr };
      if (selectedService) params.service_id = selectedService.id;
      const res = await api.get('/public/available-slots', { params });
      setSlots(res.data.slots || []);
    } catch (err) {
      console.error('Error loading slots:', err);
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateSelect = (dateStr: string) => {
    setSelectedDate(dateStr);
    loadSlots(dateStr);
  };

  const handleSubmit = async () => {
    if (!clientName.trim() || clientName.trim().length < 2) {
      Alert.alert('Atenção', 'Informe seu nome completo');
      return;
    }
    if (!clientPhone.trim() || clientPhone.trim().length < 8) {
      Alert.alert('Atenção', 'Informe um telefone válido');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/public/book', {
        client_name: clientName.trim(),
        client_phone: clientPhone.trim(),
        service_id: selectedService.id,
        scheduled_time: selectedSlot.datetime_iso,
        notes: notes.trim() || null,
      });
      setBookingResult(res.data);
      setStep(5);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Erro ao agendar. Tente novamente.';
      Alert.alert('Erro', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const resetBooking = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedDate('');
    setSelectedSlot(null);
    setClientName('');
    setClientPhone('');
    setNotes('');
    setBookingResult(null);
  };

  // ---- RENDER STEPS ----

  const renderStepIndicator = () => (
    <View style={styles.stepContainer}>
      {[1, 2, 3, 4].map(s => (
        <View key={s} style={styles.stepRow}>
          <View style={[styles.stepDot, step >= s && styles.stepDotActive]}>
            {step > s ? (
              <Ionicons name="checkmark" size={14} color="#FFF" />
            ) : (
              <Text style={[styles.stepNum, step >= s && styles.stepNumActive]}>{s}</Text>
            )}
          </View>
          {s < 4 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
        </View>
      ))}
    </View>
  );

  const renderServiceStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Escolha o serviço</Text>
      {loadingServices ? (
        <ActivityIndicator size="large" color="#1A73E8" style={{ marginTop: 30 }} />
      ) : services.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cut-outline" size={48} color="#CCC" />
          <Text style={styles.emptyText}>Nenhum serviço disponível no momento</Text>
        </View>
      ) : (
        services.map(svc => (
          <TouchableOpacity
            key={svc.id}
            style={[styles.serviceCard, selectedService?.id === svc.id && styles.serviceCardSelected]}
            onPress={() => {
              setSelectedService(svc);
              setStep(2);
            }}
          >
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{svc.name}</Text>
              {svc.description ? <Text style={styles.serviceDesc}>{svc.description}</Text> : null}
              <View style={styles.serviceMeta}>
                <Ionicons name="time-outline" size={14} color="#666" />
                <Text style={styles.serviceMetaText}>{svc.duration_minutes} min</Text>
              </View>
            </View>
            <Text style={styles.servicePrice}>
              R$ {Number(svc.price).toFixed(2).replace('.', ',')}
            </Text>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const renderDateStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Escolha a data</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
        {dateOptions.map(d => (
          <TouchableOpacity
            key={d.dateStr}
            style={[styles.dateCard, selectedDate === d.dateStr && styles.dateCardSelected]}
            onPress={() => {
              handleDateSelect(d.dateStr);
              setStep(3);
            }}
          >
            <Text style={[styles.dateDayName, selectedDate === d.dateStr && styles.dateTextSelected]}>
              {d.isToday ? 'Hoje' : d.dayName}
            </Text>
            <Text style={[styles.dateDayNum, selectedDate === d.dateStr && styles.dateTextSelected]}>
              {d.dayNum}
            </Text>
            <Text style={[styles.dateMonth, selectedDate === d.dateStr && styles.dateTextSelected]}>
              {d.month.substring(0, 3)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderTimeStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Escolha o horário</Text>
      {loadingSlots ? (
        <ActivityIndicator size="large" color="#1A73E8" style={{ marginTop: 30 }} />
      ) : slots.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color="#CCC" />
          <Text style={styles.emptyText}>Sem horários disponíveis para esta data</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}>
            <Text style={styles.backBtnText}>Escolher outra data</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.slotsGrid}>
          {slots.map((slot: any) => (
            <TouchableOpacity
              key={slot.time}
              style={[styles.slotCard, selectedSlot?.time === slot.time && styles.slotCardSelected]}
              onPress={() => {
                setSelectedSlot(slot);
                setStep(4);
              }}
            >
              <Ionicons
                name="time-outline"
                size={16}
                color={selectedSlot?.time === slot.time ? '#FFF' : '#1A73E8'}
              />
              <Text style={[styles.slotTime, selectedSlot?.time === slot.time && styles.slotTimeSelected]}>
                {slot.time}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderInfoStep = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Seus dados</Text>

        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Ionicons name="cut" size={16} color="#1A73E8" />
            <Text style={styles.summaryText}>{selectedService?.name}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="calendar" size={16} color="#1A73E8" />
            <Text style={styles.summaryText}>{selectedDate}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="time" size={16} color="#1A73E8" />
            <Text style={styles.summaryText}>{selectedSlot?.time}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="cash" size={16} color="#1A73E8" />
            <Text style={styles.summaryText}>
              R$ {Number(selectedService?.price).toFixed(2).replace('.', ',')}
            </Text>
          </View>
        </View>

        <Text style={styles.inputLabel}>Nome completo *</Text>
        <TextInput
          style={styles.input}
          value={clientName}
          onChangeText={setClientName}
          placeholder="Seu nome"
          placeholderTextColor="#999"
        />

        <Text style={styles.inputLabel}>Telefone / WhatsApp *</Text>
        <TextInput
          style={styles.input}
          value={clientPhone}
          onChangeText={setClientPhone}
          placeholder="(11) 99999-9999"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
        />

        <Text style={styles.inputLabel}>Observações (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Alguma preferência?"
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.confirmBtn, submitting && styles.confirmBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={styles.confirmBtnText}>Confirmar Agendamento</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const renderSuccessStep = () => (
    <View style={[styles.stepContent, styles.successContainer]}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark-circle" size={80} color="#34C759" />
      </View>
      <Text style={styles.successTitle}>Agendamento Confirmado!</Text>
      <Text style={styles.successSubtitle}>Seu agendamento foi realizado com sucesso</Text>

      <View style={styles.confirmationCard}>
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Serviço</Text>
          <Text style={styles.confirmValue}>{bookingResult?.service_name}</Text>
        </View>
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Data/Hora</Text>
          <Text style={styles.confirmValue}>{bookingResult?.scheduled_time}</Text>
        </View>
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Nome</Text>
          <Text style={styles.confirmValue}>{bookingResult?.client_name}</Text>
        </View>
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Status</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Pendente</Text>
          </View>
        </View>
      </View>

      <Text style={styles.successNote}>
        O barbeiro irá confirmar seu agendamento em breve. Você receberá uma confirmação por telefone.
      </Text>

      <TouchableOpacity style={styles.newBookingBtn} onPress={resetBooking}>
        <Ionicons name="add-circle-outline" size={20} color="#1A73E8" />
        <Text style={styles.newBookingText}>Fazer novo agendamento</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step > 1 && step < 5 ? setStep(step - 1) : router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="cut" size={20} color="#1A73E8" />
          <Text style={styles.headerTitle}>Agendar Horário</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {step < 5 && renderStepIndicator()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && renderServiceStep()}
        {step === 2 && renderDateStep()}
        {step === 3 && renderTimeStep()}
        {step === 4 && renderInfoStep()}
        {step === 5 && renderSuccessStep()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  headerBack: { width: 40, height: 40, justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#333' },

  // Steps indicator
  stepContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: { backgroundColor: '#1A73E8' },
  stepNum: { fontSize: 12, fontWeight: '700', color: '#999' },
  stepNumActive: { color: '#FFF' },
  stepLine: { width: 40, height: 2, backgroundColor: '#E0E0E0', marginHorizontal: 4 },
  stepLineActive: { backgroundColor: '#1A73E8' },

  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 16 },

  // Services
  serviceCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },
  serviceCardSelected: { borderColor: '#1A73E8', backgroundColor: '#F0F7FF' },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 16, fontWeight: '700', color: '#333' },
  serviceDesc: { fontSize: 13, color: '#666', marginTop: 4 },
  serviceMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  serviceMetaText: { fontSize: 12, color: '#666' },
  servicePrice: { fontSize: 18, fontWeight: '800', color: '#1A73E8' },

  // Date picker
  dateScroll: { marginBottom: 16 },
  dateCard: {
    width: 70,
    height: 90,
    backgroundColor: '#FFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },
  dateCardSelected: { borderColor: '#1A73E8', backgroundColor: '#1A73E8' },
  dateDayName: { fontSize: 12, fontWeight: '600', color: '#666' },
  dateDayNum: { fontSize: 22, fontWeight: '800', color: '#333', marginVertical: 2 },
  dateMonth: { fontSize: 11, color: '#999' },
  dateTextSelected: { color: '#FFF' },

  // Slots
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E8F0FE',
  },
  slotCardSelected: { backgroundColor: '#1A73E8', borderColor: '#1A73E8' },
  slotTime: { fontSize: 15, fontWeight: '700', color: '#1A73E8' },
  slotTimeSelected: { color: '#FFF' },

  // Info form
  summaryBox: {
    backgroundColor: '#E8F0FE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 10,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryText: { fontSize: 14, fontWeight: '600', color: '#333' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  confirmBtn: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 24,
    gap: 8,
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Success
  successContainer: { alignItems: 'center', paddingTop: 20 },
  successIcon: { marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#333' },
  successSubtitle: { fontSize: 15, color: '#666', marginTop: 4, marginBottom: 24 },
  confirmationCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    gap: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confirmLabel: { fontSize: 14, color: '#666' },
  confirmValue: { fontSize: 14, fontWeight: '700', color: '#333' },
  statusBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: '#E65100', fontSize: 12, fontWeight: '700' },
  successNote: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  newBookingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1A73E8',
  },
  newBookingText: { fontSize: 14, fontWeight: '700', color: '#1A73E8' },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyText: { fontSize: 15, color: '#999', textAlign: 'center' },
  backBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#E8F0FE', borderRadius: 8 },
  backBtnText: { color: '#1A73E8', fontWeight: '600' },
});
