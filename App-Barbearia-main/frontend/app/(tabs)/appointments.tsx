import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, Platform,
} from 'react-native';
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/contexts/ThemeContext';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import api from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Appointments() {
  const { appointments, setAppointments } = useStore();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => { loadAppointments(); }, []);

  const loadAppointments = async () => {
    try { const r = await api.get('/appointments'); setAppointments(r.data); }
    catch { Alert.alert('Erro', 'Falha ao carregar agendamentos'); }
  };

  const onRefresh = async () => { setRefreshing(true); await loadAppointments(); setRefreshing(false); };

  const handleConfirm = async (id: number) => {
    try { await api.post(`/appointments/${id}/confirm`); Platform.OS === 'web' ? alert('Agendamento confirmado!') : Alert.alert('Sucesso', 'Agendamento confirmado!'); await loadAppointments(); }
    catch { Platform.OS === 'web' ? alert('Falha ao confirmar') : Alert.alert('Erro', 'Falha ao confirmar agendamento'); }
  };

  const handleCancel = async (id: number) => {
    const doCancel = async () => {
      try { await api.post(`/appointments/${id}/cancel`); Platform.OS === 'web' ? alert('Cancelado') : Alert.alert('Sucesso', 'Agendamento cancelado'); await loadAppointments(); }
      catch { Platform.OS === 'web' ? alert('Falha') : Alert.alert('Erro', 'Falha ao cancelar'); }
    };
    if (Platform.OS === 'web') { if (window.confirm('Cancelar este agendamento?')) doCancel(); }
    else Alert.alert('Cancelar', 'Tem certeza?', [{ text: 'Nao', style: 'cancel' }, { text: 'Sim', style: 'destructive', onPress: doCancel }]);
  };

  const handleComplete = async (id: number) => {
    try { await api.post(`/appointments/${id}/complete`); Platform.OS === 'web' ? alert('Concluido!') : Alert.alert('Sucesso', 'Agendamento concluido!'); await loadAppointments(); }
    catch { Platform.OS === 'web' ? alert('Falha') : Alert.alert('Erro', 'Falha ao completar'); }
  };

  const getFilteredAppointments = () => filter === 'all' ? appointments : appointments.filter((a: any) => a.status === filter);

  const getStatusColor = (s: string) => {
    switch (s) { case 'confirmed': return '#34C759'; case 'pending': return '#FF9500'; case 'cancelled': return '#FF3B30'; case 'completed': return '#007AFF'; default: return '#999'; }
  };
  const getStatusText = (s: string) => {
    switch (s) { case 'confirmed': return 'Confirmado'; case 'pending': return 'Pendente'; case 'cancelled': return 'Cancelado'; case 'completed': return 'Concluido'; default: return s; }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.filterBar, { backgroundColor: theme.card, borderBottomColor: theme.divider }]}>
        {['all', 'pending', 'confirmed', 'completed'].map((f) => (
          <TouchableOpacity key={f} style={[styles.filterButton, { backgroundColor: filter === f ? theme.primary : theme.inputBg }]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, { color: filter === f ? '#FFF' : theme.textSecondary }]}>
              {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendentes' : f === 'confirmed' ? 'Confirmados' : 'Concluidos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={getFilteredAppointments()}
        keyExtractor={(item: any) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={64} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>Nenhum agendamento</Text>
          </View>
        }
        renderItem={({ item }: any) => (
          <Card>
            <View style={styles.appointmentHeader}>
              <View>
                <Text style={[styles.appointmentDate, { color: theme.text }]}>
                  {format(new Date(item.scheduled_time), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </Text>
                <Text style={[styles.appointmentTime, { color: theme.primary }]}>
                  {format(new Date(item.scheduled_time), 'HH:mm')}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
              </View>
            </View>

            {(item.client_name || item.client_phone) && (
              <View style={styles.clientInfo}>
                {item.client_name && (
                  <View style={styles.clientRow}>
                    <Ionicons name="person-outline" size={16} color={theme.textSecondary} />
                    <Text style={[styles.clientText, { color: theme.text }]}>{item.client_name}</Text>
                  </View>
                )}
                {item.client_phone && (
                  <View style={styles.clientRow}>
                    <Ionicons name="call-outline" size={16} color={theme.textSecondary} />
                    <Text style={[styles.clientText, { color: theme.text }]}>{item.client_phone}</Text>
                  </View>
                )}
              </View>
            )}

            {(item.service_name || item.service_price) && (
              <View style={[styles.serviceInfo, { backgroundColor: theme.dark ? '#1A2744' : '#F0F7FF' }]}>
                <Ionicons name="cut-outline" size={16} color={theme.primary} />
                <Text style={[styles.serviceName, { color: theme.primary }]}>{item.service_name || 'Servico'}</Text>
                {item.service_price != null && (
                  <Text style={styles.servicePrice}>R$ {Number(item.service_price).toFixed(2).replace('.', ',')}</Text>
                )}
              </View>
            )}

            {item.notes && <Text style={[styles.notes, { color: theme.textSecondary }]}>Observacoes: {item.notes}</Text>}

            {item.status === 'pending' && (
              <View style={styles.actions}>
                <Button title="Confirmar" variant="success" onPress={() => handleConfirm(item.id)} style={styles.actionButton} />
                <Button title="Cancelar" variant="danger" onPress={() => handleCancel(item.id)} style={styles.actionButton} />
              </View>
            )}
            {item.status === 'confirmed' && (
              <View style={styles.actions}>
                <Button title="Concluir" variant="primary" onPress={() => handleComplete(item.id)} />
              </View>
            )}
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterBar: { flexDirection: 'row', padding: 12, borderBottomWidth: 1 },
  filterButton: { flex: 1, paddingVertical: 8, paddingHorizontal: 8, marginHorizontal: 4, borderRadius: 8, alignItems: 'center' },
  filterText: { fontSize: 11, fontWeight: '600' },
  list: { padding: 16 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 16, fontSize: 16 },
  appointmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  appointmentDate: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  appointmentTime: { fontSize: 20, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  notes: { fontSize: 14, marginBottom: 12, fontStyle: 'italic' },
  clientInfo: { marginBottom: 12, gap: 6 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clientText: { fontSize: 14, fontWeight: '500' },
  serviceInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, padding: 10, borderRadius: 8 },
  serviceName: { fontSize: 14, fontWeight: '600', flex: 1 },
  servicePrice: { fontSize: 15, fontWeight: '800', color: '#34C759' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionButton: { flex: 1 },
});
