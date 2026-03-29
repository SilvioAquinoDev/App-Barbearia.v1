{/*import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import api from '../../src/services/api';

const DAYS = [
  { key: 0, label: 'Segunda-feira', short: 'Seg' }, { key: 1, label: 'Terca-feira', short: 'Ter' },
  { key: 2, label: 'Quarta-feira', short: 'Qua' }, { key: 3, label: 'Quinta-feira', short: 'Qui' },
  { key: 4, label: 'Sexta-feira', short: 'Sex' }, { key: 5, label: 'Sabado', short: 'Sab' },
  { key: 6, label: 'Domingo', short: 'Dom' },
];
const TIME_OPTIONS = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'];
const DURATION_OPTIONS = [15, 20, 30, 45, 60];

export default function ScheduleScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [blocks, setBlocks] = useState<{start: string, end: string}[]>([{ start: '09:00', end: '12:00' }, { start: '14:00', end: '20:00' }]);
  const [slotDuration, setSlotDuration] = useState(30);

  useFocusEffect(useCallback(() => { loadSchedules(); }, []));

  const loadSchedules = async () => {
    try { const res = await api.get('/schedule/'); setSchedules(res.data); } catch { } finally { setLoading(false); }
  };

  const openAddForDay = (dayKey: number) => {
    setSelectedDay(dayKey);
    const daySchedules = schedules.filter(s => s.day_of_week === dayKey);
    if (daySchedules.length > 0) { setBlocks(daySchedules.map(s => ({ start: s.start_time, end: s.end_time }))); setSlotDuration(daySchedules[0].slot_duration_minutes || 30); }
    else { setBlocks([{ start: '09:00', end: '12:00' }, { start: '14:00', end: '20:00' }]); setSlotDuration(30); }
    setShowModal(true);
  };

  const addBlock = () => setBlocks([...blocks, { start: '14:00', end: '18:00' }]);
  const removeBlock = (i: number) => { if (blocks.length <= 1) { Alert.alert('Atencao', 'Precisa ter pelo menos 1 bloco'); return; } setBlocks(blocks.filter((_, idx) => idx !== i)); };
  const updateBlock = (i: number, field: 'start' | 'end', value: string) => { const b = [...blocks]; b[i] = { ...b[i], [field]: value }; setBlocks(b); };

  const handleSave = async () => {
    for (let i = 0; i < blocks.length; i++) { if (blocks[i].start >= blocks[i].end) { Alert.alert('Erro', `Bloco ${i+1}: Horario inicial deve ser antes do final`); return; } }
    setSaving(true);
    try {
      const ex = schedules.filter(s => s.day_of_week === selectedDay);
      for (const e of ex) await api.delete(`/schedule/${e.id}`);
      for (const b of blocks) await api.post('/schedule/', { day_of_week: selectedDay, start_time: b.start, end_time: b.end, slot_duration_minutes: slotDuration, recurrence_type: 'weekly' });
      Alert.alert('Sucesso', `Horarios de ${DAYS[selectedDay].label} salvos!`);
      setShowModal(false); await loadSchedules();
    } catch (err: any) { Alert.alert('Erro', err?.response?.data?.detail || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const handleDeleteDay = (dayKey: number) => {
    const ds = schedules.filter(s => s.day_of_week === dayKey);
    if (!ds.length) return;
    Alert.alert('Remover dia', `Remover todos os horarios de ${DAYS[dayKey].label}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: async () => { try { for (const s of ds) await api.delete(`/schedule/${s.id}`); await loadSchedules(); } catch { Alert.alert('Erro', 'Falha ao remover'); } } },
    ]);
  };

  const handleQuickSetup = () => {
    Alert.alert('Config. Rapida', 'Configurar Seg-Sex, 09:00-12:00 e 14:00-20:00?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Configurar', onPress: async () => {
        setSaving(true);
        try {
          await api.delete('/schedule/');
          for (let d = 0; d <= 4; d++) { await api.post('/schedule/', { day_of_week: d, start_time: '09:00', end_time: '12:00', slot_duration_minutes: 30, recurrence_type: 'weekly' }); await api.post('/schedule/', { day_of_week: d, start_time: '14:00', end_time: '20:00', slot_duration_minutes: 30, recurrence_type: 'weekly' }); }
          Alert.alert('Sucesso', 'Agenda configurada!'); await loadSchedules();
        } catch { Alert.alert('Erro', 'Falha'); } finally { setSaving(false); }
      }},
    ]);
  };

  const handleClearAll = () => {
    Alert.alert('Limpar tudo', 'Remover todos os horarios?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Limpar', style: 'destructive', onPress: async () => { try { await api.delete('/schedule/'); await loadSchedules(); } catch { Alert.alert('Erro', 'Falha'); } } },
    ]);
  };

  if (loading) return <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;

  const schedulesByDay = DAYS.map(day => ({ ...day, schedules: schedules.filter(s => s.day_of_week === day.key).sort((a: any, b: any) => a.start_time.localeCompare(b.start_time)) }));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.quickSetupBtn, { backgroundColor: theme.primary }]} onPress={handleQuickSetup}>
            <Ionicons name="flash" size={18} color="#FFF" />
            <Text style={styles.quickSetupText}>Config. Rapida</Text>
          </TouchableOpacity>
          {schedules.length > 0 && (
            <TouchableOpacity style={[styles.clearBtn, { borderColor: '#FF3B30' }]} onPress={handleClearAll}>
              <Ionicons name="trash-outline" size={16} color="#FF3B30" />
              <Text style={styles.clearBtnText}>Limpar</Text>
            </TouchableOpacity>
          )}
        </View>

        {schedulesByDay.map(day => (
          <View key={day.key} style={[styles.dayCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.dayHeader}>
              <View style={styles.dayLeft}>
                <View style={[styles.dayBadge, { backgroundColor: day.schedules.length > 0 ? theme.primary : theme.textMuted }]}>
                  <Text style={styles.dayBadgeText}>{day.short}</Text>
                </View>
                <Text style={[styles.dayLabel, { color: theme.text }]}>{day.label}</Text>
              </View>
              <View style={styles.dayActions}>
                {day.schedules.length > 0 && (
                  <TouchableOpacity style={styles.dayDeleteBtn} onPress={() => handleDeleteDay(day.key)}>
                    <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.dayEditBtn, { backgroundColor: theme.dark ? '#1A2744' : '#E8F0FE' }]} onPress={() => openAddForDay(day.key)}>
                  <Ionicons name={day.schedules.length > 0 ? 'create-outline' : 'add'} size={18} color={theme.primary} />
                </TouchableOpacity>
              </View>
            </View>
            {day.schedules.length === 0 ? (
              <TouchableOpacity style={styles.dayEmpty} onPress={() => openAddForDay(day.key)}>
                <Text style={[styles.dayEmptyText, { color: theme.textMuted }]}>Folga - Toque para configurar</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.blocksContainer}>
                {day.schedules.map((schedule: any, idx: number) => (
                  <View key={schedule.id} style={styles.blockRow}>
                    <View style={styles.blockTime}>
                      <Ionicons name="time-outline" size={14} color={theme.primary} />
                      <Text style={[styles.blockTimeText, { color: theme.text }]}>{schedule.start_time} - {schedule.end_time}</Text>
                    </View>
                    <Text style={[styles.blockMeta, { color: theme.textMuted }]}>{schedule.slot_duration_minutes}min/slot</Text>
                    {idx < day.schedules.length - 1 && (
                      <View style={styles.lunchIndicator}>
                        <Ionicons name="restaurant-outline" size={12} color="#FF9500" />
                        <Text style={styles.lunchText}>Intervalo</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <View style={[styles.modalContainer, { paddingTop: insets.top + 16, backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.card, borderBottomColor: theme.divider }]}>
            <TouchableOpacity onPress={() => setShowModal(false)}><Text style={[styles.modalCancel, { color: theme.textSecondary }]}>Cancelar</Text></TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{DAYS[selectedDay]?.label}</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={theme.primary} /> : <Text style={[styles.modalSave, { color: theme.primary }]}>Salvar</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Blocos de Horario</Text>
            <Text style={[styles.sectionHint, { color: theme.textMuted }]}>Adicione intervalos para configurar almoco ou pausas</Text>
            {blocks.map((block, idx) => (
              <View key={idx} style={[styles.blockCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.blockCardHeader}>
                  <Text style={[styles.blockCardTitle, { color: theme.primary }]}>{idx === 0 ? 'Manha / Periodo 1' : idx === 1 ? 'Tarde / Periodo 2' : `Periodo ${idx + 1}`}</Text>
                  {blocks.length > 1 && <TouchableOpacity onPress={() => removeBlock(idx)}><Ionicons name="close-circle" size={22} color="#FF3B30" /></TouchableOpacity>}
                </View>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>Inicio</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.timeRow}>
                    {TIME_OPTIONS.map(t => (
                      <TouchableOpacity key={`s-${idx}-${t}`} style={[styles.timeChip, { backgroundColor: block.start === t ? theme.primary : theme.inputBg, borderColor: block.start === t ? theme.primary : theme.border }]} onPress={() => updateBlock(idx, 'start', t)}>
                        <Text style={[styles.timeChipText, { color: block.start === t ? '#FFF' : theme.textSecondary }]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>Termino</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.timeRow}>
                    {TIME_OPTIONS.map(t => (
                      <TouchableOpacity key={`e-${idx}-${t}`} style={[styles.timeChip, { backgroundColor: block.end === t ? theme.primary : theme.inputBg, borderColor: block.end === t ? theme.primary : theme.border }]} onPress={() => updateBlock(idx, 'end', t)}>
                        <Text style={[styles.timeChipText, { color: block.end === t ? '#FFF' : theme.textSecondary }]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                {idx < blocks.length - 1 && (
                  <View style={[styles.lunchBanner, { backgroundColor: theme.dark ? '#3D2E00' : '#FFF3E0' }]}>
                    <Ionicons name="restaurant" size={16} color="#FF9500" />
                    <Text style={styles.lunchBannerText}>Intervalo / Almoco</Text>
                  </View>
                )}
              </View>
            ))}
            <TouchableOpacity style={[styles.addBlockBtn, { borderColor: theme.primary }]} onPress={addBlock}>
              <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
              <Text style={[styles.addBlockText, { color: theme.primary }]}>Adicionar Bloco</Text>
            </TouchableOpacity>
            <Text style={[styles.sectionTitle, { marginTop: 24, color: theme.text }]}>Duracao do Slot</Text>
            <View style={styles.durationGrid}>
              {DURATION_OPTIONS.map(d => (
                <TouchableOpacity key={d} style={[styles.durationChip, { backgroundColor: slotDuration === d ? theme.primary : theme.card, borderColor: slotDuration === d ? theme.primary : theme.border }]} onPress={() => setSlotDuration(d)}>
                  <Text style={[styles.durationText, { color: slotDuration === d ? '#FFF' : theme.textSecondary }]}>{d} min</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={[styles.previewBox, { backgroundColor: theme.dark ? '#1A2744' : '#E8F0FE' }]}>
              <Text style={[styles.previewTitle, { color: theme.primary }]}>Resumo</Text>
              {blocks.map((b, i) => (
                <Text key={i} style={[styles.previewText, { color: theme.text }]}>
                  {b.start} as {b.end} ({Math.floor(((parseInt(b.end.split(':')[0])*60+parseInt(b.end.split(':')[1]))-(parseInt(b.start.split(':')[0])*60+parseInt(b.start.split(':')[1])))/slotDuration)} slots de {slotDuration}min)
                </Text>
              ))}
              {blocks.length > 1 && <Text style={styles.previewLunch}>Intervalo: {blocks[0].end} as {blocks[1].start}</Text>}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  quickSetupBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, gap: 6 },
  quickSetupText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, gap: 4 },
  clearBtnText: { color: '#FF3B30', fontWeight: '600', fontSize: 13 },
  dayCard: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dayBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  dayBadgeText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  dayLabel: { fontSize: 15, fontWeight: '600' },
  dayActions: { flexDirection: 'row', gap: 8 },
  dayDeleteBtn: { padding: 6 },
  dayEditBtn: { padding: 6, borderRadius: 6 },
  dayEmpty: { marginTop: 8, paddingVertical: 8 },
  dayEmptyText: { fontSize: 13, fontStyle: 'italic' },
  blocksContainer: { marginTop: 10, gap: 4 },
  blockRow: { paddingVertical: 4 },
  blockTime: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  blockTimeText: { fontSize: 14, fontWeight: '600' },
  blockMeta: { fontSize: 11, marginLeft: 20, marginTop: 2 },
  lunchIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 20, marginTop: 4, marginBottom: 2 },
  lunchText: { fontSize: 11, color: '#FF9500', fontStyle: 'italic' },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1 },
  modalCancel: { fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalSave: { fontSize: 16, fontWeight: '700' },
  modalScroll: { flex: 1 },
  modalContent: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  sectionHint: { fontSize: 12, marginBottom: 12 },
  blockCard: { borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1 },
  blockCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  blockCardTitle: { fontSize: 14, fontWeight: '700' },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  timeRow: { flexDirection: 'row', gap: 6 },
  timeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  timeChipText: { fontSize: 13, fontWeight: '600' },
  lunchBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 8, borderRadius: 8 },
  lunchBannerText: { fontSize: 13, fontWeight: '600', color: '#FF9500' },
  addBlockBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderWidth: 1.5, borderRadius: 10, borderStyle: 'dashed' },
  addBlockText: { fontSize: 14, fontWeight: '600' },
  durationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  durationChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5 },
  durationText: { fontSize: 14, fontWeight: '600' },
  previewBox: { borderRadius: 12, padding: 16, marginTop: 20 },
  previewTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  previewText: { fontSize: 13, marginBottom: 4 },
  previewLunch: { fontSize: 13, color: '#FF9500', fontWeight: '600', marginTop: 4 },
});*/}





