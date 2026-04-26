import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/contexts/ThemeContext';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import api from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Importa o tipo Appointment da store
//import { Appointment } from '../../src/store/useStore';

export default function Appointments() {
  const { appointments, setAppointments } = useStore();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [loading, setLoading] = useState(false);

  // Carrega os agendamentos quando a tela recebe foco (volta de outra tela)
  useFocusEffect(
    useCallback(() => {
      console.log('📱 Tela de agendamentos em foco - recarregando...');
      loadAppointments();
      
      // Opcional: retornar uma função de limpeza se necessário
      return () => {
        // cleanup se necessário
      };
    }, []) // Dependências vazias = executa sempre que ganha foco
  );

  // Também mantém o useEffect inicial para garantir o primeiro carregamento
  useEffect(() => { 
    loadAppointments(); 
  }, []);

  const loadAppointments = async () => {
    try { 
      setLoading(true);
      const response = await api.get('/appointments'); 
      console.log('📅 Appointments loaded:', response.data.length);
      setAppointments(response.data); 
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      if (Platform.OS === 'web') {
        alert('Falha ao carregar agendamentos');
      } else {
        Alert.alert('Erro', 'Falha ao carregar agendamentos');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => { 
    setRefreshing(true); 
    await loadAppointments(); 
    setRefreshing(false); 
  };

  const handleConfirm = async (id: number) => {
    try { 
      await api.post(`/appointments/${id}/confirm`); 
      if (Platform.OS === 'web') {
        alert('✅ Agendamento confirmado!');
      } else {
        Alert.alert('Sucesso', 'Agendamento confirmado!');
      }
      await loadAppointments(); 
    } catch (error) {
      console.error('Erro ao confirmar:', error);
      if (Platform.OS === 'web') {
        alert('❌ Falha ao confirmar');
      } else {
        Alert.alert('Erro', 'Falha ao confirmar agendamento');
      }
    }
  };

  const handleCancel = async (id: number) => {
    const doCancel = async () => {
      try { 
        await api.post(`/appointments/${id}/cancel`); 
        if (Platform.OS === 'web') {
          alert('✅ Cancelado');
        } else {
          Alert.alert('Sucesso', 'Agendamento cancelado');
        }
        await loadAppointments(); 
      } catch (error) {
        console.error('Erro ao cancelar:', error);
        if (Platform.OS === 'web') {
          alert('❌ Falha');
        } else {
          Alert.alert('Erro', 'Falha ao cancelar');
        }
      }
    };

    if (Platform.OS === 'web') { 
      if (window.confirm('Cancelar este agendamento?')) {
        doCancel();
      }
    } else {
      Alert.alert('Cancelar', 'Tem certeza?', [
        { text: 'Não', style: 'cancel' }, 
        { text: 'Sim', style: 'destructive', onPress: doCancel }
      ]);
    }
  };

  const handleComplete = async (id: number) => {
    try {
      // Busca os detalhes do agendamento
      const appointmentDetails = appointments.find((a) => a.id === id);

      if (!appointmentDetails) {
        if (Platform.OS === 'web') {
          alert('❌ Agendamento não encontrado');
        } else {
          Alert.alert('Erro', 'Agendamento não encontrado');
        }
        return;
      }

      console.log('📝 Completando agendamento:', appointmentDetails);

      // Conclui o agendamento
      await api.post(`/appointments/${id}/complete`);

      // Concede pontos de fidelidade (se o cliente tiver email)
      if (appointmentDetails.client_email) {
        try {
          if (appointmentDetails.service_price && appointmentDetails.service_price > 0) {
            // Busca configuração do loyalty
            const configResponse = await api.get('/loyalty/config');
            const pointsPerReal = configResponse.data?.points_per_real || 1;

            const pointsToAward = Math.floor(appointmentDetails.service_price * pointsPerReal);

            if (pointsToAward > 0) {
              console.log(`🎯 Concedendo ${pointsToAward} pontos para ${appointmentDetails.client_email}`);
              
              await api.post('/loyalty/add-points', {
                client_email: appointmentDetails.client_email,
                client_name: appointmentDetails.client_name || 'Cliente',
                client_phone: appointmentDetails.client_phone || '',
                points: pointsToAward,
                description: `Serviço: ${appointmentDetails.service_name || 'Agendamento'}`
              });

              const message = `✅ Agendamento concluído!\n🎉 ${pointsToAward} pontos concedidos!`;
              
              if (Platform.OS === 'web') {
                alert(message);
              } else {
                Alert.alert('Sucesso!', message);
              }
            } else {
              if (Platform.OS === 'web') {
                alert('✅ Agendamento concluído!');
              } else {
                Alert.alert('Sucesso', 'Agendamento concluído!');
              }
            }
          } else {
            if (Platform.OS === 'web') {
              alert('✅ Agendamento concluído!');
            } else {
              Alert.alert('Sucesso', 'Agendamento concluído!');
            }
          }
        } catch (pointsError: any) {
          console.error('❌ Erro nos pontos:', pointsError.response?.data || pointsError.message);
          
          const errorMsg = pointsError.response?.data?.detail || 'erro ao conceder pontos';
          
          if (Platform.OS === 'web') {
            alert(`⚠️ Concluído, mas ${errorMsg}`);
          } else {
            Alert.alert('Atenção', `Agendamento concluído, mas ${errorMsg}`);
          }
        }
      } else {
        if (Platform.OS === 'web') {
          alert('✅ Agendamento concluído!');
        } else {
          Alert.alert('Sucesso', 'Agendamento concluído!');
        }
      }

      await loadAppointments();
      
    } catch (error: any) {
      console.error('❌ Erro ao completar:', error);
      const errorMsg = error.response?.data?.detail || error.message;
      
      if (Platform.OS === 'web') {
        alert(`❌ ${errorMsg}`);
      } else {
        Alert.alert('Erro', errorMsg);
      }
    }
  };

  const getFilteredAppointments = () => {
    if (filter === 'all') return appointments;
    return appointments.filter((a) => a.status === filter);
  };

  const getStatusColor = (status: string) => {
    switch (status) { 
      case 'confirmed': return '#34C759'; 
      case 'pending': return '#FF9500'; 
      case 'cancelled': return '#FF3B30'; 
      case 'completed': return '#007AFF'; 
      default: return '#999'; 
    }
  };

  const getStatusText = (status: string) => {
    switch (status) { 
      case 'confirmed': return 'Confirmado'; 
      case 'pending': return 'Pendente'; 
      case 'cancelled': return 'Cancelado'; 
      case 'completed': return 'Concluído'; 
      default: return status; 
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.filterBar, { backgroundColor: theme.card, borderBottomColor: theme.divider }]}>
        {(['all', 'pending', 'confirmed', 'completed'] as const).map((f) => (
          <TouchableOpacity 
            key={f} 
            style={[
              styles.filterButton, 
              { 
                backgroundColor: filter === f ? theme.primary : theme.inputBg,
                opacity: loading ? 0.5 : 1
              }
            ]} 
            onPress={() => setFilter(f)}
            disabled={loading}
          >
            <Text style={[styles.filterText, { color: filter === f ? '#FFF' : theme.textSecondary }]}>
              {f === 'all' ? 'Todos' : 
               f === 'pending' ? 'Pendentes' : 
               f === 'confirmed' ? 'Confirmados' : 'Concluídos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={getFilteredAppointments()}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={theme.primary} 
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={64} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              {loading ? 'Carregando...' : 'Nenhum agendamento'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
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

            {/* Informações do Cliente */}
            {(item.client_name || item.client_phone || item.client_email) && (
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
                {item.client_email && (
                  <View style={styles.clientRow}>
                    <Ionicons name="mail-outline" size={16} color={theme.textSecondary} />
                    <Text style={[styles.clientText, { color: theme.text }]}>{item.client_email}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Informações do Serviço */}
            {(item.service_name || item.service_price) && (
              <View style={[styles.serviceInfo, { backgroundColor: theme.dark ? '#1A2744' : '#F0F7FF' }]}>
                <Ionicons name="cut-outline" size={16} color={theme.primary} />
                <Text style={[styles.serviceName, { color: theme.primary }]}>
                  {item.service_name || 'Serviço'}
                </Text>
                {item.service_price != null && (
                  <Text style={styles.servicePrice}>
                    R$ {item.service_price.toFixed(2).replace('.', ',')}
                  </Text>
                )}
              </View>
            )}

            {item.notes && (
              <Text style={[styles.notes, { color: theme.textSecondary }]}>
                Observações: {item.notes}
              </Text>
            )}

            {item.status === 'pending' && (
              <View style={styles.actions}>
                <Button 
                  title="Confirmar" 
                  variant="success" 
                  onPress={() => handleConfirm(item.id)} 
                  style={styles.actionButton}
                  disabled={loading}
                />
                <Button 
                  title="Cancelar" 
                  variant="danger" 
                  onPress={() => handleCancel(item.id)} 
                  style={styles.actionButton}
                  disabled={loading}
                />
              </View>
            )}
            
            {item.status === 'confirmed' && (
              <View style={styles.actions}>
                <Button 
                  title="Concluir" 
                  variant="primary" 
                  onPress={() => handleComplete(item.id)} 
                  style={styles.actionButton}
                  disabled={loading}
                />
                <Button 
                  title="Cancelar" 
                  variant="danger" 
                  onPress={() => handleCancel(item.id)} 
                  style={styles.actionButton}
                  disabled={loading}
                />
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