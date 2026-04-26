import React, { useState, useCallback } from 'react';
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
});