import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import api from '../../src/services/api';

const DAYS = [
  { key: 0, label: 'Segunda-feira', short: 'Seg' },
  { key: 1, label: 'Terça-feira', short: 'Ter' },
  { key: 2, label: 'Quarta-feira', short: 'Qua' },
  { key: 3, label: 'Quinta-feira', short: 'Qui' },
  { key: 4, label: 'Sexta-feira', short: 'Sex' },
  { key: 5, label: 'Sábado', short: 'Sáb' },
  { key: 6, label: 'Domingo', short: 'Dom' },
];

const TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00',
];

const DURATION_OPTIONS = [15, 20, 30, 45, 60];

// Função para formatar data
const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatDateAPI = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
};

// Função para formatar dia da semana por extenso
const getDayName = (date: Date): string => {
  const day = date.getDay();
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return days[day];
};

// Função para parsear data do formato DD/MM/YYYY
const parseDate = (dateStr: string): Date | null => {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return null;
};

// Função para obter dia da semana (0 = Segunda, 6 = Domingo)
const getDayOfWeek = (date: Date): number => {
  const day = date.getDay(); // 0 = Domingo, 1 = Segunda, ...
  return day === 0 ? 6 : day - 1; // Ajustando para nosso formato (0 = Segunda)
};

// Gerar datas entre duas datas
const getDatesBetween = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

// Gerar dias da semana para uma data específica
const getWeekDates = (date: Date): Date[] => {
  const dayOfWeek = date.getDay(); // 0 = Domingo
  const monday = new Date(date);
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Ajustar para segunda como primeiro dia
  monday.setDate(date.getDate() - diff);

  const weekDates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    weekDates.push(day);
  }

  return weekDates;
};

// Gerar dias do mês
const getMonthDates = (date: Date): Date[] => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  return getDatesBetween(firstDay, lastDay);
};

// Agrupar datas por semana
const groupDatesByWeek = (dates: Date[]): Date[][] => {
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];

  dates.forEach((date, index) => {
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 1 && currentWeek.length > 0) { // Segunda-feira
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
    currentWeek.push(date);
  });

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return weeks;
};

export default function ScheduleScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 9)); // 09-03-2026

  // Date range states for batch
  const [startDate, setStartDate] = useState(new Date(2026, 2, 9));
  const [endDate, setEndDate] = useState(new Date(2026, 2, 15));
  const [startDateText, setStartDateText] = useState('09/03/2026');
  const [endDateText, setEndDateText] = useState('15/03/2026');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [batchType, setBatchType] = useState<'week' | 'month' | 'custom'>('week');

  // Selected days for batch creation
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4]);

  // Form state - support multiple blocks
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [blocks, setBlocks] = useState<{ start: string, end: string }[]>([
    { start: '09:00', end: '12:00' },
    { start: '14:00', end: '20:00' },
  ]);
  const [slotDuration, setSlotDuration] = useState(30);

  // Dates to display
  const [displayDates, setDisplayDates] = useState<Date[]>([]);
  const [groupedWeeks, setGroupedWeeks] = useState<Date[][]>([]);

  useEffect(() => {
    updateDisplayDates();
  }, [currentDate, viewMode]);

  const updateDisplayDates = () => {
    if (viewMode === 'week') {
      const weekDates = getWeekDates(currentDate);
      setDisplayDates(weekDates);
      setGroupedWeeks([weekDates]);
    } else {
      const monthDates = getMonthDates(currentDate);
      setDisplayDates(monthDates);
      setGroupedWeeks(groupDatesByWeek(monthDates));
    }
  };

  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() - 7);
    } else {
      newDate.setMonth(currentDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + 7);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const getScheduleForDate = (date: Date) => {
    const dayOfWeek = getDayOfWeek(date);
    return schedules
      .filter(s => s.day_of_week === dayOfWeek)
      .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
  };

  const openAddForDate = (date: Date) => {
    const dayOfWeek = getDayOfWeek(date);
    setSelectedDay(dayOfWeek);
    setSelectedDate(date);

    const daySchedules = schedules.filter(s => s.day_of_week === dayOfWeek);
    if (daySchedules.length > 0) {
      setBlocks(daySchedules.map(s => ({ start: s.start_time, end: s.end_time })));
      setSlotDuration(daySchedules[0].slot_duration_minutes || 30);
    } else {
      setBlocks([{ start: '09:00', end: '12:00' }, { start: '14:00', end: '20:00' }]);
      setSlotDuration(30);
    }
    setShowModal(true);
  };

  useFocusEffect(
    useCallback(() => {
      loadSchedules();
    }, [])
  );

  const loadSchedules = async () => {
    try {
      const res = await api.get('/schedule/');
      setSchedules(res.data);
    } catch (err) {
      console.error('Error loading schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  const addBlock = () => {
    setBlocks([...blocks, { start: '14:00', end: '18:00' }]);
  };

  const removeBlock = (index: number) => {
    if (blocks.length <= 1) {
      Alert.alert('Atenção', 'Precisa ter pelo menos 1 bloco de horário');
      return;
    }
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  const updateBlock = (index: number, field: 'start' | 'end', value: string) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], [field]: value };
    setBlocks(newBlocks);
  };

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const selectAllDays = () => {
    setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
  };

  const selectWeekDays = () => {
    setSelectedDays([0, 1, 2, 3, 4]);
  };

  const updateStartDateFromText = (text: string) => {
    setStartDateText(text);
    const parsed = parseDate(text);
    if (parsed) {
      setStartDate(parsed);
      if (batchType === 'week') {
        const weekDates = getWeekDates(parsed);
        const end = weekDates[6];
        setEndDate(end);
        setEndDateText(formatDate(end));
      } else if (batchType === 'month') {
        const monthDates = getMonthDates(parsed);
        const end = monthDates[monthDates.length - 1];
        setEndDate(end);
        setEndDateText(formatDate(end));
      }
    }
  };

  const updateEndDateFromText = (text: string) => {
    setEndDateText(text);
    const parsed = parseDate(text);
    if (parsed) {
      setEndDate(parsed);
    }
  };

  const handleBatchSave = async () => {
    if (selectedDays.length === 0) {
      Alert.alert('Erro', 'Selecione pelo menos um dia da semana');
      return;
    }

    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].start >= blocks[i].end) {
        Alert.alert('Erro', `Bloco ${i + 1}: Horário inicial deve ser antes do final`);
        return;
      }
    }

    let dates: Date[] = [];

    if (batchType === 'week') {
      dates = getWeekDates(startDate);
    } else if (batchType === 'month') {
      dates = getMonthDates(startDate);
    } else {
      dates = getDatesBetween(startDate, endDate);
    }

    const daysToCreate = dates.filter(date => selectedDays.includes(getDayOfWeek(date)));

    Alert.alert(
      'Confirmar Criação em Lote',
      `Você está prestes a criar horários para:\n` +
      `📅 Período: ${startDateText} até ${endDateText}\n` +
      `📆 Dias selecionados: ${selectedDays.map(d => DAYS[d].short).join(', ')}\n` +
      `📊 Total de dias: ${daysToCreate.length}\n\n` +
      `Deseja continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Criar',
          onPress: async () => {
            setSaving(true);
            try {
              let created = 0;
              let errors = 0;

              for (const date of daysToCreate) {
                const dayOfWeek = getDayOfWeek(date);
                const dateStr = formatDateAPI(date);

                for (const block of blocks) {
                  try {
                    await api.post('/schedule/', {
                      day_of_week: dayOfWeek,
                      start_time: block.start,
                      end_time: block.end,
                      slot_duration_minutes: slotDuration,
                      recurrence_type: 'weekly',
                      specific_date: dateStr,
                    });
                    created++;
                  } catch (err) {
                    errors++;
                    console.error(`Erro ao criar para ${dateStr}:`, err);
                  }
                }
              }

              Alert.alert(
                'Sucesso',
                `✅ ${created} horários criados\n` +
                (errors > 0 ? `❌ ${errors} erros` : ''),
                [{
                  text: 'OK', onPress: () => {
                    setShowBatchModal(false);
                    loadSchedules();
                  }
                }]
              );
            } catch (err: any) {
              const msg = err?.response?.data?.detail || 'Erro ao criar em lote';
              Alert.alert('Erro', msg);
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].start >= blocks[i].end) {
        Alert.alert('Erro', `Bloco ${i + 1}: Horário inicial deve ser antes do final`);
        return;
      }
    }

    setSaving(true);
    try {
      const existingForDay = schedules.filter(s => s.day_of_week === selectedDay);
      for (const existing of existingForDay) {
        await api.delete(`/schedule/${existing.id}`);
      }

      for (const block of blocks) {
        await api.post('/schedule/', {
          day_of_week: selectedDay,
          start_time: block.start,
          end_time: block.end,
          slot_duration_minutes: slotDuration,
          recurrence_type: 'weekly',
        });
      }

      Alert.alert('Sucesso', `Horários de ${DAYS[selectedDay].label} salvos!`);
      setShowModal(false);
      await loadSchedules();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Erro ao salvar';
      Alert.alert('Erro', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDay = (dayKey: number) => {
    const daySchedules = schedules.filter(s => s.day_of_week === dayKey);
    if (daySchedules.length === 0) return;

    Alert.alert(
      'Remover dia',
      `Remover todos os horários de ${DAYS[dayKey].label}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const s of daySchedules) {
                await api.delete(`/schedule/${s.id}`);
              }
              await loadSchedules();
            } catch (err) {
              Alert.alert('Erro', 'Falha ao remover');
            }
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert('Limpar tudo', 'Remover todos os horários da agenda?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Limpar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete('/schedule/');
            await loadSchedules();
          } catch (err) {
            Alert.alert('Erro', 'Falha ao limpar');
          }
        },
      },
    ]);
  };

  const handleQuickSetup = () => {
    Alert.alert(
      'Configuração Rápida',
      'Configurar Seg-Sex, 09:00-12:00 e 14:00-20:00 (com almoço)?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Configurar',
          onPress: async () => {
            setSaving(true);
            try {
              await api.delete('/schedule/');
              for (let day = 0; day <= 4; day++) {
                await api.post('/schedule/', {
                  day_of_week: day,
                  start_time: '09:00',
                  end_time: '12:00',
                  slot_duration_minutes: 30,
                  recurrence_type: 'weekly',
                });
                await api.post('/schedule/', {
                  day_of_week: day,
                  start_time: '14:00',
                  end_time: '20:00',
                  slot_duration_minutes: 30,
                  recurrence_type: 'weekly',
                });
              }
              Alert.alert('Sucesso', 'Agenda configurada: Seg-Sex, 09-12h e 14-20h');
              await loadSchedules();
            } catch (err) {
              Alert.alert('Erro', 'Falha na configuração');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header com navegação */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Agenda</Text>
          <View style={[styles.viewModeToggle, { backgroundColor: theme.dark ? '#1A2744' : '#F0F0F0' }]}>
            <TouchableOpacity
              style={[styles.viewModeBtn, viewMode === 'week' && { backgroundColor: theme.primary }]}
              onPress={() => setViewMode('week')}
            >
              <Text style={[styles.viewModeText, { color: viewMode === 'week' ? '#FFF' : theme.textSecondary }]}>Semana</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewModeBtn, viewMode === 'month' && { backgroundColor: theme.primary }]}
              onPress={() => setViewMode('month')}
            >
              <Text style={[styles.viewModeText, { color: viewMode === 'month' ? '#FFF' : theme.textSecondary }]}>Mês</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.navigationRow}>
          <TouchableOpacity onPress={navigatePrevious} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.primary} />
          </TouchableOpacity>

          <Text style={[styles.navTitle, { color: theme.text }]}>
            {viewMode === 'week'
              ? `${formatDate(displayDates[0] || currentDate)} - ${formatDate(displayDates[6] || currentDate)}`
              : currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^[a-z]/, l => l.toUpperCase())
            }
          </Text>

          <TouchableOpacity onPress={navigateNext} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={24} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {/* Quick actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.quickSetupBtn, { backgroundColor: theme.primary }]} onPress={handleQuickSetup}>
            <Ionicons name="flash" size={13} color="#FFF" />
            <Text style={styles.quickSetupText}>Config. Rápida</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.batchSetupBtn, { backgroundColor: '#34C759' }]} onPress={() => setShowBatchModal(true)}>
            <Ionicons name="calendar" size={18} color="#FFF" />
            <Text style={styles.batchSetupText}>Criar em Lote</Text>
          </TouchableOpacity>

          {schedules.length > 0 && (
            <TouchableOpacity style={[styles.clearBtn, { borderColor: '#FF3B30' }]} onPress={handleClearAll}>
              <Ionicons name="trash-outline" size={16} color="#FF3B30" />
              <Text style={styles.clearBtnText}>Limpar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Visualização */}
        {viewMode === 'week' ? (
          // Visualização Semanal - Formato de Lista
          <View style={styles.weekList}>
            {displayDates.map((date, index) => {
              const daySchedules = getScheduleForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();
              const dayName = getDayName(date);

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.weekListItem,
                    { backgroundColor: theme.card, borderColor: theme.border },
                    isToday && { backgroundColor: theme.dark ? '#1A2744' : '#E8F0FE', borderColor: theme.primary }
                  ]}
                  onPress={() => openAddForDate(date)}
                >
                  <View style={styles.weekListItemHeader}>
                    <View style={styles.weekListItemLeft}>
                      <Text style={[styles.weekListItemDay, { color: isToday ? theme.primary : theme.text }]}>{dayName}</Text>
                      <Text style={[styles.weekListItemDate, { color: isToday ? theme.primary : theme.textSecondary }]}>{formatDate(date)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.primary} />
                  </View>

                  {daySchedules.length === 0 ? (
                    <Text style={[styles.weekListEmpty, { color: theme.textMuted }]}>Nenhum horário configurado</Text>
                  ) : (
                    <View style={styles.weekListSchedules}>
                      {daySchedules.map((schedule: any, idx: number) => (
                        <View key={idx} style={[styles.weekListScheduleItem, { backgroundColor: theme.dark ? '#1A2744' : '#F5F5F5' }]}>
                          <View style={styles.weekListScheduleTime}>
                            <Ionicons name="time-outline" size={14} color={theme.primary} />
                            <Text style={[styles.weekListScheduleTimeText, { color: theme.text }]}>
                              {schedule.start_time} - {schedule.end_time}
                            </Text>
                          </View>
                          <Text style={[styles.weekListScheduleDuration, { color: theme.primary }]}>
                            {schedule.slot_duration_minutes}min
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          // Visualização Mensal - Grade
          <View style={[styles.monthGrid, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* Cabeçalho dos dias da semana */}
            <View style={[styles.weekDaysHeader, { backgroundColor: theme.dark ? '#1A2744' : '#F5F5F5', borderBottomColor: theme.border }]}>
              {DAYS.map(day => (
                <View key={day.key} style={styles.weekDayCell}>
                  <Text style={[styles.weekDayText, { color: theme.textSecondary }]}>{day.short}</Text>
                </View>
              ))}
            </View>

            {/* Dias do mês */}
            {groupedWeeks.map((week, weekIndex) => (
              <View key={weekIndex} style={[styles.weekRow, { borderBottomColor: theme.border }]}>
                {DAYS.map((day, dayIndex) => {
                  const date = week[dayIndex];
                  if (!date) {
                    return <View key={`empty-${dayIndex}`} style={[styles.monthDayCell, { borderColor: theme.border }]} />;
                  }

                  const daySchedules = getScheduleForDate(date);
                  const isToday = date.toDateString() === new Date().toDateString();

                  return (
                    <TouchableOpacity
                      key={dayIndex}
                      style={[
                        styles.monthDayCell,
                        { borderColor: theme.border },
                        isToday && { backgroundColor: theme.dark ? '#1A2744' : '#E8F0FE' }
                      ]}
                      onPress={() => openAddForDate(date)}
                    >
                      <Text style={[styles.monthDayNumber, { color: isToday ? theme.primary : theme.text }]}>{date.getDate()}</Text>

                      {daySchedules.length > 0 && (
                        <View style={styles.monthDayIndicator}>
                          <View style={[styles.monthDayIndicatorDot, { backgroundColor: theme.primary }]} />
                          <Text style={[styles.monthDayIndicatorText, { color: theme.textSecondary }]}>
                            {daySchedules.length} bloco{daySchedules.length > 1 ? 's' : ''}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Batch Creation Modal */}
      <Modal visible={showBatchModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowBatchModal(false)}>
        <View style={[styles.modalContainer, { paddingTop: insets.top + 16, backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowBatchModal(false)}>
              <Text style={[styles.modalCancel, { color: theme.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Criar Agenda em Lote</Text>
            <TouchableOpacity onPress={handleBatchSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={theme.primary} /> : <Text style={[styles.modalSave, { color: theme.primary }]}>Criar</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
            {/* Tipo de lote */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Tipo de Período</Text>
            <View style={styles.batchTypeRow}>
              <TouchableOpacity
                style={[
                  styles.batchTypeBtn,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  batchType === 'week' && { backgroundColor: theme.primary, borderColor: theme.primary }
                ]}
                onPress={() => {
                  setBatchType('week');
                  const weekDates = getWeekDates(startDate);
                  const end = weekDates[6];
                  setEndDate(end);
                  setEndDateText(formatDate(end));
                }}
              >
                <Text style={[styles.batchTypeText, { color: batchType === 'week' ? '#FFF' : theme.textSecondary }]}>Semana</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.batchTypeBtn,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  batchType === 'month' && { backgroundColor: theme.primary, borderColor: theme.primary }
                ]}
                onPress={() => {
                  setBatchType('month');
                  const monthDates = getMonthDates(startDate);
                  const end = monthDates[monthDates.length - 1];
                  setEndDate(end);
                  setEndDateText(formatDate(end));
                }}
              >
                <Text style={[styles.batchTypeText, { color: batchType === 'month' ? '#FFF' : theme.textSecondary }]}>Mês</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.batchTypeBtn,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  batchType === 'custom' && { backgroundColor: theme.primary, borderColor: theme.primary }
                ]}
                onPress={() => setBatchType('custom')}
              >
                <Text style={[styles.batchTypeText, { color: batchType === 'custom' ? '#FFF' : theme.textSecondary }]}>Personalizado</Text>
              </TouchableOpacity>
            </View>

            {/* Seleção de datas */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Período</Text>

            <TouchableOpacity style={[styles.datePickerBtn, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => setShowStartPicker(true)}>
              <Ionicons name="calendar-outline" size={20} color={theme.primary} />
              <Text style={[styles.datePickerText, { color: theme.text }]}>
                Data Inicial: {startDateText}
              </Text>
            </TouchableOpacity>

            {showStartPicker && (
              <View style={[styles.dateInputModal, { backgroundColor: theme.card, borderColor: theme.primary }]}>
                <Text style={[styles.dateInputLabel, { color: theme.text }]}>Digite a data inicial (DD/MM/AAAA):</Text>
                <TextInput
                  style={[styles.dateInput, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
                  value={startDateText}
                  onChangeText={updateStartDateFromText}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.dateInputDone, { backgroundColor: theme.primary }]}
                  onPress={() => setShowStartPicker(false)}
                >
                  <Text style={styles.dateInputDoneText}>OK</Text>
                </TouchableOpacity>
              </View>
            )}

            {batchType === 'custom' && (
              <>
                <TouchableOpacity style={[styles.datePickerBtn, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => setShowEndPicker(true)}>
                  <Ionicons name="calendar-outline" size={20} color={theme.primary} />
                  <Text style={[styles.datePickerText, { color: theme.text }]}>
                    Data Final: {endDateText}
                  </Text>
                </TouchableOpacity>

                {showEndPicker && (
                  <View style={[styles.dateInputModal, { backgroundColor: theme.card, borderColor: theme.primary }]}>
                    <Text style={[styles.dateInputLabel, { color: theme.text }]}>Digite a data final (DD/MM/AAAA):</Text>
                    <TextInput
                      style={[styles.dateInput, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
                      value={endDateText}
                      onChangeText={updateEndDateFromText}
                      placeholder="DD/MM/AAAA"
                      placeholderTextColor={theme.textMuted}
                      keyboardType="numeric"
                      autoFocus
                    />
                    <TouchableOpacity
                      style={[styles.dateInputDone, { backgroundColor: theme.primary }]}
                      onPress={() => setShowEndPicker(false)}
                    >
                      <Text style={styles.dateInputDoneText}>OK</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {/* Seleção de dias da semana */}
            <Text style={[styles.sectionTitle, { marginTop: 20, color: theme.text }]}>Dias da Semana</Text>

            <View style={styles.daysSelectionRow}>
              <TouchableOpacity style={[styles.daysActionBtn, { backgroundColor: theme.dark ? '#1A2744' : '#E8F0FE' }]} onPress={selectWeekDays}>
                <Text style={[styles.daysActionText, { color: theme.primary }]}>Seg-Sex</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.daysActionBtn, { backgroundColor: theme.dark ? '#1A2744' : '#E8F0FE' }]} onPress={selectAllDays}>
                <Text style={[styles.daysActionText, { color: theme.primary }]}>Todos</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.daysGrid}>
              {DAYS.map(day => (
                <TouchableOpacity
                  key={day.key}
                  style={[
                    styles.daySelectBtn,
                    { backgroundColor: theme.card, borderColor: theme.border },
                    selectedDays.includes(day.key) && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                  onPress={() => toggleDay(day.key)}
                >
                  <Text
                    style={[
                      styles.daySelectText,
                      { color: selectedDays.includes(day.key) ? '#FFF' : theme.textSecondary },
                    ]}
                  >
                    {day.short}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Blocos de horário */}
            <Text style={[styles.sectionTitle, { marginTop: 20, color: theme.text }]}>Blocos de Horário</Text>
            <Text style={[styles.sectionHint, { color: theme.textMuted }]}>Os mesmos horários serão aplicados a todos os dias selecionados</Text>

            {blocks.map((block, idx) => (
              <View key={idx} style={[styles.blockCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.blockCardHeader}>
                  <Text style={[styles.blockCardTitle, { color: theme.primary }]}>
                    {idx === 0 ? 'Manhã / Período 1' : idx === 1 ? 'Tarde / Período 2' : `Período ${idx + 1}`}
                  </Text>
                  {blocks.length > 1 && (
                    <TouchableOpacity onPress={() => removeBlock(idx)}>
                      <Ionicons name="close-circle" size={22} color="#FF3B30" />
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={[styles.fieldLabel, { color: theme.text }]}>Início</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.timeRow}>
                    {TIME_OPTIONS.map(t => (
                      <TouchableOpacity
                        key={`s-${idx}-${t}`}
                        style={[
                          styles.timeChip,
                          { backgroundColor: theme.inputBg, borderColor: theme.border },
                          block.start === t && { backgroundColor: theme.primary, borderColor: theme.primary }
                        ]}
                        onPress={() => updateBlock(idx, 'start', t)}
                      >
                        <Text
                          style={[
                            styles.timeChipText,
                            { color: block.start === t ? '#FFF' : theme.textSecondary }
                          ]}
                        >
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <Text style={[styles.fieldLabel, { color: theme.text }]}>Término</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.timeRow}>
                    {TIME_OPTIONS.map(t => (
                      <TouchableOpacity
                        key={`e-${idx}-${t}`}
                        style={[
                          styles.timeChip,
                          { backgroundColor: theme.inputBg, borderColor: theme.border },
                          block.end === t && { backgroundColor: theme.primary, borderColor: theme.primary }
                        ]}
                        onPress={() => updateBlock(idx, 'end', t)}
                      >
                        <Text
                          style={[
                            styles.timeChipText,
                            { color: block.end === t ? '#FFF' : theme.textSecondary }
                          ]}
                        >
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            ))}

            <TouchableOpacity style={[styles.addBlockBtn, { borderColor: theme.primary }]} onPress={addBlock}>
              <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
              <Text style={[styles.addBlockText, { color: theme.primary }]}>Adicionar Bloco</Text>
            </TouchableOpacity>

            {/* Duração do slot */}
            <Text style={[styles.sectionTitle, { marginTop: 24, color: theme.text }]}>Duração do Slot</Text>
            <View style={styles.durationGrid}>
              {DURATION_OPTIONS.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.durationChip,
                    { backgroundColor: theme.card, borderColor: theme.border },
                    slotDuration === d && { backgroundColor: theme.primary, borderColor: theme.primary }
                  ]}
                  onPress={() => setSlotDuration(d)}
                >
                  <Text
                    style={[
                      styles.durationText,
                      { color: slotDuration === d ? '#FFF' : theme.textSecondary }
                    ]}
                  >
                    {d} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Preview */}
            <View style={[styles.previewBox, { backgroundColor: theme.dark ? '#1A2744' : '#E8F0FE' }]}>
              <Text style={[styles.previewTitle, { color: theme.primary }]}>Resumo da Criação</Text>
              <Text style={[styles.previewText, { color: theme.text }]}>
                📅 Período: {startDateText} até {endDateText}
              </Text>
              <Text style={[styles.previewText, { color: theme.text }]}>
                📆 Dias: {selectedDays.map(d => DAYS[d].short).join(', ')}
              </Text>
              <Text style={[styles.previewText, { color: theme.text }]}>
                ⏰ Horários: {blocks.map(b => `${b.start}-${b.end}`).join(', ')}
              </Text>
              <Text style={[styles.previewText, { color: theme.text }]}>
                ⏱️ Duração: {slotDuration}min por slot
              </Text>
              <Text style={styles.previewLunch}>
                📊 Total estimado: {(() => {
                  const dates = batchType === 'week' ? getWeekDates(startDate) :
                    batchType === 'month' ? getMonthDates(startDate) :
                      getDatesBetween(startDate, endDate);
                  const daysToCreate = dates.filter(date => selectedDays.includes(getDayOfWeek(date)));
                  return `${daysToCreate.length} dias × ${blocks.length} blocos = ${daysToCreate.length * blocks.length} registros`;
                })()}
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <View style={[styles.modalContainer, { paddingTop: insets.top + 16, backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={[styles.modalCancel, { color: theme.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {selectedDate ? formatDate(selectedDate) : DAYS[selectedDay]?.label}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={theme.primary} /> : <Text style={[styles.modalSave, { color: theme.primary }]}>Salvar</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Blocos de Horário</Text>
            <Text style={[styles.sectionHint, { color: theme.textMuted }]}>Adicione intervalos para configurar almoço ou pausas</Text>

            {blocks.map((block, idx) => (
              <View key={idx} style={[styles.blockCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.blockCardHeader}>
                  <Text style={[styles.blockCardTitle, { color: theme.primary }]}>
                    {idx === 0 ? 'Manhã / Período 1' : idx === 1 ? 'Tarde / Período 2' : `Período ${idx + 1}`}
                  </Text>
                  {blocks.length > 1 && (
                    <TouchableOpacity onPress={() => removeBlock(idx)}>
                      <Ionicons name="close-circle" size={22} color="#FF3B30" />
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={[styles.fieldLabel, { color: theme.text }]}>Início</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.timeRow}>
                    {TIME_OPTIONS.map(t => (
                      <TouchableOpacity
                        key={`s-${idx}-${t}`}
                        style={[
                          styles.timeChip,
                          { backgroundColor: theme.inputBg, borderColor: theme.border },
                          block.start === t && { backgroundColor: theme.primary, borderColor: theme.primary }
                        ]}
                        onPress={() => updateBlock(idx, 'start', t)}
                      >
                        <Text
                          style={[
                            styles.timeChipText,
                            { color: block.start === t ? '#FFF' : theme.textSecondary }
                          ]}
                        >
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <Text style={[styles.fieldLabel, { color: theme.text }]}>Término</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.timeRow}>
                    {TIME_OPTIONS.map(t => (
                      <TouchableOpacity
                        key={`e-${idx}-${t}`}
                        style={[
                          styles.timeChip,
                          { backgroundColor: theme.inputBg, borderColor: theme.border },
                          block.end === t && { backgroundColor: theme.primary, borderColor: theme.primary }
                        ]}
                        onPress={() => updateBlock(idx, 'end', t)}
                      >
                        <Text
                          style={[
                            styles.timeChipText,
                            { color: block.end === t ? '#FFF' : theme.textSecondary }
                          ]}
                        >
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                {idx < blocks.length - 1 && (
                  <View style={[styles.lunchBanner, { backgroundColor: theme.dark ? '#3D2E00' : '#FFF3E0' }]}>
                    <Ionicons name="restaurant" size={16} color="#FF9500" />
                    <Text style={styles.lunchBannerText}>Intervalo / Almoço</Text>
                  </View>
                )}
              </View>
            ))}

            <TouchableOpacity style={[styles.addBlockBtn, { borderColor: theme.primary }]} onPress={addBlock}>
              <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
              <Text style={[styles.addBlockText, { color: theme.primary }]}>Adicionar Bloco</Text>
            </TouchableOpacity>

            {/* Slot duration */}
            <Text style={[styles.sectionTitle, { marginTop: 24, color: theme.text }]}>Duração do Slot</Text>
            <View style={styles.durationGrid}>
              {DURATION_OPTIONS.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.durationChip,
                    { backgroundColor: theme.card, borderColor: theme.border },
                    slotDuration === d && { backgroundColor: theme.primary, borderColor: theme.primary }
                  ]}
                  onPress={() => setSlotDuration(d)}
                >
                  <Text
                    style={[
                      styles.durationText,
                      { color: slotDuration === d ? '#FFF' : theme.textSecondary }
                    ]}
                  >
                    {d} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Preview */}
            <View style={[styles.previewBox, { backgroundColor: theme.dark ? '#1A2744' : '#E8F0FE' }]}>
              <Text style={[styles.previewTitle, { color: theme.primary }]}>Resumo</Text>
              {blocks.map((b, i) => (
                <Text key={i} style={[styles.previewText, { color: theme.text }]}>
                  {i === 0 ? '🌅' : i === 1 ? '🌇' : '🌙'} {b.start} às {b.end} ({Math.floor(((parseInt(b.end.split(':')[0]) * 60 + parseInt(b.end.split(':')[1])) - (parseInt(b.start.split(':')[0]) * 60 + parseInt(b.start.split(':')[1]))) / slotDuration)} slots de {slotDuration}min)
                </Text>
              ))}
              {blocks.length > 1 && (
                <Text style={styles.previewLunch}>
                  🍽️ Intervalo: {blocks[0].end} às {blocks[1].start}
                </Text>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },

  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  viewModeToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
  },
  viewModeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewModeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navBtn: {
    padding: 8,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickSetupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    flex: 1,
  },
  quickSetupText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  batchSetupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    flex: 1,
  },
  batchSetupText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  clearBtnText: { color: '#FF3B30', fontWeight: '600', fontSize: 13 },

  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Visualização Semanal em Lista
  weekList: {
    gap: 12,
  },
  weekListItem: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  weekListItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weekListItemLeft: {
    flex: 1,
  },
  weekListItemDay: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  weekListItemDate: {
    fontSize: 13,
  },
  weekListEmpty: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  weekListSchedules: {
    gap: 8,
  },
  weekListScheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
  },
  weekListScheduleTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weekListScheduleTimeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  weekListScheduleDuration: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Visualização Mensal em Grade
  monthGrid: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  weekDaysHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  monthDayCell: {
    flex: 1,
    aspectRatio: 1,
    padding: 8,
    borderWidth: 0.5,
    justifyContent: 'space-between',
  },
  monthDayNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  monthDayIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  monthDayIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  monthDayIndicatorText: {
    fontSize: 8,
  },

  // Batch Modal Styles
  batchTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  batchTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  batchTypeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  datePickerText: {
    fontSize: 14,
  },
  dateInputModal: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  dateInputLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  dateInputDone: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  dateInputDoneText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  daysSelectionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  daysActionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  daysActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  daySelectBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 50,
    alignItems: 'center',
  },
  daySelectText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalCancel: { fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalSave: { fontSize: 16, fontWeight: '700' },
  modalScroll: { flex: 1 },
  modalContent: { padding: 16, paddingBottom: 40 },

  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  sectionHint: { fontSize: 12, marginBottom: 12 },

  blockCard: { borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1 },
  blockCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  blockCardTitle: { fontSize: 14, fontWeight: '700' },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  timeRow: { flexDirection: 'row', gap: 6 },
  timeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  timeChipText: { fontSize: 13, fontWeight: '600' },

  lunchBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 8, borderRadius: 8 },
  lunchBannerText: { fontSize: 13, fontWeight: '600', color: '#FF9500' },

  addBlockBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderWidth: 1.5, borderRadius: 10, borderStyle: 'dashed' },
  addBlockText: { fontSize: 14, fontWeight: '600' },

  durationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  durationChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5 },
  durationText: { fontSize: 14, fontWeight: '600' },

  previewBox: { borderRadius: 12, padding: 16, marginTop: 20 },
  previewTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  previewText: { fontSize: 13, marginBottom: 4 },
  previewLunch: { fontSize: 13, color: '#FF9500', fontWeight: '600', marginTop: 4 },
});

